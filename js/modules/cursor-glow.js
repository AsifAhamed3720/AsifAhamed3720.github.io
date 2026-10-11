/**
 * Cursor Glow Module
 * Animated glow effect that follows the cursor
 */

class CursorGlow {
  constructor() {
    this.glow = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.glowX = 0;
    this.glowY = 0;
    this.speed = 0.15;
    this.animationId = null;
    this.initialized = false;
  }

  /**
   * Initialize cursor glow
   */
  init() {
    if (this.initialized) return;

    this.glow = document.querySelector('.cursor-glow');

    if (!this.glow) {
      console.warn('CursorGlow: Element not found');
      return;
    }

    // Disable on mobile
    if (window.innerWidth <= 768) {
      console.log('CursorGlow: Disabled on mobile');
      return;
    }

    this.setupMouseTracking();

    this.initialized = true;
  }

  /**
   * Track mouse position. The glow stays hidden until the pointer first
   * moves, so it never sits parked in the corner.
   */
  setupMouseTracking() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (!this.glow.classList.contains('is-active')) {
        this.glowX = this.mouseX;
        this.glowY = this.mouseY;
        this.glow.classList.add('is-active');
      }
      this.startAnimation();
    }, { passive: true });
  }

  /**
   * Ease the glow toward the mouse. It moves by transform (no layout work,
   * no layout shift) and the loop sleeps once the glow has caught up.
   */
  startAnimation() {
    if (this.animationId) return;

    const animate = () => {
      const dx = this.mouseX - this.glowX;
      const dy = this.mouseY - this.glowY;
      this.glowX += dx * this.speed;
      this.glowY += dy * this.speed;
      this.glow.style.transform =
        `translate3d(${this.glowX.toFixed(1)}px, ${this.glowY.toFixed(1)}px, 0) translate(-50%, -50%)`;

      this.animationId = Math.abs(dx) + Math.abs(dy) > 0.2 ? requestAnimationFrame(animate) : null;
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop animation (for cleanup)
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// Create singleton instance
const cursorGlow = new CursorGlow();

export default cursorGlow;
export { CursorGlow };
