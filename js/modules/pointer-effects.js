/**
 * Pointer Effects Module
 * Small responses to a mouse or trackpad: a soft light follows the pointer
 * across the skill cards (skills.css), and the hero and nav buttons lean a
 * few pixels toward it (the `translate` on .btn in base.css). Skipped on
 * touch screens; the lean is also skipped for reduced motion.
 */

import { clamp, prefersReducedMotion } from '../utils.js';

const SPOTLIGHT_SELECTOR = '.skill-category-large';
const MAGNET_SELECTOR = '.hero-cta .btn, .nav-cv';
const MAGNET_PULL = 0.18; // share of the pointer's offset from the button's centre
const MAGNET_MAX = 8;     // px

class PointerEffects {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    this.setupSpotlight();
    if (!prefersReducedMotion()) this.setupMagnets();
  }

  setupSpotlight() {
    document.querySelectorAll(SPOTLIGHT_SELECTOR).forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
    });
  }

  setupMagnets() {
    document.querySelectorAll(MAGNET_SELECTOR).forEach(btn => {
      btn.addEventListener('pointermove', (e) => {
        const rect = btn.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        btn.style.setProperty('--mgx', clamp(dx * MAGNET_PULL, -MAGNET_MAX, MAGNET_MAX) + 'px');
        btn.style.setProperty('--mgy', clamp(dy * MAGNET_PULL, -MAGNET_MAX, MAGNET_MAX) + 'px');
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.removeProperty('--mgx');
        btn.style.removeProperty('--mgy');
      });
    });
  }
}

// Create singleton instance
const pointerEffects = new PointerEffects();

export default pointerEffects;
export { PointerEffects };
