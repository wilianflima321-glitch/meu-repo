/**
 * Global Navbar Component
 * Persistent navigation across all pages
 */

class GlobalNavbar {
  constructor() {
    this.currentPage = this.detectCurrentPage();
    this.init();
  }

  /**
   * Detect current page
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'index';
    return page;
  }

  /**
   * Initialize navbar
   */
  init() {
    this.render();
    this.attachEventListeners();
  }

  /**
   * Render navbar
   */
  render() {
    const navbar = document.createElement('nav');
    navbar.id = 'global-navbar';
    navbar.className = 'global-navbar';
    navbar.innerHTML = `
      <div class="navbar-container">
        <div class="navbar-brand">
          <a href="index.html" class="brand-link">
            ${this.getIcon('code')}
            <span>AI IDE</span>
          </a>
        </div>
        
        <div class="navbar-menu">
          ${this.renderMenuItems()}
        </div>
        
        <div class="navbar-actions">
          <button class="navbar-btn" onclick="window.IntegrationHub?.saveCurrentProject()" title="Save (Ctrl+S)">
            ${this.getIcon('save')}
          </button>
          <button class="navbar-btn" onclick="window.IntegrationHub?.runProject()" title="Run Project">
            ${this.getIcon('play')}
          </button>
          <button class="navbar-btn" id="theme-toggle-btn" title="Toggle Theme">
            ${this.getIcon('sun')}
          </button>
          <button class="navbar-btn" onclick="window.IntegrationHub?.shareProject()" title="Share">
            ${this.getIcon('share')}
          </button>
        </div>
      </div>
    `;

    // Insert at the beginning of body
    document.body.insertBefore(navbar, document.body.firstChild);

    // Add styles
    this.injectStyles();
  }

  /**
   * Render menu items
   */
  renderMenuItems() {
    const items = [
      { id: 'index', label: 'Home', icon: 'home', href: 'index.html' },
      { id: 'project-manager', label: 'Projects', icon: 'folder', href: 'project-manager.html' },
      { id: 'monaco-editor', label: 'Editor', icon: 'code', href: 'monaco-editor.html' },
      { id: 'visual-scripting', label: 'Visual', icon: 'gitBranch', href: 'visual-scripting.html' },
      { id: '3d-viewport', label: '3D View', icon: 'box', href: '3d-viewport.html' },
      { id: 'asset-manager', label: 'Assets', icon: 'image', href: 'asset-manager.html' },
    ];

    return items.map(item => {
      const isActive = this.currentPage === item.id;
      return `
        <a href="${item.href}" class="navbar-item ${isActive ? 'active' : ''}" data-page="${item.id}">
          ${this.getIcon(item.icon)}
          <span>${item.label}</span>
        </a>
      `;
    }).join('');
  }

  /**
   * Get icon from Icons system
   */
  getIcon(name) {
    if (typeof Icons !== 'undefined' && Icons.get) {
      return Icons.get(name, 18);
    }
    return `<span>${name}</span>`;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn && typeof ThemeToggle !== 'undefined') {
      themeBtn.addEventListener('click', () => {
        ThemeToggle.toggle();
        this.updateThemeIcon();
      });
      this.updateThemeIcon();
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt + H - Home
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = 'index.html';
      }
      // Alt + P - Projects
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        window.location.href = 'project-manager.html';
      }
    });
  }

  /**
   * Update theme icon
   */
  updateThemeIcon() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.innerHTML = this.getIcon(isDark ? 'moon' : 'sun');
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('navbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'navbar-styles';
    style.textContent = `
      .global-navbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        background: var(--bg-secondary, #252526);
        border-bottom: 1px solid var(--border-color, #3e3e42);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .navbar-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        height: 50px;
        max-width: 1920px;
        margin: 0 auto;
      }

      .navbar-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .brand-link {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-primary, #ffffff);
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        transition: opacity 0.2s;
      }

      .brand-link:hover {
        opacity: 0.8;
      }

      .navbar-menu {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        justify-content: center;
      }

      .navbar-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        color: var(--text-secondary, #cccccc);
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .navbar-item:hover {
        background: var(--bg-hover, #2a2d2e);
        color: var(--text-primary, #ffffff);
      }

      .navbar-item.active {
        background: var(--primary-color, #007acc);
        color: #ffffff;
      }

      .navbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .navbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 4px;
        color: var(--text-secondary, #cccccc);
        cursor: pointer;
        transition: all 0.2s;
      }

      .navbar-btn:hover {
        background: var(--bg-hover, #2a2d2e);
        color: var(--text-primary, #ffffff);
      }

      .navbar-btn:active {
        transform: scale(0.95);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .navbar-item span {
          display: none;
        }
        
        .navbar-menu {
          gap: 2px;
        }
        
        .navbar-item {
          padding: 8px;
        }
      }

      /* Adjust body padding */
      body {
        padding-top: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Update active item
   */
  updateActive(pageId) {
    const items = document.querySelectorAll('.navbar-item');
    items.forEach(item => {
      if (item.dataset.page === pageId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.GlobalNavbar = new GlobalNavbar();
  });
} else {
  window.GlobalNavbar = new GlobalNavbar();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GlobalNavbar };
}
