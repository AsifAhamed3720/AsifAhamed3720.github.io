/**
 * Dynamic Shadows Module
 * Cursor-based lighting: cards (and hovered images) cast a shadow away from
 * the pointer, with a soft glow on the lit side.
 *
 * Performance model:
 *  - mousemove only records the pointer position (cheap); all work happens in
 *    a single requestAnimationFrame loop, so it never runs more than once per
 *    frame regardless of pointer event rate.
 *  - The loop eases each card's shadow toward its target, which is both the
 *    smoothing mechanism (frame-rate consistent, no restarting CSS transition)
 *    and lets us stop entirely once everything has settled and the pointer is
 *    idle — no CPU/paint churn at rest.
 *  - Off-screen cards are skipped, and images are only updated for the wrapper
 *    currently hovered (they're invisible otherwise), instead of all of them.
 */

import { SHADOW_CONFIG } from '../constants.js';
import { isMobile } from '../utils.js';

const EASE = 0.15;          // shadow follow smoothing (lower = smoother/laggier)
const IDLE_MS = 140;        // keep looping this long after the last activity
const SETTLE = 0.5;         // px/opacity delta below which a value is "arrived"

class DynamicShadows {
  constructor() {
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.cards = [];
    this.wrappers = [];
    this.hoveredWrapper = null;
    this.running = false;
    this.lastActivity = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    // Disable on mobile for performance
    if (isMobile()) {
      console.log('DynamicShadows: Disabled on mobile');
      return;
    }

    this.cards = Array.from(document.querySelectorAll('.project-card'));
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) this.cards.push(contactForm);

    this.wrappers = Array.from(document.querySelectorAll('.project-wrapper'));

    if (this.cards.length === 0 && this.wrappers.length === 0) {
      console.warn('DynamicShadows: No elements found');
      return;
    }

    // Seed each card's eased state with its resting defaults.
    this.cards.forEach(card => {
      card._ds = { ox: 0, oy: 20, blur: 40, op: 0.5, glow: 0.15, ang: 0 };
      this.setDefaultCardShadow(card);
    });

    this.setupEventListeners();
    this.initialized = true;
    this._kick();
  }

  setupEventListeners() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.lastActivity = performance.now();
      this._kick();
    }, { passive: true });

    // Card positions change on scroll (helix) and resize — keep the loop alive.
    window.addEventListener('resize', () => { this.lastActivity = performance.now(); this._kick(); });
    window.addEventListener('scroll', () => { this.lastActivity = performance.now(); this._kick(); }, { passive: true });

    // Only the hovered wrapper's images are visible, so only update those.
    this.wrappers.forEach(w => {
      w.addEventListener('mouseenter', () => { this.hoveredWrapper = w; this.lastActivity = performance.now(); this._kick(); });
      w.addEventListener('mouseleave', () => { if (this.hoveredWrapper === w) this.hoveredWrapper = null; });
    });
  }

  // ── Loop control ────────────────────────────────────────────────────────────
  _kick() {
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(() => this._loop());
    }
  }

  _loop() {
    if (document.hidden) { this.running = false; return; }

    const animating = this._frame();
    const recentlyActive = performance.now() - this.lastActivity < IDLE_MS;

    if (animating || recentlyActive) {
      requestAnimationFrame(() => this._loop());
    } else {
      this.running = false;
    }
  }

  /** One eased update pass. Returns true while anything is still moving. */
  _frame() {
    let animating = false;
    const vw = window.innerWidth, vh = window.innerHeight;

    for (const card of this.cards) {
      const r = card.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue; // off-screen
      const target = this._targetFor(r, SHADOW_CONFIG.card);
      if (this._easeCard(card, target)) animating = true;
    }

    // Images: only for the wrapper under the pointer (all others are hidden).
    if (this.hoveredWrapper) {
      const imgs = this.hoveredWrapper.querySelectorAll('.project-image, .fyp-flower-image');
      imgs.forEach(img => {
        const r = img.getBoundingClientRect();
        const t = this._targetFor(r, SHADOW_CONFIG.image);
        // Few, hover-only elements — write directly; their CSS filter transition
        // provides the smoothing without a per-element eased state.
        img.style.setProperty('--img-shadow-x', `${t.ox.toFixed(2)}px`);
        img.style.setProperty('--img-shadow-y', `${t.oy.toFixed(2)}px`);
        img.style.setProperty('--img-shadow-blur', `${t.blur.toFixed(2)}px`);
        img.style.setProperty('--img-shadow-opacity', t.op.toFixed(3));
        img.style.setProperty('--img-glow-opacity', t.glow.toFixed(3));
        img.style.setProperty('--img-light-angle', `${t.ang.toFixed(1)}deg`);
      });
    }

    return animating;
  }

  /** Compute the target shadow for an element rect + config. */
  _targetFor(rect, config) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - this.mouseX;
    const dy = cy - this.mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist, ny = dy / dist;

    const intensity = Math.min(1, 800 / dist);
    const ox = nx * config.maxShadowDistance * intensity;
    const oy = ny * config.maxShadowDistance * intensity;
    const blur = config.maxBlur - (config.maxBlur - config.minBlur) * intensity;
    const op = config.minOpacity + (config.maxOpacity - config.minOpacity) * intensity;
    const glow = Math.min(1, 600 / dist) * config.maxGlowOpacity;
    const ang = Math.atan2(-dy, -dx) * (180 / Math.PI);

    return { ox, oy, blur, op, glow, ang };
  }

  /** Ease a card toward its target and write the vars. Returns true if moving. */
  _easeCard(card, t) {
    const s = card._ds;

    // shortest-path angle easing (avoid a spin across the ±180 seam)
    let da = t.ang - s.ang;
    if (da > 180) da -= 360; else if (da < -180) da += 360;

    s.ox += (t.ox - s.ox) * EASE;
    s.oy += (t.oy - s.oy) * EASE;
    s.blur += (t.blur - s.blur) * EASE;
    s.op += (t.op - s.op) * EASE;
    s.glow += (t.glow - s.glow) * EASE;
    s.ang += da * EASE;

    card.style.setProperty('--shadow-x', `${s.ox.toFixed(2)}px`);
    card.style.setProperty('--shadow-y', `${s.oy.toFixed(2)}px`);
    card.style.setProperty('--shadow-blur', `${s.blur.toFixed(2)}px`);
    card.style.setProperty('--shadow-spread', `${SHADOW_CONFIG.card.shadowSpread}px`);
    card.style.setProperty('--shadow-opacity', s.op.toFixed(3));
    card.style.setProperty('--glow-opacity', s.glow.toFixed(3));
    card.style.setProperty('--light-angle', `${s.ang.toFixed(1)}deg`);

    return Math.abs(t.ox - s.ox) > SETTLE || Math.abs(t.oy - s.oy) > SETTLE ||
           Math.abs(t.blur - s.blur) > SETTLE || Math.abs(t.ang - s.ang) > 0.5;
  }

  setDefaultCardShadow(card) {
    card.style.setProperty('--shadow-x', '0px');
    card.style.setProperty('--shadow-y', '20px');
    card.style.setProperty('--shadow-blur', '40px');
    card.style.setProperty('--shadow-spread', '0px');
    card.style.setProperty('--shadow-opacity', '0.5');
    card.style.setProperty('--glow-opacity', '0.15');
  }
}

// Create singleton instance
const dynamicShadows = new DynamicShadows();

// Export both the instance and the class
export default dynamicShadows;
export { DynamicShadows };
