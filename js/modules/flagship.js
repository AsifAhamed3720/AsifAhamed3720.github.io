/**
 * Flagship Module
 * The "For learners / For educators" switch in the Smart Student Blueprint
 * section: a two-tab control whose block slides to the selected tab, with
 * arrow-key support. The newly shown steps animate in through
 * scroll-animations.js, which treats a panel coming out of `hidden` like any
 * element arriving on screen.
 */

import { placeSlider } from '../utils.js';

class Flagship {
  constructor() {
    this.tablist = null;
    this.tabs = [];
    this.slider = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    this.tablist = document.querySelector('.fs-tabs');
    this.tabs = Array.from(document.querySelectorAll('.fs-tab'));
    this.slider = this.tablist?.querySelector('.fs-tab-ind') || null;
    if (this.tabs.length === 0) return;

    this.tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => this.select(tab));
      tab.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        let next = null;
        if (step) next = this.tabs[(i + step + this.tabs.length) % this.tabs.length];
        else if (e.key === 'Home') next = this.tabs[0];
        else if (e.key === 'End') next = this.tabs[this.tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        this.select(next);
        next.focus();
      });
    });

    if (this.slider) {
      const place = () => placeSlider(this.slider, this.current(), false);
      place();
      this.tablist.classList.add('has-ind');
      window.addEventListener('resize', place);
      if (document.fonts) document.fonts.ready.then(place);
    }

    this.initialized = true;
  }

  current() {
    return this.tabs.find(t => t.getAttribute('aria-selected') === 'true') || this.tabs[0];
  }

  /**
   * Show one audience's steps and hide the other's
   * @param {HTMLElement} tab - The tab to select
   */
  select(tab) {
    this.tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    placeSlider(this.slider, tab);
  }
}

// Create singleton instance
const flagship = new Flagship();

export default flagship;
export { Flagship };
