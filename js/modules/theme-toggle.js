/**
 * Theme Toggle Module
 * Handles dark/light mode switching with localStorage persistence
 */

class ThemeToggle {
  constructor() {
    this.themeToggleDesktop = null;
    this.themeToggleMobile = null;
    this.html = document.documentElement;
    this.initialized = false;
  }

  /**
   * Initialize theme toggle
   */
  init() {
    if (this.initialized) return;

    this.themeToggleDesktop = document.getElementById('theme-toggle');
    this.themeToggleMobile = document.getElementById('theme-toggle-mobile');

    if (!this.themeToggleDesktop || !this.themeToggleMobile) {
      console.warn('ThemeToggle: Toggle buttons not found');
      return;
    }

    // Get current theme (already set by inline script in head)
    const currentTheme = this.html.getAttribute('data-theme') || 'dark';
    this.updateThemeIcon(currentTheme);

    // Desktop theme toggle
    this.themeToggleDesktop.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Mobile theme toggle
    this.themeToggleMobile.addEventListener('click', () => {
      this.toggleTheme();
    });

    this.initialized = true;
  }

  /**
   * Toggle between dark and light theme
   */
  toggleTheme() {
    const currentTheme = this.html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    this.html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeIcon(newTheme);
  }

  /**
   * Update theme toggle icon based on current theme
   * @param {string} theme - 'dark' or 'light'
   */
  updateThemeIcon(theme) {
    const iconHTML = theme === 'dark' ? `
      <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    ` : `
      <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
    
    this.themeToggleDesktop.innerHTML = iconHTML;
    this.themeToggleMobile.innerHTML = iconHTML;
  }
}

// Create singleton instance
const themeToggle = new ThemeToggle();

export default themeToggle;
export { ThemeToggle };
