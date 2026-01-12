/**
 * Scroll Animations Module
 * Handles typing effects, drop-in effects, and fade-in animations
 */

class ScrollAnimations {
  constructor() {
    this.typingTimeouts = new Map();
    this.typingStates = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all scroll animations
   */
  init() {
    if (this.initialized) return;

    this.setupAdvancedScrollAnimations();
    this.setupProjectFadeIn();

    this.initialized = true;
  }

  /**
   * Setup advanced scroll animations (typing and drop effects)
   */
  setupAdvancedScrollAnimations() {
    // Store original text content before any modifications
    document.querySelectorAll('h2, .about-content > p, .hero-title .gradient-text').forEach(el => {
      if (!el.dataset.originalText) {
        el.dataset.originalText = el.textContent.trim();
      }
    });

    // Typing effect for h2 and paragraphs
    const typingObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Only start if not already typing and not complete
          if (!this.typingStates.get(entry.target) && !entry.target.classList.contains('typing-complete')) {
            this.typingStates.set(entry.target, true);
            this.typeWriterEffect(entry.target);
          }
        } else {
          // Don't reset hero title when scrolling (it's at the top)
          if (entry.target.closest('.hero-title')) {
            return;
          }
          
          // Only reset if we were actually typing
          if (this.typingStates.get(entry.target)) {
            // Cancel ongoing typing animation
            if (this.typingTimeouts.has(entry.target)) {
              const timeoutIds = this.typingTimeouts.get(entry.target);
              timeoutIds.forEach(id => clearTimeout(id));
              this.typingTimeouts.delete(entry.target);
            }
            
            // Reset state
            this.typingStates.set(entry.target, false);
            entry.target.classList.remove('typing-complete');
            entry.target.classList.remove('typing-active');
            entry.target.textContent = '';
            entry.target.style.opacity = '0';
            entry.target.style.borderRight = 'none';
          }
        }
      });
    }, {
      threshold: 0.4,
      rootMargin: '0px'
    });

    // Apply typing effect to headings and paragraphs
    document.querySelectorAll('h2, .about-content > p, .hero-title .gradient-text').forEach(el => {
      el.classList.add('typing-element');
      this.typingStates.set(el, false);
      typingObserver.observe(el);
    });

    // Drop-in effect for skill cards
    const dropObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('drop-active');
          }, entry.target.dataset.index * 100);
        } else {
          entry.target.classList.remove('drop-active');
        }
      });
    }, {
      threshold: 0.5,
      rootMargin: '0px'
    });

    // Apply drop effect to skill categories
    document.querySelectorAll('.skill-category-large').forEach((card, index) => {
      card.classList.add('drop-element');
      card.dataset.index = index;
      dropObserver.observe(card);
    });

    // Apply drop effect to skill tags
    document.querySelectorAll('.skill-tag').forEach((tag, index) => {
      tag.classList.add('drop-tag');
      tag.style.setProperty('--tag-index', index);
    });
  }

  /**
   * Typewriter effect for an element
   * @param {HTMLElement} element - Element to apply typewriter effect to
   */
  typeWriterEffect(element) {
    const text = element.dataset.originalText;
    
    // Clear any existing timeouts for this element
    if (this.typingTimeouts.has(element)) {
      const timeoutIds = this.typingTimeouts.get(element);
      timeoutIds.forEach(id => clearTimeout(id));
    }
    this.typingTimeouts.set(element, []);
    
    element.textContent = '';
    element.style.opacity = '1';
    element.style.visibility = 'visible';
    element.classList.add('typing-active');
    
    let index = 0;
    // Adjust speed based on element type
    let speed;
    if (element.closest('.hero-title')) {
      speed = 80; // Slower for hero title
    } else if (element.tagName === 'H2') {
      speed = 50;
    } else {
      speed = 20;
    }
    
    const type = () => {
      // Check if element is still visible
      if (!this.typingStates.get(element)) {
        return; // Stop typing if scrolled away
      }
      
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        const timeoutId = setTimeout(type, speed);
        this.typingTimeouts.get(element).push(timeoutId);
      } else {
        element.classList.add('typing-complete');
        this.typingTimeouts.delete(element);
        // Add cursor blink at the end briefly (only for non-hero elements)
        if (!element.closest('.hero-title')) {
          element.style.borderRight = '2px solid var(--primary-blue)';
          setTimeout(() => {
            element.style.borderRight = 'none';
          }, 500);
        }
      }
    };
    
    type();
  }

  /**
   * Setup fade-in animation for project cards
   */
  setupProjectFadeIn() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 150);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.project-wrapper').forEach(wrapper => {
      observer.observe(wrapper);
    });
  }
}

// Create singleton instance
const scrollAnimations = new ScrollAnimations();

export default scrollAnimations;
export { ScrollAnimations };
