/**
 * Theme Toggle System
 * Professional dark/light mode switcher
 */

class ThemeToggle {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getPreferredTheme();
    this.init();
  }

  /**
   * Get stored theme from localStorage
   */
  getStoredTheme() {
    return localStorage.getItem('theme');
  }

  /**
   * Get user's preferred theme from system
   */
  getPreferredTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  /**
   * Toggle theme
   */
  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Create toggle button
   */
  createToggleButton() {
    const button = document.createElement('button');
    button.className = 'theme-toggle-btn';
    button.setAttribute('aria-label', 'Toggle theme');
    button.setAttribute('title', 'Toggle dark/light mode');
    
    button.innerHTML = `
      <svg class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <svg class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    `;

    button.addEventListener('click', () => this.toggle());
    
    return button;
  }

  /**
   * Add CSS for toggle button
   */
  addStyles() {
    if (document.getElementById('theme-toggle-styles')) return;

    const style = document.createElement('style');
    style.id = 'theme-toggle-styles';
    style.textContent = `
      .theme-toggle-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: var(--color-neutral-50);
        border: 1px solid var(--color-neutral-200);
        border-radius: 8px;
        padding: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-md);
        transition: all 0.2s ease;
      }

      .theme-toggle-btn:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }

      .theme-toggle-btn svg {
        color: var(--color-neutral-700);
        transition: color 0.2s ease;
      }

      .theme-toggle-btn:hover svg {
        color: var(--color-primary-500);
      }

      /* Hide sun in light mode, moon in dark mode */
      [data-theme="light"] .icon-moon {
        display: none;
      }

      [data-theme="dark"] .icon-sun {
        display: none;
      }

      /* Smooth transitions for theme change */
      * {
        transition-property: background-color, border-color, color;
        transition-duration: 0.2s;
        transition-timing-function: ease-in-out;
      }

      /* Disable transitions for reduced motion */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Initialize theme system
   */
  init() {
    // Set initial theme
    this.setTheme(this.currentTheme);

    // Add styles
    this.addStyles();

    // Create and add toggle button
    const button = this.createToggleButton();
    document.body.appendChild(button);

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!this.getStoredTheme()) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }

    console.log(`✅ Theme system initialized (${this.currentTheme} mode)`);
  }
}

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.themeToggle = new ThemeToggle();
    });
  } else {
    window.themeToggle = new ThemeToggle();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeToggle };
}
