/**
 * Scroll Animations Module
 * Reveals the page as it is read, in both directions. Text is never removed
 * or retyped: headings rise word by word out of a mask, the about paragraph
 * comes into focus, path labels decode, blocks slide in, and the one hard
 * metric rolls into place like an odometer.
 *
 * Everything replays: once an element has scrolled fully out of view it is
 * reset out of sight, and it plays again from the side it comes back from,
 * rising from below while scrolling down and dropping in from above while
 * scrolling back up.
 *
 * prepare() runs while the loading screen still covers the page, so every
 * DOM rewrite happens out of sight. init() arms the observers once the intro
 * has lifted. All hidden states live in css/components/motion.css under
 * .motion-ready, which only prepare() adds: if this script never runs, or
 * the reader prefers reduced motion, the page is static and complete.
 */

import { prefersReducedMotion } from '../utils.js';

const HERO_NAME = '.hero-title .gradient-text';
const SPLIT_SELECTOR = '[data-split], ' + HERO_NAME;
const BLOCK_SELECTOR = '.hero-subtitle, .hero-description, .hero-cta, .skill-category-large, ' +
  '.fs-pitch, .fs-devices, .fs-how-head, .fs-step, .fs-stat, .fs-next, ' +
  '.contact-intro, .contact-form, .contact-divider, .contact-links';

const SCRAMBLE_GLYPHS = '#%&*+=<>/_01';
const SCRAMBLE_MS = 650;

// Longest reveal transition in motion.css; after it (plus the stagger) the
// reveal classes are removed so hover styles take over again.
const REVEAL_MS = 1000;
const BLOCK_STAGGER_MS = 110;
const TAG_STAGGER_MS = 35;
const WORD_STAGGER_MS = 70;

// Odometer: each digit spins through extra laps, lower digits spin more.
const ODOMETER_LAPS = 3;

class ScrollAnimations {
  constructor() {
    this.prepared = false;
    this.initialized = false;
    this.timers = new WeakMap(); // one pending follow-up per element
  }

  /**
   * Stage the page under the loading screen: split text into word masks,
   * build the odometers, and switch the reveal states on.
   */
  prepare() {
    if (this.prepared || prefersReducedMotion()) return;
    this.prepared = true;

    document.querySelectorAll(SPLIT_SELECTOR).forEach(el => this.splitWords(el));
    document.querySelectorAll('[data-odometer]').forEach(el => this.buildOdometer(el));

    // the name's first entrance belongs to the intro (html.intro-done);
    // after that it replays like everything else
    document.querySelector(HERO_NAME)?.classList.add('is-in');
    document.documentElement.classList.add('motion-ready');
  }

