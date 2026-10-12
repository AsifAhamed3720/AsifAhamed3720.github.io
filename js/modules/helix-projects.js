/**
 * Helix Projects Module
 * Spiral-staircase scroll choreography for the projects section.
 *
 * The first card flies in from behind the column while the section is
 * still sliding into place, landing in the centered reading position just
 * after the stage pins. From there each card spirals up and away as the
 * next rises from below and orbits the starfield column into its place;
 * the last card stays docked. The starfield receives the morph/spin state so
 * its stars assemble into the helical column that anchors the staircase.
 *
 * Desktop only — on mobile or reduced motion this module never activates
 * and the classic stacked layout (card-manager / scroll-animations) applies.
 */

import { clamp, isMobile, prefersReducedMotion } from '../utils.js';
import { CARD_CONFIG } from '../constants.js';
import starfield from './starfield.js';

// ─── Tuning ───────────────────────────────────────────────────────────────────
const HELIX_CONFIG = {
  unitVh      : 140,   // scroll distance (vh) per card-to-card transition
  arriveAt    : 0.45,  // the first card sets off when the stage's top is this
                       // far down the viewport (fraction of vh), before it pins
  arriveVh    : 0.8,   // scroll distance (fraction of vh) for that whole flight
  depth       : 340,   // how far cards travel behind the column (px)
  rot         : 0.5,   // card tilt while circling (fraction of helix angle)
  dwell       : 0.55,  // 0 = constant speed, 1 = long pause at center
  fadeFrom    : 0.68,  // |angle|/PI where the fade out starts
  fadeTo      : 0.92,  // |angle|/PI where the card is fully invisible
  ease        : 0.15,  // how fast cards catch up to the scrollbar, per 60 fps
                       // frame (~100 ms to settle, at any refresh rate)
  spinPerCard : 0.55   // starfield column turns per card transition
};
// ─────────────────────────────────────────────────────────────────────────────

class HelixProjects {
  constructor() {
    this.scroller = null;
    this.stage = null;
    this.wrappers = [];   // all project wrappers, DOM order
    this.active = [];     // wrappers matching the current filter
    this.dotsBox = null;
    this.dots = [];
    this.pos = -1;        // smoothed staircase position: card i is centered at
                          // pos = i, and -1 is the first card hidden below
    this.sizes = new WeakMap();   // card -> { w, h }, kept by a ResizeObserver
    this.drawn = new WeakMap();   // wrapper -> last styles written
    this.parked = false;          // section far off screen, cards hidden
    this.lastTime = 0;
    this.rafId = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    if (isMobile() || prefersReducedMotion()) {
      console.log('HelixProjects: off (mobile or reduced motion)');
      return;
    }

    this.scroller = document.getElementById('helix-scroll');
    if (!this.scroller) {
      console.warn('HelixProjects: #helix-scroll not found');
      return;
    }

    this.stage = this.scroller.querySelector('.helix-stage');
    this.wrappers = Array.from(this.stage.querySelectorAll('.project-wrapper'));
    if (this.wrappers.length === 0) {
      console.warn('HelixProjects: no project wrappers found');
      return;
    }

    this.scroller.classList.add('helix-on');

    // Card sizes only change on resize or when content loads, so they're
    // measured here instead of read every frame (reading layout right after
    // writing styles forced a full layout per card per frame).
    const measure = new ResizeObserver(entries => entries.forEach(e => {
      this.sizes.set(e.target, { w: e.target.offsetWidth, h: e.target.offsetHeight });
    }));
    this.wrappers.forEach(w => {
      const card = w.querySelector('.project-card');
      if (card) measure.observe(card);
    });

    this._buildDots();
    this._bindFilters();
    this._setActive(this.wrappers.slice());
    this._loop();

    this.initialized = true;
  }

