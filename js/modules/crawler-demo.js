/**
 * Crawler Demo Module
 * Interactive "budgeted crawl race" for the Intelligent Web Crawler card.
 *
 * Illustrates the project's core idea: under a fixed page budget, a greedy
 * embedding-relevance frontier (this project) collects far more on-topic pages
 * than a breadth-first crawler. Two crawlers race over the SAME page graph:
 *   - Breadth-first: FIFO frontier (ignores relevance)
 *   - Your crawler:  priority frontier, pops the highest-relevance link
 *
 * It's a faithful illustration of the mechanism, not a live Sentence-BERT run —
 * relevance scores are simulated. The metrics strip underneath shows the real
 * measured results from the 25-run evaluation.
 *
 * Lazy-built when the projects section approaches; no external dependencies.
 */

import { prefersReducedMotion } from '../utils.js';

const TOPICS = [
  { id: 'marine', label: 'Marine conservation' },
  { id: 'ml',     label: 'Machine learning' },
  { id: 'climate', label: 'Climate data' },
];

const N_NODES = 15;
const RELEVANT_THRESHOLD = 0.55;
const STEP_MS = 480;
const PANEL = { W: 260, H: 170, pad: 16 }; // graph SVG viewBox + inner margin

// Real measured results from the dissertation's 25-run evaluation.
const REAL_METRICS = { precision: 0.954, recall: 0.856, f1: 0.901 };

