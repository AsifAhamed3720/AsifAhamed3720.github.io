/**
 * Card Manager Module
 * Handles card width calculations and image scaling
 */

import { CARD_CONFIG } from '../constants.js';
import { debounce, isMobile } from '../utils.js';

class CardManager {
  constructor() {
    this.wrappers = [];
    this.initialized = false;
  }

  /**
   * Initialize the card manager
   */
  init() {
    if (this.initialized) return;
    
    this.wrappers = Array.from(document.querySelectorAll('.project-wrapper'));
    
    if (this.wrappers.length === 0) {
      console.warn('CardManager: No project wrappers found');
      return;
    }

    this.updateAllCards();
    
    // Use debounced resize handler for better performance
    const debouncedUpdate = debounce(() => this.updateAllCards(), 150);
    window.addEventListener('resize', debouncedUpdate);
    
    this.initialized = true;
  }

  /**
   * Update all project card widths and image scales
   */
  updateAllCards() {
    this.wrappers.forEach(wrapper => this.updateCard(wrapper));
  }

  /**
   * Update a single card's width and image scaling
   * @param {HTMLElement} wrapper - The project wrapper element
   */
  updateCard(wrapper) {
    const card = wrapper.querySelector('.project-card');
    if (!card) return;

    const cardWidth = card.offsetWidth;
    wrapper.style.setProperty('--card-width', `${cardWidth}px`);

    // Calculate image scale based on available space
    const imageScale = this.calculateImageScale(cardWidth);
    wrapper.style.setProperty('--image-scale', imageScale);
  }

  /**
   * Calculate appropriate image scale based on viewport and card width
   * @param {number} cardWidth - Width of the project card
   * @returns {string} Scale factor as string
   */
  calculateImageScale(cardWidth) {
    const viewportWidth = window.innerWidth;
    const { edgeGap, imageWidth, minImageScale } = CARD_CONFIG;
    
    // Calculate available space on each side
    const availableSpace = (viewportWidth - cardWidth) / 2 - edgeGap - imageWidth;
    
    // If images would overflow, scale them down
    if (availableSpace < 0) {
      const maxImageWidth = (viewportWidth - cardWidth) / 2 - edgeGap * 2;
      const scale = Math.max(minImageScale, maxImageWidth / imageWidth);
      return scale.toString();
    }
    
    return '1';
  }

  /**
   * Manually trigger card update (useful for dynamic content)
   */
  refresh() {
    this.updateAllCards();
  }
}

// Create singleton instance
const cardManager = new CardManager();

// Export both the instance and the class
export default cardManager;
export { CardManager };
