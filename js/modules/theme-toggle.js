/**
 * Theme Toggle Module
 * Switches dark/light mode and remembers the choice. Where the browser
 * supports view transitions, the new theme spreads out from the button as a
 * circle; elsewhere, or with reduced motion, it switches in place.
 */

import { prefersReducedMotion } from '../utils.js';

const WIPE_MS = 700;
const WIPE_EASING = 'cubic-bezier(.7, 0, .2, 1)'; // --ease-in-out

class ThemeToggle {
  constructor() {
    this.buttons = [];
    this.html = document.documentElement;
    this.initialized = false;
  }

  /**
   * Initialize theme toggle
   */
  init() {
    if (this.initialized) return;

    this.buttons = [
      document.getElementById('theme-toggle'),
      document.getElementById('theme-toggle-mobile')
    ].filter(Boolean);

    if (this.buttons.length === 0) {
      console.warn('ThemeToggle: Toggle buttons not found');
      return;
    }

    // Current theme is already set by the inline script in <head>
    this.updateButtons(this.html.getAttribute('data-theme') || 'dark', false);

    this.buttons.forEach(button => {
      button.addEventListener('click', () => this.toggleTheme(button));
    });

    this.initialized = true;
  }

  /**
   * Toggle between dark and light theme
   * @param {HTMLElement} origin - The button pressed; the wipe starts there
   */
  toggleTheme(origin) {
    const next = this.html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';

    const apply = () => {
      this.html.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
      this.updateButtons(next, true);
    };

    if (!document.startViewTransition || prefersReducedMotion()) {
      apply();
      return;
    }

    const rect = origin.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    // colour transitions would replay inside the circle, so the new theme
    // is captured fully applied (see .theme-switching in theme-toggle.css)
    this.html.classList.add('theme-switching');
    const transition = document.startViewTransition(apply);

    transition.ready.then(() => {
      this.html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: WIPE_MS, easing: WIPE_EASING, pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => { /* skipped transition: the theme still applied */ });

    transition.finished.finally(() => this.html.classList.remove('theme-switching'));
  }

  /**
   * Name the action for screen readers and turn the new icon into place.
   * Which icon shows is decided by theme-toggle.css from data-theme.
   * @param {string} theme - The theme now active, 'dark' or 'light'
   * @param {boolean} animate - Turn the new icon into place
   */
  updateButtons(theme, animate) {
    const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

    this.buttons.forEach(button => {
      button.setAttribute('aria-label', label);
      if (animate) {
        button.classList.remove('icon-turn');
        void button.offsetWidth; // restart the icon animation
        button.classList.add('icon-turn');
      }
    });
  }
}

// Create singleton instance
const themeToggle = new ThemeToggle();

export default themeToggle;
export { ThemeToggle };
