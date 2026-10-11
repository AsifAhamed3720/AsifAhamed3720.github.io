/**
 * Main Application Entry Point
 * Stages the page while the loading screen covers it, then starts every
 * module once the intro lifts.
 */

import { FEATURES } from './constants.js';
import cardManager from './modules/card-manager.js';
import lightbox from './modules/lightbox.js';
import cardTilt from './modules/card-tilt.js';
import dynamicShadows from './modules/dynamic-shadows.js';
import navigation from './modules/navigation.js';
import themeToggle from './modules/theme-toggle.js';
import loadingScreen from './modules/loading-screen.js';
import scrollAnimations from './modules/scroll-animations.js';
import scrollToTop from './modules/scroll-to-top.js';
import cursorGlow from './modules/cursor-glow.js';
import pointerEffects from './modules/pointer-effects.js';
import projectFilters from './modules/project-filters.js';
import waterRipple from './modules/water-ripple.js';
import contactForm from './modules/contact-form.js';
import starfield from './modules/starfield.js';
import helixProjects from './modules/helix-projects.js';
import meshViewer from './modules/mesh-viewer.js';
import crawlerDemo from './modules/crawler-demo.js';

/**
 * Start order. `flag` names a switch in FEATURES; modules without one always
 * start. Reveals arm before the helix takes over the projects column, and the
 * filters bind before the helix mirrors them.
 */
const MODULES = [
  { name: 'Card Manager', module: cardManager },
  { name: 'Lightbox', module: lightbox },
  { name: 'Card Tilt', module: cardTilt, flag: 'cardTilt' },
  { name: 'Dynamic Shadows', module: dynamicShadows, flag: 'dynamicShadows' },
  { name: 'Navigation', module: navigation },
  { name: 'Theme Toggle', module: themeToggle },
  { name: 'Scroll Animations', module: scrollAnimations },
  { name: 'Scroll to Top', module: scrollToTop },
  { name: 'Cursor Glow', module: cursorGlow, flag: 'cursorGlow' },
  { name: 'Pointer Effects', module: pointerEffects, flag: 'pointerEffects' },
  { name: 'Project Filters', module: projectFilters },
  { name: 'Helix Projects', module: helixProjects },
  { name: 'Mesh Viewer', module: meshViewer },     // loads on approach
  { name: 'Crawler Demo', module: crawlerDemo },   // loads on approach
  { name: 'Water Ripple', module: waterRipple, flag: 'waterRipple' },
  { name: 'Contact Form', module: contactForm },
  { name: 'Starfield', module: starfield, flag: 'starfield' }
];

/**
 * Initialize all application modules. Each starts on its own, so one that
 * throws cannot stop the rest (or leave reveal states waiting forever).
 */
function initializeApp() {
  MODULES.forEach(({ name, module, flag }) => {
    if (flag && !FEATURES[flag]) return;
    try {
      module.init();
    } catch (err) {
      console.error(`${name} failed to start:`, err);
    }
  });
  console.log('✨ Portfolio ready!');
}

// Split text and switch reveal states on now, while the loading screen
// still hides the page, so nothing visibly reflows when it lifts.
try {
  scrollAnimations.prepare();
} catch (err) {
  console.error('Scroll Animations failed to prepare:', err);
  document.documentElement.classList.remove('motion-ready');
}

/**
 * Start when everything has loaded so the loading screen shows properly
 */
window.addEventListener('load', () => {
  // Always scroll to top on page load
  window.scrollTo(0, 0);

  // The loading screen starts the other modules once it has lifted
  loadingScreen.init(initializeApp);
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
  pointerEffects,
  projectFilters,
  waterRipple,
  contactForm,
  starfield,
  helixProjects,
  meshViewer,
  crawlerDemo
};
