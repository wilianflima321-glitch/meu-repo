/**
 * Console Panel System
 * Output log with categorized messages (Error, Warning, Info, Debug)
 */

class ConsolePanel {
  constructor(containerId = 'console-panel') {
    this.containerId = containerId;
    this.messages = [];
    this.filters = {
      error: true,
      warning: true,
      info: true,
      debug: true
    };
    this.maxMessages = 1000;
    this.collapsed = false;
    this.init();
  }

  /**
   * Initialize console panel
   */
  init() {
    this.createPanel();
    this.interceptConsole();
    this.attachEventListeners();
    
    // Listen to IntegrationHub events
    if (window.IntegrationHub) {
      window.IntegrationHub.on('console:log', (data) => {
        this.log(data.message, data.type || 'info');
      });
    }
  }

  /**
   * Create console panel UI
   */
  createPanel() {
    let container = document.getElementById(this.containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      document.body.appendChild(container);
    }

    container.className = 'console-panel collapsed';
    container.innerHTML = `
      <div class="console-header">
        <div class="console-title">
          <span class="console-icon">${this.getIcon('terminal')}</span>
          <span>Console</span>
          <span class="console-count" id="console-count">0</span>
        </div>
        <div class="console-filters">
          <button class="console-filter-btn active" data-filter="error" title="Errors">
            ${this.getIcon('xCircle')}
            <span class="filter-count" id="error-count">0</span>
          </button>
          <button class="console-filter-btn active" data-filter="warning" title="Warnings">
            ${this.getIcon('alertTriangle')}
            <span class="filter-count" id="warning-count">0</span>
          </button>
          <button class="console-filter-btn active" data-filter="info" title="Info">
            ${this.getIcon('info')}
            <span class="filter-count" id="info-count">0</span>
          </button>
          <button class="console-filter-btn active" data-filter="debug" title="Debug">
            ${this.getIcon('code')}
            <span class="filter-count" id="debug-count">0</span>
          </button>
        </div>
        <div class="console-actions">
          <button class="console-action-btn" onclick="window.ConsolePanel?.clear()" title="Clear">
            ${this.getIcon('trash')}
          </button>
          <button class="console-action-btn" onclick="window.ConsolePanel?.toggleCollapse()" title="Toggle" id="console-toggle">
            ${this.getIcon('chevronDown')}
          </button>
        </div>
      </div>
      <div class="console-content" id="console-content"></div>
    `;

    this.injectStyles();
  }

  /**
   * Intercept console methods
   */
  interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    console.log = (...args) => {
      originalLog.apply(console, args);
      this.log(args.join(' '), 'info');
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      this.log(args.join(' '), 'error');
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.log(args.join(' '), 'warning');
    };

    console.info = (...args) => {
      originalInfo.apply(console, args);
      this.log(args.join(' '), 'info');
    };

    console.debug = (...args) => {
      originalDebug.apply(console, args);
      this.log(args.join(' '), 'debug');
    };

    // Intercept window errors
    window.addEventListener('error', (event) => {
      this.log(`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`, 'error');
    });

    // Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log(`Unhandled Promise Rejection: ${event.reason}`, 'error');
    });
  }

  /**
   * Log message
   */
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp,
      time: Date.now()
    };

    this.messages.push(logEntry);

    // Limit messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    this.render();
    this.updateCounts();
  }

  /**
   * Render messages
   */
  render() {
    const content = document.getElementById('console-content');
    if (!content) return;

    // Filter messages
    const filtered = this.messages.filter(msg => this.filters[msg.type]);

    // Render only last 100 for performance
    const toRender = filtered.slice(-100);

    content.innerHTML = toRender.map(msg => `
      <div class="console-message console-${msg.type}" data-id="${msg.id}">
        <span class="console-time">${msg.timestamp}</span>
        <span class="console-icon">${this.getTypeIcon(msg.type)}</span>
        <span class="console-text">${this.escapeHtml(msg.message)}</span>
      </div>
    `).join('');

    // Auto-scroll to bottom
    content.scrollTop = content.scrollHeight;
  }

  /**
   * Update counts
   */
  updateCounts() {
    const counts = {
      error: 0,
      warning: 0,
      info: 0,
      debug: 0
    };

    this.messages.forEach(msg => {
      counts[msg.type]++;
    });

    document.getElementById('console-count').textContent = this.messages.length;
    document.getElementById('error-count').textContent = counts.error;
    document.getElementById('warning-count').textContent = counts.warning;
    document.getElementById('info-count').textContent = counts.info;
    document.getElementById('debug-count').textContent = counts.debug;
  }

  /**
   * Clear console
   */
  clear() {
    this.messages = [];
    this.render();
    this.updateCounts();
  }

  /**
   * Toggle filter
   */
  toggleFilter(type) {
    this.filters[type] = !this.filters[type];
    
    const btn = document.querySelector(`[data-filter="${type}"]`);
    if (btn) {
      btn.classList.toggle('active', this.filters[type]);
    }

    this.render();
  }

  /**
   * Toggle collapse
   */
  toggleCollapse() {
    this.collapsed = !this.collapsed;
    const panel = document.getElementById(this.containerId);
    const toggle = document.getElementById('console-toggle');
    
    if (panel) {
      panel.classList.toggle('collapsed', this.collapsed);
    }
    
    if (toggle) {
      toggle.innerHTML = this.getIcon(this.collapsed ? 'chevronUp' : 'chevronDown');
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Filter buttons
    document.querySelectorAll('.console-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.toggleFilter(filter);
      });
    });
  }

  /**
   * Get type icon
   */
  getTypeIcon(type) {
    const icons = {
      error: this.getIcon('xCircle'),
      warning: this.getIcon('alertTriangle'),
      info: this.getIcon('info'),
      debug: this.getIcon('code')
    };
    return icons[type] || icons.info;
  }

  /**
   * Get icon
   */
  getIcon(name) {
    if (typeof Icons !== 'undefined' && Icons.get) {
      return Icons.get(name, 14);
    }
    return '';
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('console-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'console-panel-styles';
    style.textContent = `
      .console-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 250px;
        background: var(--bg-secondary, #1e1e1e);
        border-top: 1px solid var(--border-color, #3e3e42);
        z-index: 900;
        display: flex;
        flex-direction: column;
        transition: height 0.3s ease;
      }

      .console-panel.collapsed {
        height: 40px;
      }

      .console-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--bg-tertiary, #252526);
        border-bottom: 1px solid var(--border-color, #3e3e42);
        min-height: 40px;
      }

      .console-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary, #ffffff);
      }

      .console-icon {
        display: flex;
        align-items: center;
        color: var(--text-secondary, #cccccc);
      }

      .console-count {
        background: var(--bg-hover, #2a2d2e);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        color: var(--text-secondary, #cccccc);
      }

      .console-filters {
        display: flex;
        gap: 4px;
      }

      .console-filter-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 4px;
        color: var(--text-secondary, #888);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .console-filter-btn:hover {
        background: var(--bg-hover, #2a2d2e);
      }

      .console-filter-btn.active {
        border-color: var(--border-color, #3e3e42);
        color: var(--text-primary, #ffffff);
      }

      .filter-count {
        font-size: 11px;
        font-weight: 600;
      }

      .console-actions {
        display: flex;
        gap: 4px;
      }

      .console-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 4px;
        color: var(--text-secondary, #cccccc);
        cursor: pointer;
        transition: all 0.2s;
      }

      .console-action-btn:hover {
        background: var(--bg-hover, #2a2d2e);
        color: var(--text-primary, #ffffff);
      }

      .console-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }

      .console-panel.collapsed .console-content {
        display: none;
      }

      .console-message {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 4px 8px;
        margin-bottom: 2px;
        border-radius: 3px;
        line-height: 1.5;
      }

      .console-message:hover {
        background: var(--bg-hover, #2a2d2e);
      }

      .console-time {
        color: var(--text-tertiary, #6a6a6a);
        font-size: 11px;
        white-space: nowrap;
      }

      .console-text {
        flex: 1;
        word-break: break-word;
      }

      .console-error {
        color: #f56565;
        background: rgba(245, 101, 101, 0.1);
      }

      .console-warning {
        color: #ed8936;
        background: rgba(237, 137, 54, 0.1);
      }

      .console-info {
        color: #4299e1;
      }

      .console-debug {
        color: #9f7aea;
      }

      /* Scrollbar */
      .console-content::-webkit-scrollbar {
        width: 10px;
      }

      .console-content::-webkit-scrollbar-track {
        background: var(--bg-secondary, #1e1e1e);
      }

      .console-content::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb, #424242);
        border-radius: 5px;
      }

      .console-content::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover, #4e4e4e);
      }

      /* Adjust body padding for console */
      body {
        padding-bottom: 250px;
      }

      body:has(.console-panel.collapsed) {
        padding-bottom: 40px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ConsolePanel = new ConsolePanel();
  });
} else {
  window.ConsolePanel = new ConsolePanel();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConsolePanel };
}
