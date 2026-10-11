/**
 * Project Filters Module
 * Filters project cards by category. The filter bar is a segmented control:
 * one block (.filter-ind) slides under the active button.
 */

const FADE_MS = 300; // matches the card fade before a filtered-out card leaves the flow

class ProjectFilters {
  constructor() {
    this.container = null;
    this.indicator = null;
    this.filterBtns = [];
    this.projects = [];
    this.timers = new WeakMap(); // pending show/hide per card
    this.initialized = false;
  }

  /**
   * Initialize project filters
   */
  init() {
    if (this.initialized) return;

    this.container = document.querySelector('.filter-container');
    this.indicator = this.container?.querySelector('.filter-ind') || null;
    this.filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
    this.projects = Array.from(document.querySelectorAll('.project-wrapper'));

    if (this.filterBtns.length === 0 || this.projects.length === 0) {
      console.warn('ProjectFilters: Elements not found');
      return;
    }

    this.setupFilterButtons();
    this.setupIndicator();

    this.initialized = true;
  }

  get activeBtn() {
    return this.filterBtns.find(btn => btn.classList.contains('active')) || this.filterBtns[0];
  }

  /**
   * Setup click handlers for filter buttons
   */
  setupFilterButtons() {
    this.filterBtns.forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));

      btn.addEventListener('click', () => {
        this.filterBtns.forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        this.placeIndicator(btn);
        this.filterProjects(btn.dataset.filter);
      });
    });
  }

  /**
   * Place the sliding block under the active button, and again whenever
   * the buttons may have moved (fonts arriving, wrapping on resize)
   */
  setupIndicator() {
    if (!this.indicator) return;

    this.placeIndicator(this.activeBtn, false);
    this.container.classList.add('has-ind');

    window.addEventListener('resize', () => this.placeIndicator(this.activeBtn, false));
    if (document.fonts) document.fonts.ready.then(() => this.placeIndicator(this.activeBtn, false));
  }

  /**
   * @param {HTMLElement} btn - Button to sit under
   * @param {boolean} animate - Slide there, rather than jump
   */
  placeIndicator(btn, animate = true) {
    const ind = this.indicator;
    if (!ind || !btn) return;

    if (!animate) ind.style.transition = 'none';
    ind.style.width = btn.offsetWidth + 'px';
    ind.style.height = btn.offsetHeight + 'px';
    ind.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
    ind.style.opacity = '1';
    if (!animate) {
      void ind.offsetWidth; // commit the jump before the transitions return
      ind.style.transition = '';
    }
  }

  /**
   * Filter projects based on selected category
   * @param {string} filter - Category to filter by ('all' or specific category)
   */
  filterProjects(filter) {
    this.projects.forEach(project => {
      // a quick second click must not let an earlier hide land late
      clearTimeout(this.timers.get(project));

      if (filter === 'all' || project.dataset.category === filter) {
        project.style.display = 'block';
        this.timers.set(project, setTimeout(() => project.classList.add('visible'), 50));
      } else {
        project.classList.remove('visible');
        this.timers.set(project, setTimeout(() => { project.style.display = 'none'; }, FADE_MS));
      }
    });
  }
}

// Create singleton instance
const projectFilters = new ProjectFilters();

export default projectFilters;
export { ProjectFilters };
