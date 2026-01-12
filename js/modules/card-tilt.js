/**
 * Card Tilt Module
 * Handles 3D tilt effect on project cards
 */

import { TILT_CONFIG } from '../constants.js';
import { prefersReducedMotion, isMobile } from '../utils.js';

class CardTilt {
  constructor() {
    this.wrappers = [];
    this.initialized = false;
  }

  /**
   * Initialize the card tilt effect
   */
  init() {
    if (this.initialized) return;

    // Disable on mobile or if user prefers reduced motion
    if (isMobile() || prefersReducedMotion()) {
      console.log('CardTilt: Disabled (mobile or reduced motion preference)');
      return;
    }

    this.wrappers = Array.from(document.querySelectorAll('.project-wrapper'));
    
    if (this.wrappers.length === 0) {
      console.warn('CardTilt: No project wrappers found');
      return;
    }

    this.setupTiltEffects();
    this.initialized = true;
  }

  /**
   * Set up tilt effects for all cards
   */
  setupTiltEffects() {
    this.wrappers.forEach(wrapper => {
      const card = wrapper.querySelector('.project-card');
      if (!card) return;

      // Mouse move handler
      wrapper.addEventListener('mousemove', (e) => {
        this.handleMouseMove(wrapper, card, e);
      });

      // Mouse leave handler
      wrapper.addEventListener('mouseleave', () => {
        this.resetTilt(card);
      });
    });
  }

  /**
   * Handle mouse move over card wrapper
   * @param {HTMLElement} wrapper - The wrapper element
   * @param {HTMLElement} card - The card element
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(wrapper, card, e) {
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate normalized position (-1 to 1)
    const px = (x / rect.width) * 2 - 1;
    const py = (y / rect.height) * 2 - 1;

    // Calculate rotation angles
    const { maxRotationX, maxRotationY, translateY } = TILT_CONFIG;
    const rotateX = -py * maxRotationX;
    const rotateY = px * maxRotationY;

    // Apply transforms
    card.style.setProperty('--rx', `${rotateX}deg`);
    card.style.setProperty('--ry', `${rotateY}deg`);
    card.style.setProperty('--ty', `${translateY}px`);
  }

  /**
   * Reset card tilt to default position
   * @param {HTMLElement} card - The card element
   */
  resetTilt(card) {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--ty', '0px');
  }

  /**
   * Disable tilt effects (useful for debugging)
   */
  disable() {
    this.wrappers.forEach(wrapper => {
      const card = wrapper.querySelector('.project-card');
      if (card) {
        this.resetTilt(card);
      }
    });
    this.initialized = false;
  }
}

// Create singleton instance
const cardTilt = new CardTilt();

// Export both the instance and the class
export default cardTilt;
export { CardTilt };
