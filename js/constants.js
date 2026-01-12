/**
 * Application Constants
 * Centralized configuration values
 */

// Breakpoints for responsive design
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024
};

// Card layout configuration
export const CARD_CONFIG = {
  imageWidth: 220,      // matches CSS var(--proj-img-w)
  edgeGap: 48,          // matches CSS var(--edge-gap)
  minImageScale: 0.4    // minimum scale factor for images
};

// Shadow system configuration
export const SHADOW_CONFIG = {
  card: {
    maxShadowDistance: 50,
    minBlur: 15,
    maxBlur: 60,
    shadowSpread: -5,
    minOpacity: 0.2,
    maxOpacity: 0.7,
    maxGlowOpacity: 0.25,
    lightSourceDistance: {
      close: 400,
      medium: 800
    }
  },
  image: {
    maxShadowDistance: 40,
    minBlur: 12,
    maxBlur: 50,
    minOpacity: 0.3,
    maxOpacity: 0.7,
    maxGlowOpacity: 0.4,
    lightSourceDistance: {
      close: 500,
      medium: 700
    }
  }
};

// Tilt effect configuration
export const TILT_CONFIG = {
  maxRotationX: 8,      // degrees
  maxRotationY: 8,      // degrees
  translateY: -10,      // pixels
  transitionSpeed: 250  // milliseconds
};

// Feature flags
export const FEATURES = {
  cardTilt: true,
  dynamicShadows: true,
  lightbox: true,
  imageHoverEffects: true,
  cursorGlow: true,
  waterRipple: true
};

// Animation timings (in milliseconds)
export const TRANSITIONS = {
  fast: 150,
  medium: 250,
  slow: 600
};
