/**
 * Dynamic Shadows Module
 * Handles cursor-based lighting and shadow effects
 */

import { SHADOW_CONFIG } from '../constants.js';
import { getElementCenter, calculateVector, normalizeVector, isMobile } from '../utils.js';

class DynamicShadows {
  constructor() {
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.cards = [];
    this.images = [];
    this.initialized = false;
  }

  /**
   * Initialize dynamic shadow system
   */
  init() {
    if (this.initialized) return;

    // Disable on mobile for performance
    if (isMobile()) {
      console.log('DynamicShadows: Disabled on mobile');
      return;
    }

    this.cards = Array.from(document.querySelectorAll('.project-card'));
    this.images = Array.from(document.querySelectorAll('.project-image, .fyp-flower-image'));
    
    // Add contact form to dynamic shadows
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
      this.cards.push(contactForm);
    }

    if (this.cards.length === 0 && this.images.length === 0) {
      console.warn('DynamicShadows: No elements found');
      return;
    }

    this.setupEventListeners();
    this.updateAll();
    
    this.initialized = true;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateAll();
    });

    // Update on window resize
    window.addEventListener('resize', () => this.updateAll());
  }

  /**
   * Update all elements
   */
  updateAll() {
    this.cards.forEach(card => this.updateCardShadow(card));
    this.images.forEach(image => this.updateImageShadow(image));
  }

  /**
   * Update shadow for a single card
   * @param {HTMLElement} card - The card element
   */
  updateCardShadow(card) {
    const center = getElementCenter(card);
    const vector = calculateVector(this.mouseX, this.mouseY, center.x, center.y);
    
    if (vector.distance === 0) {
      this.setDefaultCardShadow(card);
      return;
    }

    const config = SHADOW_CONFIG.card;
    const shadowData = this.calculateShadowProperties(
      vector,
      config.maxShadowDistance,
      config.minBlur,
      config.maxBlur,
      config.minOpacity,
      config.maxOpacity,
      config.maxGlowOpacity,
      config.lightSourceDistance
    );

    // Apply CSS custom properties
    card.style.setProperty('--shadow-x', `${shadowData.offsetX}px`);
    card.style.setProperty('--shadow-y', `${shadowData.offsetY}px`);
    card.style.setProperty('--shadow-blur', `${shadowData.blur}px`);
    card.style.setProperty('--shadow-spread', `${config.shadowSpread}px`);
    card.style.setProperty('--shadow-opacity', shadowData.opacity);
    card.style.setProperty('--glow-opacity', shadowData.glow);
    
    // Calculate light angle for gradient glow
    const angle = Math.atan2(-vector.deltaY, -vector.deltaX) * (180 / Math.PI);
    card.style.setProperty('--light-angle', `${angle}deg`);
  }

  /**
   * Update shadow for a single image
   * @param {HTMLElement} image - The image element
   */
  updateImageShadow(image) {
    const center = getElementCenter(image);
    const vector = calculateVector(this.mouseX, this.mouseY, center.x, center.y);
    
    if (vector.distance === 0) {
      this.setDefaultImageShadow(image);
      return;
    }

    const config = SHADOW_CONFIG.image;
    const shadowData = this.calculateShadowProperties(
      vector,
      config.maxShadowDistance,
      config.minBlur,
      config.maxBlur,
      config.minOpacity,
      config.maxOpacity,
      config.maxGlowOpacity,
      config.lightSourceDistance
    );

    // Apply CSS custom properties to images
    image.style.setProperty('--img-shadow-x', `${shadowData.offsetX}px`);
    image.style.setProperty('--img-shadow-y', `${shadowData.offsetY}px`);
    image.style.setProperty('--img-shadow-blur', `${shadowData.blur}px`);
    image.style.setProperty('--img-shadow-opacity', shadowData.opacity);
    image.style.setProperty('--img-glow-opacity', shadowData.glow);
    
    // Calculate light angle
    const angle = Math.atan2(-vector.deltaY, -vector.deltaX) * (180 / Math.PI);
    image.style.setProperty('--img-light-angle', `${angle}deg`);
  }

  /**
   * Calculate shadow properties based on cursor distance
   * @param {Object} vector - Vector from cursor to element
   * @param {number} maxDistance - Maximum shadow offset
   * @param {number} minBlur - Minimum blur radius
   * @param {number} maxBlur - Maximum blur radius
   * @param {number} minOpacity - Minimum shadow opacity
   * @param {number} maxOpacity - Maximum shadow opacity
   * @param {number} maxGlow - Maximum glow opacity
   * @param {Object} lightDistance - Light source distance thresholds
   * @returns {Object} Shadow property values
   */
  calculateShadowProperties(vector, maxDistance, minBlur, maxBlur, minOpacity, maxOpacity, maxGlow, lightDistance) {
    const normalized = normalizeVector(vector.deltaX, vector.deltaY, vector.distance);
    
    // Shadow intensity based on distance (closer = stronger)
    const intensity = Math.min(1, 800 / vector.distance);
    
    // Shadow offset - element casts shadow away from cursor (light source)
    const offsetX = normalized.x * maxDistance * intensity;
    const offsetY = normalized.y * maxDistance * intensity;
    
    // Shadow blur - closer cursor = sharper shadow
    const blurRange = maxBlur - minBlur;
    const blur = maxBlur - (blurRange * intensity);
    
    // Shadow opacity - closer cursor = darker shadow
    const opacityRange = maxOpacity - minOpacity;
    const opacity = minOpacity + (opacityRange * intensity);
    
    // Glow effect on the side facing the cursor
    const glowIntensity = Math.min(1, 600 / vector.distance);
    const glow = glowIntensity * maxGlow;
    
    return { offsetX, offsetY, blur, opacity, glow };
  }

  /**
   * Set default shadow values for a card
   * @param {HTMLElement} card - The card element
   */
  setDefaultCardShadow(card) {
    card.style.setProperty('--shadow-x', '0px');
    card.style.setProperty('--shadow-y', '20px');
    card.style.setProperty('--shadow-blur', '40px');
    card.style.setProperty('--shadow-spread', '0px');
    card.style.setProperty('--shadow-opacity', '0.5');
    card.style.setProperty('--glow-opacity', '0.15');
  }

  /**
   * Set default shadow values for an image
   * @param {HTMLElement} image - The image element
   */
  setDefaultImageShadow(image) {
    image.style.setProperty('--img-shadow-x', '0px');
    image.style.setProperty('--img-shadow-y', '15px');
    image.style.setProperty('--img-shadow-blur', '30px');
    image.style.setProperty('--img-shadow-opacity', '0.4');
    image.style.setProperty('--img-glow-opacity', '0.2');
  }
}

// Create singleton instance
const dynamicShadows = new DynamicShadows();

// Export both the instance and the class
export default dynamicShadows;
export { DynamicShadows };
