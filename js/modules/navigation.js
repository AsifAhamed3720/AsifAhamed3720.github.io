/**
 * Navigation Module
 * Fixed navigation, mobile menu and smooth scrolling. While reading, one
 * underline glides to the section on screen (or to the link being pointed
 * at), and a hairline along the bar's bottom edge shows reading progress.
 */

import { prefersReducedMotion } from '../utils.js';

const SCROLLED_AT = 100;  // px scrolled before the bar takes its solid background
const READ_LINE = 0.35;   // a section is current once its top passes 35% down the viewport

class Navigation {
  constructor() {
    this.nav = null;
    this.mobileMenuToggle = null;
    this.mobileMenu = null;
    this.progressBar = null;
    this.indicator = null;
    this.links = [];      // in-page desktop links, in page order
    this.sections = [];   // the section each link points to
    this.current = null;  // link of the section being read
    this.pointing = null; // link under the pointer or keyboard focus
    this.frame = null;
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

    this.progressBar = this.nav.querySelector('.nav-progress');
    this.indicator = this.nav.querySelector('.nav-ind');
    this.links = Array.from(this.nav.querySelectorAll('.nav-links .nav-link[href^="#"]'))
      .filter(link => document.querySelector(link.getAttribute('href')));
    this.sections = this.links.map(link => document.querySelector(link.getAttribute('href')));

    this.setupScrollEffect();
    this.setupIndicator();
    this.setupMobileMenu();
    this.setupSmoothScroll();

    this.initialized = true;
  }

  /**
   * Scroll state, read once per frame: solid bar, progress, current section
   */
  setupScrollEffect() {
    const update = () => {
      this.frame = null;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      this.nav.classList.toggle('scrolled', y > SCROLLED_AT);
      if (this.progressBar) {
        this.progressBar.style.setProperty('--sp', max > 0 ? Math.min(y / max, 1).toFixed(4) : '0');
      }
      this.setCurrent(this.findCurrent(y, max));
    };

    const schedule = () => {
      if (!this.frame) this.frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', () => {
      schedule();
      this.moveIndicator(this.pointing || this.current, false);
    });
    update();
  }

  /**
   * The link of the last section whose top has passed the reading line
   */
  findCurrent(y, max) {
    // at the very bottom the last section counts even if it is too short
    // for its top to reach the line
    if (max > 0 && max - y < 4) return this.links[this.links.length - 1] || null;

    const line = window.innerHeight * READ_LINE;
    let current = null;
    this.sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= line) current = this.links[i];
    });
    return current;
  }

  setCurrent(link) {
    if (link === this.current) return;
    this.current?.classList.remove('is-current');
    this.current?.removeAttribute('aria-current');
    this.current = link;
    link?.classList.add('is-current');
    link?.setAttribute('aria-current', 'true');
    if (!this.pointing) this.moveIndicator(link);
  }

  /**
   * The underline follows the pointer or focus, and returns to the current
   * section when it leaves the links
   */
  setupIndicator() {
    if (!this.indicator || this.links.length === 0) return;

    this.links.forEach(link => {
      const point = () => { this.pointing = link; this.moveIndicator(link); };
      link.addEventListener('mouseenter', point);
      link.addEventListener('focus', point);
      link.addEventListener('blur', () => this.release());
    });
    this.links[0].parentElement.addEventListener('mouseleave', () => this.release());

    // link widths change once the web fonts arrive
    if (document.fonts) document.fonts.ready.then(() => this.moveIndicator(this.current, false));
  }

  release() {
    this.pointing = null;
    this.moveIndicator(this.current);
  }

  /**
   * Slide the underline under a link, or fade it out when there is none.
   * When it was hidden it appears in place instead of sliding in from
   * wherever it last was.
   * @param {HTMLElement|null} link - Link to underline
   * @param {boolean} animate - Slide, rather than jump, to the new link
   */
  moveIndicator(link, animate = true) {
    const ind = this.indicator;
    if (!ind) return;

    if (!link || link.offsetWidth === 0) {
      ind.style.opacity = '0';
      return;
    }

    const jump = !animate || ind.style.opacity !== '1';
    if (jump) ind.style.transition = 'opacity .3s ease';

    ind.style.width = link.offsetWidth + 'px';
    ind.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop + link.offsetHeight}px)`;
    ind.style.opacity = '1';

    if (jump) {
      void ind.offsetWidth; // commit the jump before the transitions return
      ind.style.transition = '';
    }
  }

  /**
   * Setup mobile menu toggle
   */
  setupMobileMenu() {
    if (!this.mobileMenuToggle || !this.mobileMenu) return;

    const setOpen = open => {
      this.mobileMenu.classList.toggle('active', open);
      this.mobileMenuToggle.classList.toggle('active', open);
      this.mobileMenuToggle.setAttribute('aria-expanded', String(open));
    };
    setOpen(false);

    this.mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!this.mobileMenu.classList.contains('active'));
    });

    // Close when clicking outside, pressing Escape, or following a link
    document.addEventListener('click', (e) => {
      if (this.mobileMenu.classList.contains('active') &&
          !this.mobileMenu.contains(e.target) &&
          !this.mobileMenuToggle.contains(e.target)) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.mobileMenu.classList.contains('active')) {
        setOpen(false);
        this.mobileMenuToggle.focus();
      }
    });

    this.mobileMenu.querySelectorAll('.mobile-menu-link').forEach(link => {
      link.addEventListener('click', () => setOpen(false));
    });
  }

  /**
   * Smooth scrolling for in-page links in the nav, mobile menu, hero,
   * footer and flagship block. scroll-padding-top in base.css keeps
   * headings clear of the fixed bar.
   */
  setupSmoothScroll() {
    const selector = '.nav-link[href^="#"], .mobile-menu-link[href^="#"], .cta-primary[href^="#"], .cta-secondary[href^="#"], .scroll-cue[href^="#"], .footer-links a[href^="#"], .flagship a[href^="#"]';

    document.querySelectorAll(selector).forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }
}

// Create singleton instance
const navigation = new Navigation();

export default navigation;
export { Navigation };