  /**
   * Document scroll position where card i (in the current filter) sits in
   * the reading position, or null when the helix isn't running. The inverse
   * of _targetPos. Links to the projects section aim at card 0: at the
   * section's top that card is still mid-flight, small and off to the side.
   * @param {number} i - Index among the active cards
   */
  cardScrollY(i) {
    if (!this.initialized) return null;
    const { arriveAt, arriveVh, unitVh } = HELIX_CONFIG;
    const vh = window.innerHeight;
    const top = this.scroller.getBoundingClientRect().top + window.scrollY;
    return top + (arriveVh - arriveAt) * vh + i * (unitVh / 100) * vh;
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.scroller?.classList.remove('helix-on');
    this.initialized = false;
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  // Mirrors project-filters.js's category logic so the staircase re-indexes
  // immediately on filter change instead of waiting for its display toggles.
  _bindFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this._setActive(this.wrappers.filter(w =>
          filter === 'all' || w.dataset.category === filter
        ));
      });
    });
  }

  _setActive(list) {
    this.active = list;
    // hide everything; the loop reveals the active cards on the path
    this.wrappers.forEach(w => this._set(w, 'visibility', 'hidden'));
    this.scroller.style.height = 'calc(100vh + ' + this._pinnedVh() + 'vh)';
    this._rebuildDots();
  }

  // How long (vh) the stage stays pinned: the rest of the first card's flight
  // (it starts before the pin) plus one transition per further card.
  _pinnedVh() {
    const { arriveAt, arriveVh, unitVh } = HELIX_CONFIG;
    return (arriveVh - arriveAt) * 100 + Math.max(this.active.length - 1, 0) * unitVh;
  }

  /**
   * Staircase position for the current scroll. The first card's flight
   * (-1 → 0) is squeezed into a short stretch that starts before the stage
   * pins; each later card takes a full unit.
   * @param {number} top - The scroller's top edge relative to the viewport
   * @param {number} vh - Viewport height
   */
  _targetPos(top, vh) {
    const { arriveAt, arriveVh, unitVh } = HELIX_CONFIG;
    const scrolled = arriveAt * vh - top;  // px since the first card set off
    const arrivePx = arriveVh * vh;
    if (scrolled <= arrivePx) return -1 + clamp(scrolled / arrivePx, 0, 1);
    return Math.min((scrolled - arrivePx) / (unitVh / 100 * vh), this.active.length - 1);
  }

  // ── Progress dots ──────────────────────────────────────────────────────────
  _buildDots() {
    this.dotsBox = document.createElement('div');
    this.dotsBox.className = 'helix-dots';
    this.dotsBox.setAttribute('role', 'group');
    this.dotsBox.setAttribute('aria-label', 'Jump to project');
    this.stage.appendChild(this.dotsBox);
  }

  // One button per active card: it shows the project's name on hover and
  // scrolls the staircase to that card's reading position.
  _rebuildDots() {
    this.dotsBox.textContent = '';
    this.dots = this.active.map((wrapper, i) => {
      const title = wrapper.querySelector('h3')?.textContent.trim() || `Project ${i + 1}`;
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.dataset.title = title;
      dot.setAttribute('aria-label', title);
      dot.addEventListener('click', () => {
        window.scrollTo({ top: this.cardScrollY(i), behavior: 'smooth' });
      });
      this.dotsBox.appendChild(dot);
      return dot;
    });
  }

  // ── Main loop ──────────────────────────────────────────────────────────────
  _loop(now = performance.now()) {
    this.rafId = requestAnimationFrame(t => this._loop(t));
    // Skip the per-frame layout read + transforms while the tab is hidden.
    if (document.hidden) { this.lastTime = 0; return; }
    // elapsed time in 60 fps frames, so the easing runs at the same speed
    // on a 60 Hz or a 360 Hz display
    const dt = this.lastTime ? Math.min((now - this.lastTime) / (1000 / 60), 4) : 1;
    this.lastTime = now;
    this._tick(dt);
  }

  /**
   * Write a style only when it changed. The loop runs every frame, and most
   * frames most cards are standing still.
   */
  _set(el, prop, value) {
    let last = this.drawn.get(el);
    if (!last) { last = {}; this.drawn.set(el, last); }
    if (last[prop] === value) return;
    last[prop] = value;
    el.style[prop] = value;
  }

  // slow near the center (reading position), fast at the edges
  _dwellEase(t) {
    const d = HELIX_CONFIG.dwell;
    return (1 - d) * t + d * t * t * t;
  }

  _tick(dt) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const rect = this.scroller.getBoundingClientRect();
    const target = this._targetPos(rect.top, vh);

    // hand the starfield its column state (it eases the morph itself)
    const enter = clamp((vh - rect.top) / (vh * 0.85), 0, 1);
    const exit  = clamp(rect.bottom / (vh * 0.9), 0, 1);
    starfield.helixMorphTarget = Math.min(enter, exit);

    // Far from the section there is nothing to animate: hide the cards
    // once, keep the position in step, and skip the rest of the frame.
    if (rect.top > vh * 1.6 || rect.bottom < -vh * 0.5) {
      this.pos = target;
      starfield.helixSpinPhase = this.pos * HELIX_CONFIG.spinPerCard * Math.PI * 2;
      if (!this.parked) {
        this.wrappers.forEach(w => this._set(w, 'visibility', 'hidden'));
        this.parked = true;
      }
      return;
    }
    this.parked = false;

    // smoothed position along the staircase
    this.pos += (target - this.pos) * (1 - Math.pow(1 - HELIX_CONFIG.ease, dt));
    if (Math.abs(target - this.pos) < 0.002) this.pos = target;
    starfield.helixSpinPhase = this.pos * HELIX_CONFIG.spinPerCard * Math.PI * 2;

    const sh = this.stage.clientHeight;   // the stage sits below the fixed nav
    const R  = Math.min(vw * 0.36, 460);  // horizontal orbit radius
    const Hy = sh * 0.56;                 // vertical travel from center
    const N  = this.active.length;

    let activeIdx = 0;
    let best = Infinity;

    for (let i = 0; i < N; i++) {
      const wrapper = this.active[i];
      const card = wrapper.querySelector('.project-card');

      // u: -1 = hidden below, 0 = centered, +1 = hidden above
      let u = this.pos - i;
      if (i === N - 1) u = Math.min(u, 0); // last card docks at center

      const au = Math.abs(u);
      if (au < best) { best = au; activeIdx = i; }

      if (au >= 1) {
        this._set(wrapper, 'visibility', 'hidden');
        continue;
      }

      const phi = this._dwellEase(clamp(u, -1, 1)) * Math.PI;
      const x = Math.sin(phi) * R;
      const y = -(phi / Math.PI) * Hy;
      const z = (Math.cos(phi) - 1) * HELIX_CONFIG.depth;
      const ry = phi * HELIX_CONFIG.rot * (180 / Math.PI);

      // Scale the whole wrapper (card + hover images together) so the
      // full composition fits the viewport: height-wise for short
      // screens, width-wise so the side images keep room at full size
      // on narrow windows instead of shrinking out of proportion.
      const size = (card && this.sizes.get(card)) || { w: 0, h: 0 };
      const needW = size.w + 2 * (CARD_CONFIG.edgeGap + CARD_CONFIG.imageWidth) + 24;
      const fitH = size.h > 0 ? Math.min(1, (sh * 0.92) / size.h) : 1;
      const fitW = size.w > 0 ? Math.min(1, vw / needW) : 1;
      const fit = Math.min(fitH, fitW);

      const ap = Math.abs(phi) / Math.PI;
      const alpha = clamp(
        (HELIX_CONFIG.fadeTo - ap) / (HELIX_CONFIG.fadeTo - HELIX_CONFIG.fadeFrom),
        0, 1
      );
      const bright = 0.6 + 0.4 * (Math.cos(phi) + 1) / 2;

      this._set(wrapper, 'visibility', 'visible');
      this._set(wrapper, 'transform',
        'translate(-50%, -50%) translate3d(' + x.toFixed(1) + 'px, ' +
        y.toFixed(1) + 'px, ' + z.toFixed(1) + 'px) rotateY(' +
        ry.toFixed(2) + 'deg)' +
        (fit < 1 ? ' scale(' + fit.toFixed(3) + ')' : ''));
      this._set(wrapper, 'zIndex', String(100 + Math.round(Math.cos(phi) * 60)));
      this._set(wrapper, 'pointerEvents', au < 0.4 ? 'auto' : 'none');

      if (card) {
        // Opacity and dimming change the card's pixels, which costs a
        // repaint of the whole card, so they move in small steps rather than
        // every frame, and the dimming is dropped entirely near the front.
        this._set(card, 'opacity', (Math.round(alpha * 50) / 50).toFixed(2));
        const dim = Math.round(bright * 20) / 20;
        this._set(card, 'filter', dim >= 0.98 ? 'none' : 'brightness(' + dim.toFixed(2) + ')');
      }
    }

    for (let d = 0; d < this.dots.length; d++) {
      const on = d === activeIdx;
      if (this.dots[d].classList.contains('active') === on) continue;
      this.dots[d].classList.toggle('active', on);
      if (on) this.dots[d].setAttribute('aria-current', 'true');
      else this.dots[d].removeAttribute('aria-current');
    }
  }
}

// Singleton
const helixProjects = new HelixProjects();
export default helixProjects;
export { HelixProjects };
