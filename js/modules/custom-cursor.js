/**
 * Custom Cursor Module
 * Two-part cursor: a small sharp dot that sits exactly on the pointer,
 * and a larger ring that trails behind with easing.
 * The ring morphs on hover over interactive elements.
 */

import { isMobile } from '../utils.js';

// ─── Selectors that trigger the "hover" morphed state ─────────────────────────
const INTERACTIVE = [
  'a',
  'button',
  'input',
  'textarea',
  '.filter-btn',
  '.skill-tag',
  '.tech-tag',
  '.project-card',
  '.contact-link',
  '.scroll-to-top',
  '.theme-toggle',
  '.mobile-menu-toggle',
  '.nav-logo',
  '.project-image',
  '.fyp-flower-image',
  '.cta-primary',
  '.cta-secondary',
  '.submit-btn',
].join(', ');

// ─── Selectors that trigger the "text" state (I-beam blend) ───────────────────
const TEXT_TARGETS = ['p', 'h1', 'h2', 'h3', 'span', 'label'].join(', ');

class CustomCursor {
  constructor() {
    this.dot      = null;   // tiny sharp centre dot
    this.ring     = null;   // larger trailing ring
    this.mouseX   = -200;
    this.mouseY   = -200;
    this.ringX    = -200;
    this.ringY    = -200;
    this.ringSpeed = 0.13;  // lower = more lag / trail feel
    this.rafId    = null;
    this.state    = 'default';   // 'default' | 'hover' | 'text' | 'click' | 'hidden'
    this.initialized = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  init() {
    if (this.initialized) return;

    // Skip on touch / mobile devices
    if (isMobile() || window.matchMedia('(hover: none)').matches) {
      console.log('CustomCursor: disabled on touch device');
      return;
    }

    this._buildDOM();
    this._hideBrowserCursor();
    this._listen();
    this._loop();

    this.initialized = true;
    console.log('✅ Custom Cursor initialized');
  }

  // ── DOM ─────────────────────────────────────────────────────────────────────

  _buildDOM() {
    this.dot  = this._el('cursor-dot');
    this.ring = this._el('cursor-ring');
    document.body.appendChild(this.dot);
    document.body.appendChild(this.ring);
  }

  _el(className) {
    const div = document.createElement('div');
    div.className = className;
    return div;
  }

  // ── Browser cursor hiding ───────────────────────────────────────────────────

  _hideBrowserCursor() {
    // Set on the root so it cascades everywhere, including iframes etc.
    document.documentElement.style.cursor = 'none';

    // Re-apply on every element that might override it
    const style = document.createElement('style');
    style.id = 'cursor-none-override';
    style.textContent = `
      *, *::before, *::after { cursor: none !important; }
    `;
    document.head.appendChild(style);
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  _listen() {
    // Position tracking
    document.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this._show();
    });

    // Hide when leaving the window
    document.addEventListener('mouseleave', () => this._setVisible(false));
    document.addEventListener('mouseenter', () => this._setVisible(true));

    // Click burst
    document.addEventListener('mousedown', () => this._setState('click'));
    document.addEventListener('mouseup',   () => {
      // Return to whatever hover state the element currently demands
      const el = document.elementFromPoint(this.mouseX, this.mouseY);
      this._evaluateElement(el);
    });

    // Hover detection via a single delegated mouseover
    document.addEventListener('mouseover', e => {
      if (this.state === 'click') return;
      this._evaluateElement(e.target);
    });

    // Scroll — briefly shrink the ring while scrolling
    let scrollTimer;
    window.addEventListener('scroll', () => {
      if (this.state !== 'click') {
        this.ring.classList.add('cursor-ring--scroll');
      }
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        this.ring.classList.remove('cursor-ring--scroll');
      }, 150);
    }, { passive: true });
  }

  // ── State machine ───────────────────────────────────────────────────────────

  _evaluateElement(el) {
    if (!el) { this._setState('default'); return; }

    if (el.closest(INTERACTIVE)) {
      this._setState('hover');
    } else if (el.closest(TEXT_TARGETS)) {
      this._setState('text');
    } else {
      this._setState('default');
    }
  }

  _setState(state) {
    if (this.state === state) return;
    this.state = state;

    // Remove all state classes then add the new one
    this.ring.className = 'cursor-ring';
    this.dot.className  = 'cursor-dot';

    if (state !== 'default') {
      this.ring.classList.add(`cursor-ring--${state}`);
      this.dot.classList.add(`cursor-dot--${state}`);
    }
  }

  _setVisible(visible) {
    const v = visible ? '1' : '0';
    this.dot.style.opacity  = v;
    this.ring.style.opacity = v;
  }

  _show() {
    if (this.dot.style.opacity === '0') this._setVisible(true);
  }

  // ── Render loop ─────────────────────────────────────────────────────────────

  _loop() {
    // Dot tracks instantly
    this.dot.style.transform = `translate(${this.mouseX}px, ${this.mouseY}px)`;

    // Ring eases toward mouse
    this.ringX += (this.mouseX - this.ringX) * this.ringSpeed;
    this.ringY += (this.mouseY - this.ringY) * this.ringSpeed;
    this.ring.style.transform = `translate(${this.ringX}px, ${this.ringY}px)`;

    this.rafId = requestAnimationFrame(() => this._loop());
  }
}

// Singleton
const customCursor = new CustomCursor();
export default customCursor;
export { CustomCursor };
