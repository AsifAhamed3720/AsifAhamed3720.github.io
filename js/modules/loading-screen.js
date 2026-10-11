/**
 * Loading Screen Module
 * A short intro while the fonts load: the constellation mark draws itself,
 * then the screen lifts away. It waits for real readiness (fonts) rather
 * than a timer, is capped so it never holds the page long, and is skipped
 * on repeat visits within the same browser session.
 */

const MIN_INTRO_MS = 900;   // long enough for the mark to finish drawing
const MAX_INTRO_MS = 1400;  // never hold the page longer than this
const SEEN_KEY = 'intro-seen';

class LoadingScreen {
  constructor() {
    this.loadingScreen = null;
    this.initialized = false;
  }

  /**
   * Initialize loading screen with callback when complete
   * @param {Function} onComplete - Callback to run after the intro has lifted
   */
  init(onComplete) {
    if (this.initialized) return;
    this.initialized = true;

    this.loadingScreen = document.getElementById('loading-screen');
    if (!this.loadingScreen) {
      document.documentElement.classList.add('intro-done');
      document.body.classList.remove('loading');
      if (onComplete) onComplete();
      return;
    }

    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { /* storage unavailable */ }

    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const minDelay = new Promise(resolve => setTimeout(resolve, seen ? 0 : MIN_INTRO_MS));
    const cap = new Promise(resolve => setTimeout(resolve, MAX_INTRO_MS));

    Promise.race([Promise.all([fontsReady, minDelay]), cap]).then(() => {
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage unavailable */ }
      this.hide(onComplete, seen);
    });
  }

  /**
   * Lift the screen, release the page and hand over to the app
   * @param {Function} onComplete - Callback after the screen is gone
   * @param {boolean} instant - Skip the exit transition (repeat visit)
   */
  hide(onComplete, instant) {
    // the hero entrance (css/components/motion.css) plays as the screen lifts
    document.documentElement.classList.add('intro-done');

    const finish = () => {
      this.loadingScreen.style.display = 'none';
      document.body.classList.remove('loading');
      if (onComplete) onComplete();
    };
    if (instant) { finish(); return; }
    this.loadingScreen.classList.add('is-leaving');
    setTimeout(finish, 600);
  }
}

// Create singleton instance
const loadingScreen = new LoadingScreen();

export default loadingScreen;
export { LoadingScreen };
