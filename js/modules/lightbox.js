/**
 * Lightbox Module
 * Handles image lightbox functionality for all project images
 */

class Lightbox {
  constructor() {
    this.lightbox = null;
    this.lightboxImg = null;
    this.closeBtn = null;
    this.initialized = false;
  }

  /**
   * Initialize the lightbox
   */
  init() {
    if (this.initialized) return;

    this.lightbox = document.getElementById('lightbox');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.closeBtn = document.querySelector('.lightbox-close');

    if (!this.lightbox || !this.lightboxImg || !this.closeBtn) {
      console.warn('Lightbox: Required elements not found');
      return;
    }

    this.setupEventListeners();
    this.initialized = true;
  }

  /**
   * Set up all event listeners for lightbox functionality
   */
  setupEventListeners() {
    // Add click listeners to ALL project images (regular AND FYP flower images)
    document.querySelectorAll('.project-image, .fyp-flower-image').forEach(img => {
      img.addEventListener('click', (e) => this.openLightbox(e, img));
    });

    // Close button
    this.closeBtn.addEventListener('click', () => this.close());

    // Click outside to close
    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) {
        this.close();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  /**
   * Open the lightbox with specified image
   * @param {Event} e - Click event
   * @param {HTMLImageElement} img - Image element to display
   */
  openLightbox(e, img) {
    e.stopPropagation();
    
    this.lightbox.style.display = 'flex';
    this.lightboxImg.src = img.src;
    this.lightboxImg.alt = img.alt;
    
    // Prevent page scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the lightbox
   */
  close() {
    this.lightbox.style.display = 'none';
    
    // Restore page scrolling
    document.body.style.overflow = '';
  }

  /**
   * Check if lightbox is currently open
   * @returns {boolean} True if lightbox is open
   */
  isOpen() {
    return this.lightbox && this.lightbox.style.display === 'flex';
  }
}

// Create singleton instance
const lightbox = new Lightbox();

// Export both the instance and the class
export default lightbox;
export { Lightbox };
