/**
 * Navigation Module
 * Handles fixed navigation, mobile menu, and smooth scrolling
 */

class Navigation {
  constructor() {
    this.nav = null;
    this.mobileMenuToggle = null;
    this.mobileMenu = null;
    this.initialized = false;
  }

  /**
   * Initialize navigation
   */
  init() {
    if (this.initialized) return;

    this.nav = document.getElementById('main-nav');
    this.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    this.mobileMenu = document.getElementById('mobile-menu');

    if (!this.nav) {
      console.warn('Navigation: Main nav not found');
      return;
    }

    this.setupScrollEffect();
    this.setupMobileMenu();
    this.setupSmoothScroll();

    this.initialized = true;
  }

  /**
   * Add scrolled class to nav on scroll
   */
  setupScrollEffect() {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        this.nav.classList.add('scrolled');
      } else {
        this.nav.classList.remove('scrolled');
      }
    });
  }

  /**
   * Setup mobile menu toggle
   */
  setupMobileMenu() {
    if (!this.mobileMenuToggle || !this.mobileMenu) return;

    // Toggle mobile menu
    this.mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mobileMenu.classList.toggle('active');
      this.mobileMenuToggle.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.mobileMenu.classList.contains('active') && 
          !this.mobileMenu.contains(e.target) && 
          !this.mobileMenuToggle.contains(e.target)) {
        this.mobileMenu.classList.remove('active');
        this.mobileMenuToggle.classList.remove('active');
      }
    });

    // Close mobile menu when clicking a link
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
    mobileMenuLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.mobileMenu.classList.remove('active');
        this.mobileMenuToggle.classList.remove('active');
      });
    });
  }

  /**
   * Setup smooth scrolling for nav links
   */
  setupSmoothScroll() {
    // Desktop nav links
    const navLinks = document.querySelectorAll('.nav-link:not(.cta-button)');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Mobile menu links (non-CV links)
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
    mobileMenuLinks.forEach(link => {
      if (!link.getAttribute('href').includes('.pdf')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href');
          const targetSection = document.querySelector(targetId);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    });

    // Hero CTAs
    document.querySelectorAll('.cta-primary, .cta-secondary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
}

// Create singleton instance
const navigation = new Navigation();

export default navigation;
export { Navigation };
