/**
 * Utility Functions
 * Shared helpers used across modules
 */

/**
 * Calculate the center point of an element
 * @param {HTMLElement} element - The DOM element
 * @returns {{x: number, y: number}} Center coordinates
 */
export function getElementCenter(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

/**
 * Calculate vector from point A to point B
 * @param {number} x1 - Point A x-coordinate
 * @param {number} y1 - Point A y-coordinate
 * @param {number} x2 - Point B x-coordinate
 * @param {number} y2 - Point B y-coordinate
 * @returns {{deltaX: number, deltaY: number, distance: number}} Vector data
 */
export function calculateVector(x1, y1, x2, y2) {
  const deltaX = x2 - x1;
  const deltaY = y2 - y1;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  return { deltaX, deltaY, distance };
}

/**
 * Normalize a vector to unit length
 * @param {number} deltaX - X component
 * @param {number} deltaY - Y component
 * @param {number} distance - Vector magnitude
 * @returns {{x: number, y: number}} Normalized vector
 */
export function normalizeVector(deltaX, deltaY, distance) {
  if (distance === 0) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: deltaX / distance,
    y: deltaY / distance
  };
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
export function isMobile() {
  return window.innerWidth <= 1024;
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if reduced motion preferred
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
