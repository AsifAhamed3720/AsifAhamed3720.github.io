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
      const y = window.pageYOffset;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollBtn.classList.toggle('visible', y > 300);
      // the bar along the button's edge (scroll-to-top.css) shows progress
      this.scrollBtn.style.setProperty('--sp', max > 0 ? Math.min(y / max, 1).toFixed(4) : '0');
    }, { passive: true });
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
