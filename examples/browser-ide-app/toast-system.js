/**
 * Professional Toast Notification System
 * Enterprise-grade user feedback
 */

class ToastSystem {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.maxToasts = 5;
    this.defaultDuration = 4000;
    this.init();
  }
  
  init() {
    // Create container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }
  
  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {object} options - Additional options
   */
  show(message, type = 'info', options = {}) {
    const toast = this.createToast(message, type, options);
    
    // Remove oldest toast if limit reached
    if (this.toasts.length >= this.maxToasts) {
      this.remove(this.toasts[0].id);
    }
    
    this.container.appendChild(toast.element);
    this.toasts.push(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.element.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    if (!options.persistent) {
      const duration = options.duration || this.defaultDuration;
      toast.timeout = setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
    
    return toast.id;
  }
  
  /**
   * Create toast element
   */
  createToast(message, type, options) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const element = document.createElement('div');
    element.className = `toast toast-${type}`;
    element.id = id;
    
    const icon = this.getIcon(type);
    const title = options.title || this.getDefaultTitle(type);
    
    element.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="toastSystem.remove('${id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    
    return { id, element, timeout: null };
  }
  
  /**
   * Get icon for toast type
   */
  getIcon(type) {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`,
    };
    return icons[type] || icons.info;
  }
  
  /**
   * Get default title for toast type
   */
  getDefaultTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
    };
    return titles[type] || '';
  }
  
  /**
   * Remove toast
   */
  remove(id) {
    const toastIndex = this.toasts.findIndex(t => t.id === id);
    if (toastIndex === -1) return;
    
    const toast = this.toasts[toastIndex];
    
    // Clear timeout
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }
    
    // Animate out
    toast.element.classList.remove('show');
    toast.element.classList.add('hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.splice(toastIndex, 1);
    }, 300);
  }
  
  /**
   * Remove all toasts
   */
  clear() {
    this.toasts.forEach(toast => this.remove(toast.id));
  }
  
  // Convenience methods
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }
  
  error(message, options = {}) {
    return this.show(message, 'error', options);
  }
  
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }
  
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
  
  /**
   * Show loading toast
   */
  loading(message, options = {}) {
    const id = this.show(message, 'info', { ...options, persistent: true });
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      toast.element.querySelector('.toast-icon').innerHTML = '';
      toast.element.querySelector('.toast-icon').appendChild(spinner);
    }
    return id;
  }
  
  /**
   * Update existing toast
   */
  update(id, message, type) {
    const toast = this.toasts.find(t => t.id === id);
    if (!toast) return;
    
    const messageEl = toast.element.querySelector('.toast-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    if (type) {
      toast.element.className = `toast toast-${type} show`;
      const iconEl = toast.element.querySelector('.toast-icon');
      if (iconEl) {
        iconEl.innerHTML = this.getIcon(type);
      }
    }
  }
}

// Add CSS styles
const toastStyles = `
<style>
.toast-container {
  position: fixed;
  top: var(--spacing-6, 24px);
  right: var(--spacing-6, 24px);
  z-index: var(--z-modal, 1050);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3, 12px);
  max-width: 400px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3, 12px);
  padding: var(--spacing-4, 16px);
  background: white;
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  pointer-events: auto;
  opacity: 0;
  transform: translateX(100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 300px;
}

.toast.show {
  opacity: 1;
  transform: translateX(0);
}

.toast.hide {
  opacity: 0;
  transform: translateX(100%);
}

.toast-success {
  border-left: 4px solid var(--color-success, #10b981);
}

.toast-success .toast-icon {
  color: var(--color-success, #10b981);
}

.toast-error {
  border-left: 4px solid var(--color-error, #ef4444);
}

.toast-error .toast-icon {
  color: var(--color-error, #ef4444);
}

.toast-warning {
  border-left: 4px solid var(--color-warning, #f59e0b);
}

.toast-warning .toast-icon {
  color: var(--color-warning, #f59e0b);
}

.toast-info {
  border-left: 4px solid var(--color-info, #3b82f6);
}

.toast-info .toast-icon {
  color: var(--color-info, #3b82f6);
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: var(--font-weight-semibold, 600);
  font-size: var(--font-size-sm, 14px);
  margin-bottom: var(--spacing-1, 4px);
  color: var(--color-neutral-900, #111827);
}

.toast-message {
  font-size: var(--font-size-sm, 14px);
  color: var(--color-neutral-600, #4b5563);
  line-height: var(--line-height-normal, 1.5);
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-neutral-400, #9ca3af);
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close:hover {
  color: var(--color-neutral-600, #4b5563);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
`;

// Inject styles
if (typeof document !== 'undefined') {
  document.head.insertAdjacentHTML('beforeend', toastStyles);
}

// Create global instance
const toastSystem = new ToastSystem();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ToastSystem, toastSystem };
}
