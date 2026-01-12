/**
 * Scroll to Top Module
 * Handles scroll-to-top button functionality
 */

class ScrollToTop {
  constructor() {
    this.scrollBtn = null;
    this.initialized = false;
  }

  /**
   * Initialize scroll to top button
   */
  init() {
    if (this.initialized) return;

    this.scrollBtn = document.getElementById('scroll-to-top');

    if (!this.scrollBtn) {
      console.warn('ScrollToTop: Button not found');
      return;
    }

    this.setupScrollListener();
    this.setupClickHandler();

    this.initialized = true;
  }

  /**
   * Show/hide button based on scroll position
   */
  setupScrollListener() {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        this.scrollBtn.classList.add('visible');
      } else {
        this.scrollBtn.classList.remove('visible');
      }
    });
  }

  /**
   * Scroll to top when button is clicked
   */
  setupClickHandler() {
    this.scrollBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// Create singleton instance
const scrollToTop = new ScrollToTop();

export default scrollToTop;
export { ScrollToTop };
