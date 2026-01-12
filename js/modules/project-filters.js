/**
 * Project Filters Module
 * Handles filtering of project cards by category
 */

class ProjectFilters {
  constructor() {
    this.filterBtns = [];
    this.projects = [];
    this.initialized = false;
  }

  /**
   * Initialize project filters
   */
  init() {
    if (this.initialized) return;

    this.filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
    this.projects = Array.from(document.querySelectorAll('.project-wrapper'));

    if (this.filterBtns.length === 0 || this.projects.length === 0) {
      console.warn('ProjectFilters: Elements not found');
      return;
    }

    this.setupFilterButtons();

    this.initialized = true;
  }

  /**
   * Setup click handlers for filter buttons
   */
  setupFilterButtons() {
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        
        // Update active button
        this.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Filter projects
        this.filterProjects(filter);
      });
    });
  }

  /**
   * Filter projects based on selected category
   * @param {string} filter - Category to filter by ('all' or specific category)
   */
  filterProjects(filter) {
    this.projects.forEach(project => {
      const category = project.dataset.category;
      
      if (filter === 'all' || category === filter) {
        // Show project
        project.style.display = 'block';
        setTimeout(() => project.classList.add('visible'), 50);
      } else {
        // Hide project
        project.classList.remove('visible');
        setTimeout(() => {
          project.style.display = 'none';
        }, 300);
      }
    });
  }
}

// Create singleton instance
const projectFilters = new ProjectFilters();

export default projectFilters;
export { ProjectFilters };
