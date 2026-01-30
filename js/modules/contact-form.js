/**
 * Contact Form Module
 * Handles form submission with Formspree API
 * Includes spam protection (honeypot + time-based verification)
 */

class ContactForm {
  constructor() {
    this.form = null;
    this.submitBtn = null;
    this.initialized = false;
    this.formLoadTime = null;
    this.minSubmitTime = 3000; // Minimum 3 seconds (bots submit instantly)
  }

  /**
   * Initialize the contact form
   */
  init() {
    if (this.initialized) return;

    this.form = document.getElementById('contact-form');
    
    if (!this.form) {
      console.warn('ContactForm: Form element not found');
      return;
    }

    this.submitBtn = document.getElementById('submit-btn');
    this.formLoadTime = Date.now(); // Record when form loads
    
    this.setupEventListeners();
    this.initialized = true;
    console.log('ContactForm: Initialized with spam protection');
  }

  /**
   * Set up form event listeners
   */
  setupEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  /**
   * Handle form submission with spam protection
   * @param {Event} e - Submit event
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Spam Protection 1: Check honeypot field
    const honeypot = this.form.querySelector('[name="_gotcha"]');
    if (honeypot && honeypot.value) {
      // Honeypot filled = likely bot
      console.warn('ContactForm: Honeypot triggered');
      this.showMessage('error', '✕ Submission blocked. Please try again.');
      return;
    }

    // Spam Protection 2: Time-based check (bots submit too fast)
    const timeSinceLoad = Date.now() - this.formLoadTime;
    if (timeSinceLoad < this.minSubmitTime) {
      console.warn('ContactForm: Submission too fast');
      this.showMessage('error', '✕ Please wait a moment before submitting.');
      return;
    }

    // Validate form
    if (!this.form.checkValidity()) {
      this.form.reportValidity();
      return;
    }

    // Get original button text
    const originalText = this.submitBtn.textContent;

    // Disable submit button and show loading
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Sending...';
    
    // Remove any existing messages
    this.removeExistingMessage();

    try {
      // Get form data
      const formData = new FormData(this.form);
      
      // Send to Formspree with proper headers
      const response = await fetch(this.form.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        this.showMessage('success', '✓ Message sent successfully! I\'ll get back to you soon.');
        this.form.reset();
        // Reset form load time after successful submission
        this.formLoadTime = Date.now();
      } else {
        // Handle Formspree-specific errors
        if (data.errors) {
          const errorMessage = data.errors.map(err => err.message).join(', ');
          throw new Error(errorMessage);
        } else {
          throw new Error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Provide helpful error message
      let errorMsg = '✕ Failed to send message. ';
      if (error.message.includes('reCAPTCHA') || error.message.includes('AJAX')) {
        errorMsg += 'Please contact me directly: asif.ahamed3720@gmail.com';
      } else {
        errorMsg += 'Please try again or email me directly.';
      }
      
      this.showMessage('error', errorMsg);
    } finally {
      // Re-enable button
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = originalText;
    }
  }

  /**
   * Remove existing message if present
   */
  removeExistingMessage() {
    const existingMessage = this.form.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  /**
   * Show success or error message
   * @param {string} type - 'success' or 'error'
   * @param {string} message - Message text
   */
  showMessage(type, message) {
    // Remove any existing message first
    this.removeExistingMessage();

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.textContent = message;

    // Insert after submit button
    this.submitBtn.parentNode.insertBefore(messageDiv, this.submitBtn.nextSibling);

    // Auto-hide success messages after 8 seconds (keep errors visible)
    if (type === 'success') {
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 8000);
    }

    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Create singleton instance
const contactForm = new ContactForm();

// Export both the instance and the class
export default contactForm;
export { ContactForm };
