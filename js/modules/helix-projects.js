/**
 * Helix Projects Module
 * Spiral-staircase scroll choreography for the projects section.
 *
 * Each project card rises from below the viewport, orbits the starfield
 * column into a centered reading position, then spirals up and away as
 * the next card arrives. The starfield receives the morph/spin state so
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
  unitVh      : 140,   // scroll distance (vh) per card
  lead        : 0.5,   // lead-in so the first card starts hidden below
  depth       : 340,   // how far cards travel behind the column (px)
  rot         : 0.5,   // card tilt while circling (fraction of helix angle)
  dwell       : 0.55,  // 0 = constant speed, 1 = long pause at center
  fadeFrom    : 0.68,  // |angle|/PI where the fade out starts
  fadeTo      : 0.92,  // |angle|/PI where the card is fully invisible
  ease        : 0.075, // how fast cards catch up to the scrollbar
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
    this.progress = 0;    // smoothed scroll progress through the section
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
    this._buildDots();
    this._bindFilters();
    this._setActive(this.wrappers.slice());
    this._loop();

    this.initialized = true;
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
    this.wrappers.forEach(w => { w.style.visibility = 'hidden'; });
    this.scroller.style.height =
      'calc(100vh + ' + (this._span() * HELIX_CONFIG.unitVh) + 'vh)';
    this._rebuildDots();
  }

  _span() {
    return Math.max(this.active.length - 0.5 + HELIX_CONFIG.lead, 1);
  }

  // ── Progress dots ──────────────────────────────────────────────────────────
  _buildDots() {
    this.dotsBox = document.createElement('div');
    this.dotsBox.className = 'helix-dots';
    this.dotsBox.setAttribute('aria-hidden', 'true');
    this.stage.appendChild(this.dotsBox);
  }

  _rebuildDots() {
    this.dotsBox.innerHTML = '';
    this.dots = this.active.map(() => {
      const dot = document.createElement('span');
      this.dotsBox.appendChild(dot);
      return dot;
    });
  }

  // ── Main loop ──────────────────────────────────────────────────────────────
  _loop() {
    // Skip the per-frame layout read + transforms while the tab is hidden.
    if (!document.hidden) this._tick();
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  // slow near the center (reading position), fast at the edges
  _dwellEase(t) {
    const d = HELIX_CONFIG.dwell;
    return (1 - d) * t + d * t * t * t;
  }

  _tick() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const rect = this.scroller.getBoundingClientRect();

    // smoothed progress through the section
    const denom = this.scroller.offsetHeight - vh;
    const target = denom > 0 ? clamp(-rect.top / denom, 0, 1) : 0;
    this.progress += (target - this.progress) * HELIX_CONFIG.ease;
    if (Math.abs(target - this.progress) < 0.0004) this.progress = target;

    const span = this._span();

    // hand the starfield its column state (it eases the morph itself)
    const enter = clamp((vh - rect.top) / (vh * 0.85), 0, 1);
    const exit  = clamp(rect.bottom / (vh * 0.9), 0, 1);
    starfield.helixMorphTarget = Math.min(enter, exit);
    starfield.helixSpinPhase =
      this.progress * span * HELIX_CONFIG.spinPerCard * Math.PI * 2;

    const R  = Math.min(vw * 0.36, 460);  // horizontal orbit radius
    const Hy = vh * 0.56;                 // vertical travel from center
    const N  = this.active.length;

    let activeIdx = 0;
    let best = Infinity;

    for (let i = 0; i < N; i++) {
      const wrapper = this.active[i];
      const card = wrapper.querySelector('.project-card');

      // u: -1 = hidden below, 0 = centered, +1 = hidden above
      let u = this.progress * span - HELIX_CONFIG.lead - 0.5 - i;
      if (i === N - 1) u = Math.min(u, 0); // last card docks at center

      const au = Math.abs(u);
      if (au < best) { best = au; activeIdx = i; }

      if (au >= 1) {
        wrapper.style.visibility = 'hidden';
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
      const cardH = card ? card.offsetHeight : 0;
      const cardW = card ? card.offsetWidth : 0;
      const needW = cardW + 2 * (CARD_CONFIG.edgeGap + CARD_CONFIG.imageWidth) + 24;
      const fitH = cardH > 0 ? Math.min(1, (vh * 0.88) / cardH) : 1;
      const fitW = cardW > 0 ? Math.min(1, vw / needW) : 1;
      const fit = Math.min(fitH, fitW);

      const ap = Math.abs(phi) / Math.PI;
      const alpha = clamp(
        (HELIX_CONFIG.fadeTo - ap) / (HELIX_CONFIG.fadeTo - HELIX_CONFIG.fadeFrom),
        0, 1
      );
      const bright = 0.6 + 0.4 * (Math.cos(phi) + 1) / 2;

      wrapper.style.visibility = 'visible';
      wrapper.style.transform =
        'translate(-50%, -50%) translate3d(' + x.toFixed(1) + 'px, ' +
        y.toFixed(1) + 'px, ' + z.toFixed(1) + 'px) rotateY(' +
        ry.toFixed(2) + 'deg)' +
        (fit < 1 ? ' scale(' + fit.toFixed(3) + ')' : '');
      wrapper.style.zIndex = String(100 + Math.round(Math.cos(phi) * 60));
      wrapper.style.pointerEvents = au < 0.4 ? 'auto' : 'none';

      if (card) {
        card.style.opacity = alpha.toFixed(3);
        card.style.filter = 'brightness(' + bright.toFixed(3) + ')';
      }
    }

    for (let d = 0; d < this.dots.length; d++) {
      this.dots[d].classList.toggle('active', d === activeIdx);
    }
  }
}

// Singleton
const helixProjects = new HelixProjects();
export default helixProjects;
export { HelixProjects };