  /**
   * Arm the observers (runs after the intro has lifted)
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (!this.prepared) return;

    this.setupHeadings();
    this.setupBlocks();
    this.setupProjectFadeIn();
    this.setupOdometers();
  }

  // ── Plumbing ──────────────────────────────────────────────────────────────

  /**
   * Call enter() each time an element scrolls into view, from either
   * direction, and exit() once it has fully left, saying which side it left
   * by, so it can be reset out of sight and replay from that side next time.
   * enter() also gets the element's position among those arriving together,
   * for staggering.
   */
  watch(elements, { enter, exit }, options = {}) {
    const shown = new WeakSet();

    const entering = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting && !shown.has(e.target)).forEach((e, order) => {
        shown.add(e.target);
        enter(e.target, order);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px', ...options });

    const leaving = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting || !shown.has(e.target)) return;
        shown.delete(e.target);
        // a box with no height was hidden (display: none), not scrolled past
        const r = e.boundingClientRect;
        exit(e.target, r.height > 0 && r.bottom <= 0 ? 'above' : 'below');
      });
    }, { threshold: 0 });

    elements.forEach(el => {
      entering.observe(el);
      leaving.observe(el);
    });
  }

  /** Run fn after ms, replacing any follow-up still pending for el */
  later(el, fn, ms) {
    clearTimeout(this.timers.get(el));
    this.timers.set(el, setTimeout(fn, ms));
  }

  /**
   * Apply changes with transitions off, for resetting an element that is
   * out of sight: it snaps back to its hidden state instead of animating
   * there (and being caught half-way on a quick scroll back).
   */
  snap(el, apply) {
    clearTimeout(this.timers.get(el));
    el.classList.add('motion-reset');
    apply();
    void el.offsetWidth; // commit the hidden state before transitions return
    el.classList.remove('motion-reset');
  }

  // ── Words ─────────────────────────────────────────────────────────────────

  /**
   * Wrap each word in a mask (.w) holding a mover (.wi). The spaces stay as
   * plain text between the masks so wrapping and screen readers are unchanged.
   * @param {HTMLElement} el - Element holding plain text only
   */
  splitWords(el) {
    if (el.children.length > 0) return; // markup inside: leave it alone

    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const mask = document.createElement('span');
      const mover = document.createElement('span');
      mask.className = 'w';
      mover.className = 'wi';
      mover.textContent = word;
      mover.style.setProperty('--i', i);
      mask.appendChild(mover);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.classList.add('is-split');
  }

  /**
   * Bring the words in, then drop their masks once they have landed so
   * nothing stays clipped.
   */
  revealWords(el) {
    el.classList.add('is-in');
    const words = el.querySelectorAll('.wi').length;
    this.later(el, () => el.classList.add('is-settled'), REVEAL_MS + words * WORD_STAGGER_MS);
  }

  /** Hide the words again, ready to come in from the side they left by */
  resetWords(el, from) {
    this.snap(el, () => {
      el.classList.remove('is-in', 'is-settled');
      el.classList.toggle('from-above', from === 'above');
    });
  }

  /**
   * Section headers: the path decodes, the title rises, the rule draws.
   * Split text outside a header (the about paragraph, the hero name)
   * reveals on its own.
   */
  setupHeadings() {
    this.watch(Array.from(document.querySelectorAll('.section-head')), {
      enter: head => {
        head.classList.add('is-in');
        const title = head.querySelector('.is-split');
        const path = head.querySelector('[data-scramble]');
        if (title) this.revealWords(title);
        if (path) this.scramble(path);
      },
      exit: (head, from) => {
        const title = head.querySelector('.is-split');
        if (title) this.resetWords(title, from);
        this.snap(head, () => head.classList.remove('is-in'));
      }
    });

    const loose = Array.from(document.querySelectorAll('.is-split'))
      .filter(el => !el.closest('.section-head'));
    this.watch(loose, {
      enter: el => this.revealWords(el),
      exit: (el, from) => this.resetWords(el, from)
    }, { threshold: 0.35 });
  }

  /**
   * Decode a label: characters cycle through glyphs and settle left to right.
   * The labels are monospaced, so the width never changes while it runs.
   * @param {HTMLElement} el - Element whose text is the final label
   */
  scramble(el) {
    // a decode still running from a previous pass knows the real label
    const finalText = el.dataset.label || el.textContent;
    el.dataset.label = finalText;
    const start = performance.now();
    const run = (this._scrambleRun = (this._scrambleRun || 0) + 1);
    el.dataset.run = String(run);

    const tick = now => {
      if (el.dataset.run !== String(run)) return; // a newer pass took over
      const progress = Math.min((now - start) / SCRAMBLE_MS, 1);
      const settled = Math.floor(progress * finalText.length);
      el.textContent = Array.from(finalText, (ch, i) =>
        i < settled || ch === ' ' ? ch : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]
      ).join('');
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = finalText;
    };
    requestAnimationFrame(tick);
  }

  // ── Blocks ────────────────────────────────────────────────────────────────

  /**
   * Hero lines, skill cards and contact blocks slide in; a card's skill tags
   * follow it in. The hero is already showing (the intro brought it in), so
   * it only takes the hidden state once it has been scrolled away.
   */
  setupBlocks() {
    const blocks = Array.from(document.querySelectorAll(BLOCK_SELECTOR));
    blocks.forEach(block => {
      if (!block.closest('.hero-section')) block.classList.add('rv');
      block.querySelectorAll('.skill-tag').forEach((tag, i) => tag.style.setProperty('--ti', i));
    });

    this.watch(blocks, {
      enter: (block, order) => {
        const delay = order * BLOCK_STAGGER_MS;
        const tags = block.querySelectorAll('.skill-tag').length;
        block.style.setProperty('--d', delay + 'ms');
        block.classList.add('is-in');

        // hand the element back to its own styles once everything has landed
        this.later(block, () => {
          block.classList.remove('rv', 'is-in');
          block.style.removeProperty('--d');
        }, delay + REVEAL_MS + tags * TAG_STAGGER_MS + 300);
      },
      exit: (block, from) => this.snap(block, () => {
        block.classList.add('rv');
        block.classList.remove('is-in');
        block.classList.toggle('from-above', from === 'above');
        block.style.removeProperty('--d');
      })
    });
  }

  /**
   * Stacked layout (mobile, reduced helix): project cards fade in turn.
   * In helix mode helix-projects.js positions the cards and this is inert.
   */
  setupProjectFadeIn() {
    this.watch(Array.from(document.querySelectorAll('.project-wrapper')), {
      enter: (wrapper, order) => this.later(wrapper, () => wrapper.classList.add('visible'), order * 150),
      exit: (wrapper, from) => this.snap(wrapper, () => {
        wrapper.classList.remove('visible');
        wrapper.classList.toggle('from-above', from === 'above');
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  }

  // ── Odometer ──────────────────────────────────────────────────────────────

  /**
   * Replace a number with digit cells. Each cell keeps an invisible copy of
   * its final digit in the flow, so the line never reflows, and a strip of
   * digits scrolls past behind a clip. The real text stays for screen readers.
   * @param {HTMLElement} el - Element whose text is a number such as "95%"
   */
  buildOdometer(el) {
    const text = el.textContent.trim();
    const digits = Array.from(text).filter(ch => /\d/.test(ch)).length;
    let place = digits;

    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = text;

    const run = document.createElement('span');
    run.className = 'odo-run';
    run.setAttribute('aria-hidden', 'true');

    Array.from(text).forEach(ch => {
      if (!/\d/.test(ch)) {
        run.appendChild(document.createTextNode(ch));
        return;
      }
      place -= 1; // 0 for the last digit
      const cell = document.createElement('span');
      const ghost = document.createElement('span');
      const strip = document.createElement('span');
      cell.className = 'odo-d';
      ghost.className = 'odo-ghost';
      strip.className = 'odo-strip';
      ghost.textContent = ch;
      for (let n = 0; n < ODOMETER_LAPS * 10; n++) {
        const digit = document.createElement('span');
        digit.textContent = String(n % 10);
        strip.appendChild(digit);
      }
      // land on the final digit in the last lap for the units, one lap
      // less for each place further left
      const laps = Math.max(ODOMETER_LAPS - 1 - place, 0);
      strip.dataset.stop = String(Number(ch) + laps * 10);
      strip.style.setProperty('--od', (digits - 1 - place) * 90 + 'ms');
      cell.append(ghost, strip);
      run.appendChild(cell);
    });

    el.textContent = '';
    el.append(label, run);
  }

  /**
   * Roll the odometers when they are readable and wind them back once they
   * are out of sight, so they roll again on every visit. In helix mode a
   * card can sit in the viewport while hidden, faded or still turning in
   * from the side, so the checks also read helix-projects.js's inline
   * styles: only the card in the reading position takes the pointer.
   */
  setupOdometers() {
    const odometers = Array.from(document.querySelectorAll('[data-odometer]'));
    if (odometers.length === 0) return;

    const steps = ODOMETER_LAPS * 10;
    const inView = new Set();
    const rolled = new WeakSet();
    let polling = false;

    const cardOf = el => {
      const wrapper = el.closest('.project-wrapper');
      const card = wrapper?.querySelector('.project-card');
      const opacity = card && card.style.opacity !== '' ? parseFloat(card.style.opacity) : 1;
      return { wrapper, opacity };
    };

    const readable = el => {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) return false;
      const { wrapper, opacity } = cardOf(el);
      if (!wrapper) return true;
      if (wrapper.style.visibility === 'hidden' || wrapper.style.pointerEvents === 'none') return false;
      return opacity > 0.85;
    };

    const gone = el => {
      const { wrapper, opacity } = cardOf(el);
      return !!wrapper && (wrapper.style.visibility === 'hidden' || opacity < 0.05);
    };

    const roll = el => {
      rolled.add(el);
      el.querySelectorAll('.odo-strip').forEach(strip => {
        strip.style.transform = `translateY(${(-Number(strip.dataset.stop) / steps) * 100}%)`;
      });
    };

    const unroll = el => {
      rolled.delete(el);
      this.snap(el, () => el.querySelectorAll('.odo-strip').forEach(strip => {
        strip.style.transform = '';
      }));
    };

    const check = () => {
      inView.forEach(el => {
        if (!rolled.has(el) && readable(el)) roll(el);
        else if (rolled.has(el) && gone(el)) unroll(el);
      });
      polling = inView.size > 0;
      if (polling) setTimeout(check, 150);
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          inView.add(entry.target);
        } else {
          inView.delete(entry.target);
          if (rolled.has(entry.target)) unroll(entry.target);
        }
      });
      if (!polling) check();
    }, { threshold: [0, 1] });

    odometers.forEach(el => observer.observe(el));
  }
}

// Create singleton instance
const scrollAnimations = new ScrollAnimations();

export default scrollAnimations;
export { ScrollAnimations };
