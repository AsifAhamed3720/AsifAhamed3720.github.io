
import { isMobile } from '../utils.js';

// ─── Tuning ───────────────────────────────────────────────────────────────────
const CONFIG = {
  count        : 500,   // number of stars
  spread       : 350,   // half-extent of the 3D cube (px equivalent)
  focal        : 480,   // perspective focal length — higher = flatter/less warp

  // Scroll rotation (Y axis — pans the field left/right as you scroll down)
  scrollRotSpeed : 0.00055,  // radians added per pixel of scroll
  scrollEase     : 0.055,    // how smoothly rotation catches up to scroll

  // Slow automatic Y rotation so the field never looks static
  autoRotY       : 0.00014,

  // Cursor lean — mouse position nudges Y and X rotation slightly
  cursorLeanY    : 0.00018,  // per pixel from centre, Y axis
  cursorLeanX    : 0.00010,  // per pixel from centre, X axis

  // Cursor repel (works in 2D screen-space — cheaper & feels right)
  repelDist      : 110,
  repelForce     : 7,

  // Visuals
  minSize  : 0.8,   // radius of a far star (px)
  maxSize  : 3.2,   // radius of a near star (px)
  minAlpha : 0.24,
  maxAlpha : 1,
  lineDistSq : 140 * 140,   // squared 2D screen distance for connection lines
  lineBuckets : 6,          // alpha buckets for batched connection-line strokes
  maxLineAlpha : 0.34,      // ceiling of the per-line alpha formula (for bucketing)

  colorDark  : '167, 139, 250',
  colorLight : '124, 58, 237',

  // ── Helix column (projects section staircase anchor) ──
  // Driven by js/modules/helix-projects.js via helixMorphTarget/helixSpinPhase.
  helix : {
    strandCount : 180,     // stars forming the two spiral rails
    coreCount   : 90,      // stars filling the inside of the column
    dustCount   : 90,      // stars orbiting the column for atmosphere
    radius      : 125,     // rail radius in star-space
    height      : 1500,    // column vertical extent in star-space
    turns       : 3.5,     // full turns over that height
    stepEvery   : 5,       // a tread spoke every N rail-star pairs
    morphEase   : 0.05,    // how slowly stars gather / release
    colorsDark  : { strandA: '167, 139, 250', strandB: '96, 165, 250', core: '224, 214, 255' },
    colorsLight : { strandA: '124, 58, 237',  strandB: '37, 99, 235',  core: '109, 40, 217' },
  },
};
// ─────────────────────────────────────────────────────────────────────────────

class Starfield {
  constructor() {
    this.canvas  = null;
    this.ctx     = null;
    this.W = 0;  this.H = 0;
    this.stars   = [];

    // Current rotation state
    this.rotX       = 0;   // cursor lean
    this.rotY       = 0;   // driven by scroll
    this.targetRotY = 0;
    this.autoY      = 0;   // accumulates every frame

    // Input
    this.scrollY = 0;
    this.mouseX  = -99999;
    this.mouseY  = -99999;
    this.isLight = false;

    // Helix column state — targets are written by helix-projects.js,
    // the morph itself is eased here so stars gather/release slowly.
    this.helixMorphTarget = 0;   // 0 = free field, 1 = full column
    this.helixMorph       = 0;
    this.helixSpinPhase   = 0;   // column rotation synced to card progress
    this.idleSpin         = 0;   // slow constant turn so it never sits still
    this.strandLists      = [[], []];  // rail stars in order, per strand
    this._lineBuckets     = [];  // reused per-frame segment buffers (batched lines)

    this.rafId = null;
    this.initialized = false;
  }

  // ── Public ────────────────────────────────────────────────────────────────

  init() {
    if (this.initialized) return;
    if (isMobile()) { console.log('Starfield3D: off on mobile'); return; }

    this._buildCanvas();
    this._spawnStars();
    this._listen();
    this._loop();

    this.initialized = true;
    console.log('✅ Starfield 3D initialized');
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.canvas?.parentNode?.removeChild(this.canvas);
    this.initialized = false;
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  _buildCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'starfield-canvas';
    document.body.insertBefore(this.canvas, document.body.firstChild);
    this.ctx = this.canvas.getContext('2d');
    this._resize();
  }

