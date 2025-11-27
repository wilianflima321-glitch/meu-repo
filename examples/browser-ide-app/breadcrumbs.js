/**
 * Breadcrumbs Component
 * Hierarchical navigation
 */

class Breadcrumbs {
  constructor(containerId = 'breadcrumbs') {
    this.containerId = containerId;
    this.path = this.buildPath();
    this.init();
  }

  /**
   * Build path from current location
   */
  buildPath() {
    const pathname = window.location.pathname;
    const page = pathname.split('/').pop().replace('.html', '') || 'index';
    
    // Get project info if available
    const project = window.IntegrationHub?.state?.currentProject;
    
    const paths = {
      'index': [
        { label: 'Home', href: 'index.html' }
      ],
      'project-manager': [
        { label: 'Home', href: 'index.html' },
        { label: 'Projects', href: 'project-manager.html' }
      ],
      'monaco-editor': [
        { label: 'Home', href: 'index.html' },
        { label: 'Projects', href: 'project-manager.html' },
        { label: project?.name || 'Editor', href: 'monaco-editor.html' }
      ],
      'visual-scripting': [
        { label: 'Home', href: 'index.html' },
        { label: 'Projects', href: 'project-manager.html' },
        { label: project?.name || 'Visual Scripting', href: 'visual-scripting.html' }
      ],
      '3d-viewport': [
        { label: 'Home', href: 'index.html' },
        { label: 'Projects', href: 'project-manager.html' },
        { label: project?.name || '3D Viewport', href: '3d-viewport.html' }
      ],
      'asset-manager': [
        { label: 'Home', href: 'index.html' },
        { label: 'Projects', href: 'project-manager.html' },
        { label: project?.name || 'Assets', href: 'asset-manager.html' }
      ],
    };

    return paths[page] || paths['index'];
  }

  /**
   * Initialize breadcrumbs
   */
  init() {
    this.render();
    this.listenToProjectChanges();
  }

  /**
   * Render breadcrumbs
   */
  render() {
    let container = document.getElementById(this.containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      
      // Insert after navbar
      const navbar = document.getElementById('global-navbar');
      if (navbar) {
        navbar.after(container);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }

    container.className = 'breadcrumbs';
    container.innerHTML = `
      <div class="breadcrumbs-container">
        ${this.renderItems()}
      </div>
    `;

    this.injectStyles();
  }

  /**
   * Render breadcrumb items
   */
  renderItems() {
    return this.path.map((item, index) => {
      const isLast = index === this.path.length - 1;
      
      if (isLast) {
        return `
          <span class="breadcrumb-item active">
            ${item.label}
          </span>
        `;
      }
      
      return `
        <a href="${item.href}" class="breadcrumb-item">
          ${item.label}
        </a>
        <span class="breadcrumb-separator">${this.getIcon('chevronRight')}</span>
      `;
    }).join('');
  }

  /**
   * Get icon
   */
  getIcon(name) {
    if (typeof Icons !== 'undefined' && Icons.get) {
      return Icons.get(name, 14);
    }
    return '/';
  }

  /**
   * Listen to project changes
   */
  listenToProjectChanges() {
    if (window.IntegrationHub) {
      window.IntegrationHub.on('project:loaded', () => {
        this.path = this.buildPath();
        this.render();
      });
    }
  }

  /**
   * Update path manually
   */
  updatePath(newPath) {
    this.path = newPath;
    this.render();
  }

  /**
   * Add item to path
   */
  addItem(label, href) {
    this.path.push({ label, href });
    this.render();
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('breadcrumbs-styles')) return;

    const style = document.createElement('style');
    style.id = 'breadcrumbs-styles';
    style.textContent = `
      .breadcrumbs {
        background: var(--bg-primary, #1e1e1e);
        border-bottom: 1px solid var(--border-color, #3e3e42);
        padding: 8px 20px;
      }

      .breadcrumbs-container {
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 1920px;
        margin: 0 auto;
        font-size: 13px;
      }

      .breadcrumb-item {
        color: var(--text-secondary, #cccccc);
        text-decoration: none;
        transition: color 0.2s;
        white-space: nowrap;
      }

      .breadcrumb-item:hover {
        color: var(--primary-color, #007acc);
      }

      .breadcrumb-item.active {
        color: var(--text-primary, #ffffff);
        font-weight: 500;
      }

      .breadcrumb-separator {
        color: var(--text-tertiary, #6a6a6a);
        display: flex;
        align-items: center;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .breadcrumbs-container {
          font-size: 12px;
          gap: 4px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.Breadcrumbs = new Breadcrumbs();
  });
} else {
  window.Breadcrumbs = new Breadcrumbs();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Breadcrumbs };
}
