/**
 * Water Ripple Module
 * Creates ripple effect on click anywhere on the page
 */

class WaterRipple {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize water ripple effect
   */
  init() {
    if (this.initialized) return;

    this.setupClickHandler();

    this.initialized = true;
  }

  /**
   * Create ripples on click
   */
  setupClickHandler() {
    document.addEventListener('click', (e) => {
      // Create 3 concentric ripples with delays
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.createRipple(e.clientX, e.clientY);
        }, i * 150); // Stagger each ripple by 150ms
      }
    });
  }

  /**
   * Create a single ripple element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  createRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.animationDelay = '0s';
    
    document.body.appendChild(ripple);
    
    // Remove ripple after animation completes
    setTimeout(() => {
      ripple.remove();
    }, 1500);
  }
}

// Create singleton instance
const waterRipple = new WaterRipple();

export default waterRipple;
export { WaterRipple };
