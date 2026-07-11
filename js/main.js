/**
 * Main Application Entry Point
 * Complete portfolio functionality with ALL original features
 */

import { FEATURES } from './constants.js';
import cardManager from './modules/card-manager.js';
import lightbox from './modules/lightbox.js';
import cardTilt from './modules/card-tilt.js';
import dynamicShadows from './modules/dynamic-shadows.js';

// NEW: Import all additional modules for complete functionality
import navigation from './modules/navigation.js';
import themeToggle from './modules/theme-toggle.js';
import loadingScreen from './modules/loading-screen.js';
import scrollAnimations from './modules/scroll-animations.js';
import scrollToTop from './modules/scroll-to-top.js';
import cursorGlow from './modules/cursor-glow.js';
import projectFilters from './modules/project-filters.js';
import waterRipple from './modules/water-ripple.js';
import contactForm from './modules/contact-form.js';
import starfield from './modules/starfield.js';
import helixProjects from './modules/helix-projects.js';
import meshViewer from './modules/mesh-viewer.js';
import crawlerDemo from './modules/crawler-demo.js';

/**
 * Initialize all application modules
 */
function initializeApp() {
  console.log('🚀 Portfolio initializing...');

  // Core functionality - always load
  cardManager.init();
  console.log('✅ Card Manager initialized');

  lightbox.init();
  console.log('✅ Lightbox initialized');

  // Feature-flagged modules
  if (FEATURES.cardTilt) {
    cardTilt.init();
    console.log('✅ Card Tilt initialized');
  }

  if (FEATURES.dynamicShadows) {
    dynamicShadows.init();
    console.log('✅ Dynamic Shadows initialized');
  }

  // NEW: Initialize all additional features
  navigation.init();
  console.log('✅ Navigation initialized');

  themeToggle.init();
  console.log('✅ Theme Toggle initialized');

  scrollAnimations.init();
  console.log('✅ Scroll Animations initialized');

  scrollToTop.init();
  console.log('✅ Scroll to Top initialized');

  if (FEATURES.cursorGlow) {
    cursorGlow.init();
    console.log('✅ Cursor Glow initialized');
  }

  projectFilters.init();
  console.log('✅ Project Filters initialized');

  helixProjects.init();
  console.log('✅ Helix Projects initialized');

  meshViewer.init();
  console.log('✅ Mesh Viewer armed (loads on approach)');

  crawlerDemo.init();
  console.log('✅ Crawler Demo armed (loads on approach)');

  if (FEATURES.waterRipple) {
    waterRipple.init();
    console.log('✅ Water Ripple initialized');
  }

  contactForm.init();
  console.log('✅ Contact Form initialized');

  if (FEATURES.starfield) {
    starfield.init();
  }

  console.log('✨ Portfolio ready!');
}

/**
 * Initialize when DOM is ready
 * Use window.load to ensure loading screen shows properly
 */
window.addEventListener('load', () => {
  // Always scroll to top on page load
  window.scrollTo(0, 0);
  
  // Initialize loading screen FIRST (it will trigger other inits after completion)
  loadingScreen.init(initializeApp);
  console.log('✅ Loading Screen started');
});

// Also handle resize
window.addEventListener('resize', () => {
  cardManager.updateAllCards();
});

// Export for manual control if needed
export { 
  initializeApp, 
  cardManager, 
  lightbox, 
  cardTilt, 
  dynamicShadows,
  navigation,
  themeToggle,
  loadingScreen,
  scrollAnimations,
  scrollToTop,
  cursorGlow,
  projectFilters,
  waterRipple,
  contactForm,
  starfield,
  helixProjects,
  meshViewer,
  crawlerDemo
};