// deterministic RNG so the graph is identical every load
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class CrawlerDemo {
  constructor() {
    this.root = null;
    this.nodes = [];
    this.edges = [];
    this.seeds = [];
    this.topic = TOPICS[0].id;
    this.budget = 6;
    this.panels = {};       // strategy -> { svg, nodeEls, precisionEl, barEl }
    this.timer = null;
    this.built = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.root = document.getElementById('crawler-demo');
    if (!this.root) return;

    const trigger = document.getElementById('projects') || this.root;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        this._build();
      }
    }, { rootMargin: '600px' });
    io.observe(trigger);

    this.initialized = true;
  }

  // ── Graph generation (deterministic) ────────────────────────────────────────
  _generateGraph() {
    const rnd = mulberry32(20408494); // student id — stable seed
    const nodes = [];
    for (let i = 0; i < N_NODES; i++) {
      let x, y, ok, tries = 0;
      do {
        x = 0.08 + rnd() * 0.84;
        y = 0.12 + rnd() * 0.76;
        ok = nodes.every(n => (n.x - x) ** 2 + (n.y - y) ** 2 > 0.02);
      } while (!ok && ++tries < 40);
      const rel = {};
      nodes.push({ i, x, y, rel });
    }

    // per-topic relevance: a cluster of related pages + noise
    TOPICS.forEach(t => {
      const cx = 0.35 + mulberry32(t.id.length * 97 + 3)() * 0.4;
      const cy = 0.3 + mulberry32(t.id.length * 131 + 7)() * 0.4;
      const rr = mulberry32(t.id.charCodeAt(0) * 17);
      nodes.forEach(n => {
        const d = Math.hypot(n.x - cx, n.y - cy);
        const base = Math.max(0, 1 - d * 1.5);
        n.rel[t.id] = Math.min(0.98, Math.max(0.05, base * 0.98 + rr() * 0.14));
      });
    });

    // edges: connect each node to its 2 nearest neighbours (undirected, deduped)
    const edgeSet = new Set();
    const edges = [];
    nodes.forEach(a => {
      const near = nodes
        .filter(b => b !== a)
        .sort((p, q) => (p.x - a.x) ** 2 + (p.y - a.y) ** 2 - ((q.x - a.x) ** 2 + (q.y - a.y) ** 2))
        .slice(0, 2);
      near.forEach(b => {
        const key = a.i < b.i ? `${a.i}-${b.i}` : `${b.i}-${a.i}`;
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([a.i, b.i]); }
      });
    });

    this.nodes = nodes;
    this.edges = edges;
    this.adj = nodes.map(() => []);
    edges.forEach(([a, b]) => { this.adj[a].push(b); this.adj[b].push(a); });

    // seed = a well-connected node in a generally off-topic region, so the
    // breadth-first crawler wastes early fetches while the greedy one has to
    // (and does) climb the relevance gradient toward the on-topic cluster.
    const degrees = this.adj.map(a => a.length).sort((a, b) => a - b);
    const medianDeg = degrees[Math.floor(N_NODES / 2)];
    const wellConnected = nodes.filter(n => this.adj[n.i].length >= medianDeg);
    const avgRel = n => TOPICS.reduce((s, t) => s + n.rel[t.id], 0);
    this.seeds = [wellConnected.reduce((best, n) => (avgRel(n) < avgRel(best) ? n : best), wellConnected[0]).i];
  }

  // ── Crawl strategies → ordered fetch list ───────────────────────────────────
  // Each strategy returns an ordered list of { node, parent } so the animation
  // can draw the crawler travelling along the edge from parent to node.
  _bfs(budget) {
    const seen = new Set(this.seeds);
    const parent = {}; this.seeds.forEach(s => { parent[s] = null; });
    const queue = [...this.seeds];
    const order = [];
    while (queue.length && order.length < budget) {
      const u = queue.shift();
      order.push({ node: u, parent: parent[u] });
      for (const v of this.adj[u]) if (!seen.has(v)) { seen.add(v); parent[v] = u; queue.push(v); }
    }
    return order;
  }

  _crawler(budget, topic) {
    const seen = new Set(this.seeds);
    const parent = {}; this.seeds.forEach(s => { parent[s] = null; });
    const frontier = new Set(this.seeds);
    const order = [];
    while (frontier.size && order.length < budget) {
      // pop the highest-relevance frontier node (priority = simulated pi)
      let best = null, bestScore = -1;
      frontier.forEach(u => {
        const s = this.nodes[u].rel[topic];
        if (s > bestScore) { bestScore = s; best = u; }
      });
      frontier.delete(best);
      order.push({ node: best, parent: parent[best] });
      for (const v of this.adj[best]) if (!seen.has(v)) { seen.add(v); parent[v] = best; frontier.add(v); }
    }
    return order;
  }

  _precision(order, topic) {
    if (order.length === 0) return 0;
    const rel = order.filter(o => this.nodes[o.node].rel[topic] >= RELEVANT_THRESHOLD).length;
    return rel / order.length;
  }

  // ── DOM build ────────────────────────────────────────────────────────────────
  _build() {
    if (this.built) return;
    this.built = true;
    this._generateGraph();

    this.root.innerHTML = `
      <div class="cd-controls">
        <div class="cd-topics" role="group" aria-label="Topic">
          ${TOPICS.map((t, i) =>
            `<button type="button" class="cd-topic${i === 0 ? ' active' : ''}" data-topic="${t.id}">${t.label}</button>`).join('')}
        </div>
        <label class="cd-budget">Budget
          <input type="range" min="3" max="10" value="${this.budget}" class="cd-budget-input">
          <span class="cd-budget-val">${this.budget}</span> pages
        </label>
        <button type="button" class="cd-run">Run crawl ▶</button>
      </div>
      <div class="cd-arena">
        ${this._panelHTML('bfs', 'Breadth-first')}
        ${this._panelHTML('ours', 'Our crawler')}
      </div>
      <div class="cd-metrics">
        <span class="cd-metrics-label">Real results · 25 runs</span>
        <span class="cd-metric"><b>${REAL_METRICS.precision.toFixed(3)}</b> precision</span>
        <span class="cd-metric"><b>${REAL_METRICS.recall.toFixed(3)}</b> recall</span>
        <span class="cd-metric"><b>${REAL_METRICS.f1.toFixed(3)}</b> F1</span>
        <span class="cd-metric cd-metric-note">beats breadth-first &amp; TF-IDF baselines</span>
      </div>
      <p class="demo-note">Illustrative simulation of the crawl strategy — not a live model run.</p>`;

    // shared node coordinates (both panels use the same layout)
    this.coords = this.nodes.map(n => ({
      x: PANEL.pad + n.x * (PANEL.W - 2 * PANEL.pad),
      y: PANEL.pad + n.y * (PANEL.H - 2 * PANEL.pad),
    }));

    this.panels = {
      bfs: this._wirePanel('bfs'),
      ours: this._wirePanel('ours'),
    };

    // controls
    this.root.querySelectorAll('.cd-topic').forEach(btn => {
      btn.addEventListener('click', () => {
        this.root.querySelectorAll('.cd-topic').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.topic = btn.dataset.topic;
        this._run();
      });
    });
    const slider = this.root.querySelector('.cd-budget-input');
    const val = this.root.querySelector('.cd-budget-val');
    slider.addEventListener('input', () => { this.budget = +slider.value; val.textContent = slider.value; });
    slider.addEventListener('change', () => this._run());
    this.root.querySelector('.cd-run').addEventListener('click', () => this._run());

    // auto-run once when revealed
    this._run();
    console.log('✅ Crawler Demo initialized');
  }

  _panelHTML(id, label) {
    return `
      <div class="cd-panel" data-panel="${id}">
        <div class="cd-panel-head">
          <span class="cd-panel-name">${label}</span>
          <span class="cd-panel-prec" data-prec="${id}">—</span>
        </div>
        <svg class="cd-graph" data-graph="${id}" viewBox="0 0 260 170" preserveAspectRatio="xMidYMid meet"></svg>
        <div class="cd-bar"><span class="cd-bar-fill" data-bar="${id}"></span></div>
      </div>`;
  }

  _wirePanel(id) {
    const svg = this.root.querySelector(`[data-graph="${id}"]`);
    const NS = 'http://www.w3.org/2000/svg';
    const C = this.coords;

    // static edges
    this.edges.forEach(([a, b]) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', C[a].x); l.setAttribute('y1', C[a].y);
      l.setAttribute('x2', C[b].x); l.setAttribute('y2', C[b].y);
      l.setAttribute('class', 'cd-edge');
      svg.appendChild(l);
    });

    // layer for the animated "crawl" travel lines (sits under the nodes)
    const travelLayer = document.createElementNS(NS, 'g');
    travelLayer.setAttribute('class', 'cd-travel-layer');
    svg.appendChild(travelLayer);

    // nodes
    const nodeEls = this.nodes.map(n => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', C[n.i].x); c.setAttribute('cy', C[n.i].y);
      c.setAttribute('r', this.seeds.includes(n.i) ? 6.5 : 5);
      c.setAttribute('class', 'cd-node' + (this.seeds.includes(n.i) ? ' cd-seed' : ''));
      svg.appendChild(c);
      return c;
    });

    return {
      svg, nodeEls, travelLayer,
      precisionEl: this.root.querySelector(`[data-prec="${id}"]`),
      barEl: this.root.querySelector(`[data-bar="${id}"]`),
    };
  }

  // ── Run / animate ───────────────────────────────────────────────────────────
  _reset() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    Object.values(this.panels).forEach(p => {
      p.nodeEls.forEach((el, i) => {
        el.classList.remove('fetched', 'relevant', 'irrelevant');
        if (this.seeds.includes(i)) el.classList.add('cd-seed');
      });
      p.travelLayer.innerHTML = '';   // clear previous crawl trails
      p.precisionEl.textContent = '—';
      p.barEl.style.width = '0%';
    });
  }

  _run() {
    this._reset();
    const topic = this.topic;
    const orders = {
      bfs: this._bfs(this.budget),
      ours: this._crawler(this.budget, topic),
    };
    const maxLen = Math.max(orders.bfs.length, orders.ours.length);

    if (prefersReducedMotion()) {
      // no animation: reveal final state at once
      Object.keys(orders).forEach(k => orders[k].forEach(it => this._mark(k, it, topic, false)));
      Object.keys(orders).forEach(k => this._updateStats(k, orders[k], topic));
      return;
    }

    let step = 0;
    const tick = () => {
      ['bfs', 'ours'].forEach(k => {
        if (step < orders[k].length) this._mark(k, orders[k][step], topic, true);
        this._updateStats(k, orders[k].slice(0, step + 1), topic);
      });
      step++;
      if (step < maxLen) this.timer = setTimeout(tick, STEP_MS);
      else this.timer = null;
    };
    tick();
  }

  _mark(strategy, item, topic, animate) {
    const el = this.panels[strategy].nodeEls[item.node];
    const relevant = this.nodes[item.node].rel[topic] >= RELEVANT_THRESHOLD;
    // draw the crawler travelling along the edge from its parent to this page
    if (animate && item.parent != null) this._travel(strategy, item.parent, item.node, relevant);
    el.classList.add('fetched', relevant ? 'relevant' : 'irrelevant');
  }

  /** Animate a colored line drawing from parent → node (the "crawl" step). */
  _travel(strategy, fromIdx, toIdx, relevant) {
    const p = this.panels[strategy];
    const a = this.coords[fromIdx], b = this.coords[toIdx];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('class', 'cd-travel ' + (relevant ? 'rel' : 'irr'));
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    p.travelLayer.appendChild(line);
    // next frame: release the dashoffset so the line "draws" from a to b
    requestAnimationFrame(() => { line.style.strokeDashoffset = '0'; });
  }

  _updateStats(strategy, orderSoFar, topic) {
    const p = this.panels[strategy];
    const prec = this._precision(orderSoFar, topic);
    p.precisionEl.textContent = orderSoFar.length ? Math.round(prec * 100) + '% relevant' : '—';
    p.barEl.style.width = (prec * 100).toFixed(0) + '%';
    p.barEl.classList.toggle('cd-bar-strong', strategy === 'ours');
  }
}

const crawlerDemo = new CrawlerDemo();
export default crawlerDemo;
export { CrawlerDemo };
