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
    this.startAnimation();

    this.initialized = true;
  }

  /**
   * Track mouse position
   */
  setupMouseTracking() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
  }

  /**
   * Animate glow to follow mouse with smooth easing
   */
  startAnimation() {
    const animate = () => {
      this.glowX += (this.mouseX - this.glowX) * this.speed;
      this.glowY += (this.mouseY - this.glowY) * this.speed;
      
      this.glow.style.left = this.glowX + 'px';
      this.glow.style.top = this.glowY + 'px';
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
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