  _resize() {
    // Cap DPR at 2 — beyond that the extra fill cost isn't worth it for a
    // subtle background field, and it protects 3× displays on weak GPUs.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
  }

  /**
   * Each star is placed randomly in a 3D cube centred at the origin.
   * ox/oy/oz are its permanent home coordinates. Every frame the
   * rotation matrices are applied to those originals so there is
   * no drift or floating-point accumulation.
   */
  _spawnStars() {
    const { count, spread, helix } = CONFIG;
    this.stars = [];
    this.strandLists = [[], []];

    for (let i = 0; i < count; i++) {
      const s = {
        ox: (Math.random() - 0.5) * spread * 2,
        oy: (Math.random() - 0.5) * spread * 2,
        oz: (Math.random() - 0.5) * spread * 2,
        // screen-space output — filled each frame by _project()
        sx: 0, sy: 0,
        // perspective scale factor (larger = closer to viewer)
        sc: 0,
        // small 2D velocity for cursor repel springback
        vx: 0, vy: 0,
        // tiny per-star twinkle phase
        twinkle     : Math.random() * Math.PI * 2,
        twinkleSpeed: 0.008 + Math.random() * 0.012,

        // helix column role (see CONFIG.helix)
        role     : 'bg',
        e        : 0,                 // this star's current morph amount
        stagger  : Math.random(),     // stars gather progressively
        roleColor: null,              // palette key, resolved per theme
        sizeMul  : 1,
        alphaMul : 1,
        isStep   : false,
      };

      if (i < helix.strandCount) {
        // spiral rail star — two intertwined strands
        const strand = i % 2;
        const pair = Math.floor(i / 2);
        const t = pair / (helix.strandCount / 2 - 1);
        s.role  = 'strand';
        s.hAng  = t * helix.turns * Math.PI * 2
                + strand * Math.PI
                + (Math.random() - 0.5) * 0.08;
        s.hY    = (t - 0.5) * helix.height;
        s.hR    = helix.radius + (Math.random() - 0.5) * 14;
        s.roleColor = strand === 0 ? 'strandA' : 'strandB';
        s.sizeMul = 1.15;
        s.isStep = (pair % helix.stepEvery === 2);  // tread spoke anchor
        this.strandLists[strand].push(s);
      } else if (i < helix.strandCount + helix.coreCount) {
        // interior star — fills the column volume, denser near the axis
        const ct = (i - helix.strandCount) / (helix.coreCount - 1);
        s.role  = 'core';
        s.hAng  = Math.random() * Math.PI * 2;
        s.hY    = (ct - 0.5) * helix.height * 1.04;
        s.hR    = Math.pow(Math.random(), 1.6) * helix.radius * 0.85;
        // inner stars turn slower than the rails, like a solid rotating body
        s.spinF = 0.25 + 0.6 * (s.hR / (helix.radius * 0.85));
        s.roleColor = Math.random() < 0.4 ? 'core' : 'strandA';
        s.sizeMul = 0.75;
      } else if (i < helix.strandCount + helix.coreCount + helix.dustCount) {
        // orbiting dust — atmosphere around the column
        s.role  = 'dust';
        s.hAng  = Math.random() * Math.PI * 2;
        s.hY    = (Math.random() - 0.5) * helix.height * 1.15;
        s.hR    = 160 + Math.sqrt(Math.random()) * 150;
        s.sizeMul = 0.8;
      }

      this.stars.push(s);
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _listen() {
    document.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
      this.mouseX = -99999;
      this.mouseY = -99999;
    });
    window.addEventListener('scroll', () => {
      this.scrollY    = window.scrollY;
      this.targetRotY = this.scrollY * CONFIG.scrollRotSpeed;
    }, { passive: true });
    window.addEventListener('resize', () => this._resize());

    // Theme watcher
    const mo = new MutationObserver(() => {
      this.isLight = document.documentElement.getAttribute('data-theme') === 'light';
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.isLight = document.documentElement.getAttribute('data-theme') === 'light';
  }

  // ── Main loop ─────────────────────────────────────────────────────────────

  _loop() {
    // Don't burn CPU/GPU animating a field nobody can see (background tab).
    if (!document.hidden) {
      this._update();
      this._draw();
    }
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  _update() {
    // ── Rotation angles ─────────────────────────────────────────────────────

    // Y: ease toward scroll-driven target
    this.rotY += (this.targetRotY - this.rotY) * CONFIG.scrollEase;

    // Auto-spin + cursor lean
    this.autoY += CONFIG.autoRotY;
    const leanY = ((this.mouseX - this.W / 2) / (this.W / 2)) * CONFIG.cursorLeanY * 80;
    const leanX = ((this.mouseY - this.H / 2) / (this.H / 2)) * CONFIG.cursorLeanX * 60;
    const finalRotY = this.rotY + this.autoY + leanY;
    const finalRotX = this.rotX + leanX;

    // Precompute trig — same for every star this frame
    const cosX = Math.cos(finalRotX), sinX = Math.sin(finalRotX);
    const cosY = Math.cos(finalRotY),  sinY = Math.sin(finalRotY);
    const { focal } = CONFIG;

    // ── Helix column morph ───────────────────────────────────────────────────
    this.helixMorph += (this.helixMorphTarget - this.helixMorph) * CONFIG.helix.morphEase;
    if (Math.abs(this.helixMorphTarget - this.helixMorph) < 0.001) {
      this.helixMorph = this.helixMorphTarget;
    }
    this.idleSpin += 0.0012;
    const spin = this.helixSpinPhase + this.idleSpin;
    const morph = this.helixMorph;
    const smooth = t => t * t * (3 - 2 * t);

    // ── Project every star into screen space ─────────────────────────────────
    this.stars.forEach(s => {
      // Rotate around X axis (cursor lean)
      const y1 =  s.oy * cosX - s.oz * sinX;
      const z1 =  s.oy * sinX + s.oz * cosX;

      // Rotate around Y axis (auto-spin + cursor lean)
      const x2 =  s.ox * cosY + z1 * sinY;
      const z2 = -s.ox * sinY + z1 * cosY;

      // Blend the star's home toward its slot in the helix column.
      // e is staggered per star so the structure assembles progressively.
      const e = morph > 0 || s.e > 0
        ? smooth(Math.min(1, Math.max(0, (morph - s.stagger * 0.3) / 0.7)))
        : 0;
      s.e = e;

      let x3 = x2, y3 = y1, z3 = z2;
      if (e > 0) {
        let a;
        if (s.role === 'strand') {
          a = s.hAng + spin;
          x3 = x2 + (Math.sin(a) * s.hR - x2) * e;
          y3 = y1 + (s.hY - y1) * e;
          z3 = z2 + (Math.cos(a) * s.hR - z2) * e;
          s.alphaMul = 1 + e * 0.3;
        } else if (s.role === 'core') {
          a = s.hAng + spin * s.spinF;   // inner stars turn slower
          x3 = x2 + (Math.sin(a) * s.hR - x2) * e;
          y3 = y1 + (s.hY - y1) * e;
          z3 = z2 + (Math.cos(a) * s.hR - z2) * e;
          s.alphaMul = 1 + e * 0.15;
        } else if (s.role === 'dust') {
          a = s.hAng + spin * 0.45;      // slower orbit = parallax
          x3 = x2 + (Math.sin(a) * s.hR - x2) * e;
          y3 = y1 + (s.hY - y1) * e;
          z3 = z2 + (Math.cos(a) * s.hR - z2) * e;
          s.alphaMul = 1 - e * 0.4;
        } else {
          // background stars drift outward and dim, clearing the stage
          x3 = x2 * (1 + e * 0.9);
          y3 = y1 * (1 + e * 0.5);
          s.alphaMul = 1 - e * 0.7;
        }
      } else {
        s.alphaMul = 1;
      }

      // Perspective — skip stars behind the camera
      const zOff = focal + z3;
      if (zOff <= 0) { s.sc = 0; return; }

      const sc = focal / zOff;
      s.sc = sc;

      // Apply repel velocity on top of the projected position
      s.sx = x3 * sc + this.W / 2 + s.vx;
      s.sy = y3 * sc + this.H / 2 + s.vy;

      // Twinkle
      s.twinkle += s.twinkleSpeed;

      // ── Cursor repel (2D screen-space) ───────────────────────────────────
      const dx   = s.sx - this.mouseX;
      const dy   = s.sy - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.repelDist && dist > 0) {
        const f = (1 - dist / CONFIG.repelDist) * CONFIG.repelForce;
        s.vx += (dx / dist) * f;
        s.vy += (dy / dist) * f;
      }

      // Spring back & dampen
      s.vx *= 0.85;
      s.vy *= 0.85;
    });
  }

  _draw() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    const color = this.isLight ? CONFIG.colorLight : CONFIG.colorDark;

    // Only render stars that are in front of the camera and on/near screen
    const visible = this.stars.filter(s =>
      s.sc > 0 &&
      s.sx > -80 && s.sx < W + 80 &&
      s.sy > -80 && s.sy < H + 80
    );

    // Sort far → near so closer stars paint over farther ones
    visible.sort((a, b) => a.sc - b.sc);

    // ── Map perspective scale to normalised 0-1 depth value ─────────────────
    //    sc ranges roughly from (focal/(focal+spread)) to (focal/(focal-spread))
    //    We clamp to a safe range and normalise.
    const scMin = CONFIG.focal / (CONFIG.focal + CONFIG.spread); // far end
    const scMax = CONFIG.focal / Math.max(1, CONFIG.focal - CONFIG.spread); // near end

    const norm = s => Math.min(1, Math.max(0, (s.sc - scMin) / (scMax - scMin)));

    // Per-theme palette for the helix column structure
    const pal = this.isLight ? CONFIG.helix.colorsLight : CONFIG.helix.colorsDark;
    const starColor = s => (s.roleColor ? pal[s.roleColor] : color);

    // ── Helix structure: rails and tread spokes ──────────────────────────────
    if (this.helixMorph > 0.02) {
      // rails — continuous lines along each strand
      for (let st = 0; st < 2; st++) {
        const list = this.strandLists[st];
        for (let r = 0; r < list.length - 1; r++) {
          const ra = list[r], rb = list[r + 1];
          if (ra.sc <= 0 || rb.sc <= 0) continue;
          const eMin = Math.min(ra.e, rb.e);
          if (eMin < 0.05) continue;
          const depth = (norm(ra) + norm(rb)) * 0.5;
          ctx.strokeStyle = `rgba(${starColor(ra)}, ${eMin * (0.18 + depth * 0.35)})`;
          ctx.lineWidth = 0.6 + depth * 0.9;
          ctx.beginPath();
          ctx.moveTo(ra.sx, ra.sy);
          ctx.lineTo(rb.sx, rb.sy);
          ctx.stroke();
        }
      }

      // treads — spokes from the center axis out to marked rail stars
      for (let q = 0; q < CONFIG.helix.strandCount; q++) {
        const sp = this.stars[q];
        if (!sp.isStep || sp.sc <= 0 || sp.e < 0.1) continue;
        const depth = norm(sp);
        const grad = ctx.createLinearGradient(W / 2, sp.sy, sp.sx, sp.sy);
        grad.addColorStop(0, `rgba(${pal.core}, ${sp.e * 0.05})`);
        grad.addColorStop(1, `rgba(${starColor(sp)}, ${sp.e * (0.12 + depth * 0.3)})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8 + depth * 0.6;
        ctx.beginPath();
        ctx.moveTo(W / 2, sp.sy);
        ctx.lineTo(sp.sx, sp.sy);
        ctx.stroke();
      }
    }

    // ── Connection lines (batched) ────────────────────────────────────────────
    //   Thousands of faint links used to be a separate stroke() per line —
    //   the single biggest cost in the whole app. Instead we quantise each
    //   line's alpha into a few buckets and stroke every line in a bucket as
    //   one path, turning ~10k stroke calls into ~6. Visually identical.
    const LB = CONFIG.lineBuckets;
    const maxLA = CONFIG.maxLineAlpha;
    if (this._lineBuckets.length !== LB) {
      this._lineBuckets = Array.from({ length: LB }, () => []);
    }
    const buckets = this._lineBuckets;
    for (let b = 0; b < LB; b++) buckets[b].length = 0;

    const lineDistSq = CONFIG.lineDistSq;
    for (let i = 0; i < visible.length; i++) {
      const a = visible[i];
      const ax = a.sx, ay = a.sy, na = norm(a), am = a.alphaMul;
      for (let j = i + 1; j < visible.length; j++) {
        const b = visible[j];
        const dx = ax - b.sx;
        const dy = ay - b.sy;
        const d2 = dx * dx + dy * dy;
        if (d2 > lineDistSq) continue;

        const d = Math.sqrt(d2);
        const depthFac = (na + norm(b)) * 0.5;
        const lineAlpha = (1 - d / 160) * depthFac * 0.34 *
                          (am < b.alphaMul ? am : b.alphaMul);
        if (lineAlpha <= 0.01) continue;

        let bi = (lineAlpha / maxLA * LB) | 0;
        if (bi >= LB) bi = LB - 1;
        const seg = buckets[bi];
        seg.push(ax, ay, b.sx, b.sy);
      }
    }

    ctx.lineWidth = 0.65; // negligible variation; one width per frame
    for (let b = 0; b < LB; b++) {
      const seg = buckets[b];
      if (seg.length === 0) continue;
      ctx.strokeStyle = `rgba(${color}, ${((b + 0.5) / LB * maxLA).toFixed(3)})`;
      ctx.beginPath();
      for (let k = 0; k < seg.length; k += 4) {
        ctx.moveTo(seg[k], seg[k + 1]);
        ctx.lineTo(seg[k + 2], seg[k + 3]);
      }
      ctx.stroke();
    }

    // ── Stars ────────────────────────────────────────────────────────────────
    visible.forEach(s => {
      const t = norm(s);
      const col = starColor(s);

      // Twinkle modulates alpha slightly
      const twinkMod = 0.85 + 0.15 * Math.sin(s.twinkle);

      const alpha  = (CONFIG.minAlpha + t * (CONFIG.maxAlpha - CONFIG.minAlpha)) * twinkMod * s.alphaMul;
      if (alpha <= 0.01) return;
      const radius = (CONFIG.minSize + t * (CONFIG.maxSize - CONFIG.minSize)) * s.sizeMul;

      // Cursor proximity glow
      const mdx   = s.sx - this.mouseX;
      const mdy   = s.sy - this.mouseY;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      const prox  = mdist < CONFIG.repelDist ? 1 - mdist / CONFIG.repelDist : 0;

      const finalAlpha  = Math.min(1, alpha + prox * 0.55);
      const finalRadius = radius + prox * (CONFIG.maxSize * 1.4 - radius);

      // Glow halo near cursor
      if (prox > 0.05) {
        const grd = ctx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, finalRadius * 7);
        grd.addColorStop(0, `rgba(${col}, ${finalAlpha * prox * 0.45})`);
        grd.addColorStop(1, `rgba(${col}, 0)`);
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, finalRadius * 7, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Soft halo on the column structure stars so the helix glows
      if ((s.role === 'strand' || s.role === 'core') && s.e > 0.2) {
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, finalRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col}, ${finalAlpha * 0.10 * s.e})`;
        ctx.fill();
      }

      // Core dot — near stars get a tiny inner highlight
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, finalRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col}, ${finalAlpha})`;
      ctx.fill();

      if (t > 0.7) {
        // Bright near-stars: white specular centre
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, finalRadius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(t - 0.7) * 0.9})`;
        ctx.fill();
      }
    });
  }
}

// Singleton — same export name as before, nothing else needs updating
const starfield = new Starfield();
export default starfield;
export { Starfield };
