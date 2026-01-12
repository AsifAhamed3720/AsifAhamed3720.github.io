/**
 * Loading Screen Module
 * Displays animated loading screen with progress bar
 */

class LoadingScreen {
  constructor() {
    this.loadingScreen = null;
    this.progress = null;
    this.initialized = false;
  }

  /**
   * Initialize loading screen with callback when complete
   * @param {Function} onComplete - Callback to run after loading completes
   */
  init(onComplete) {
    if (this.initialized) return;

    this.loadingScreen = document.getElementById('loading-screen');
    this.progress = document.querySelector('.loading-progress');

    if (!this.loadingScreen || !this.progress) {
      console.warn('LoadingScreen: Elements not found');
      // If loading screen doesn't exist, just run callback immediately
      if (onComplete) onComplete();
      return;
    }

    this.startLoadingAnimation(onComplete);
    this.initialized = true;
  }

  /**
   * Animate loading progress bar
   * @param {Function} onComplete - Callback after animation completes
   */
  startLoadingAnimation(onComplete) {
    let loadProgress = 0;
    const interval = setInterval(() => {
      loadProgress += Math.random() * 30;
      if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(interval);
        
        // Update progress bar
        this.progress.style.width = loadProgress + '%';
        
        // Fade out loading screen after a brief delay
        setTimeout(() => {
          this.loadingScreen.style.opacity = '0';
          setTimeout(() => {
            this.loadingScreen.style.display = 'none';
            document.body.classList.remove('loading');
            
            // Start hero animation AFTER loading screen is done
            this.startHeroAnimation();
            
            // Run main app initialization callback
            if (onComplete) onComplete();
          }, 500);
        }, 300);
      } else {
        this.progress.style.width = loadProgress + '%';
      }
    }, 100);
  }

  /**
   * Start hero title reveal animation
   */
  startHeroAnimation() {
    const heroTitle = document.querySelector('.hero-title .gradient-text');
    if (heroTitle) {
      // Trigger the wipe reveal animation
      heroTitle.classList.add('hero-reveal');
    }
  }
}

// Create singleton instance
const loadingScreen = new LoadingScreen();

export default loadingScreen;
export { LoadingScreen };
