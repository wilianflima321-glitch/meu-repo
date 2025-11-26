/**
 * Professional Tooltip System
 * Contextual help for all UI elements
 */

class TooltipSystem {
  constructor() {
    this.tooltips = new Map();
    this.activeTooltip = null;
    this.delay = 500; // ms
    this.timeout = null;
    this.init();
  }
  
  init() {
    // Add global styles
    this.injectStyles();
    
    // Auto-initialize tooltips on DOM load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeAll());
    } else {
      this.initializeAll();
    }
  }
  
  injectStyles() {
    const styles = `
      <style id="tooltip-system-styles">
        .tooltip-wrapper {
          position: relative;
          display: inline-block;
        }
        
        .tooltip-content {
          position: absolute;
          z-index: var(--z-tooltip, 1070);
          padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
          font-size: var(--font-size-sm, 14px);
          line-height: var(--line-height-normal, 1.5);
          color: white;
          background-color: var(--color-neutral-900, #111827);
          border-radius: var(--radius-md, 6px);
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease-in-out;
          max-width: 300px;
        }
        
        .tooltip-content.multiline {
          white-space: normal;
        }
        
        .tooltip-content.show {
          opacity: 1;
        }
        
        /* Positions */
        .tooltip-content.top {
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-8px);
        }
        
        .tooltip-content.bottom {
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(8px);
        }
        
        .tooltip-content.left {
          right: 100%;
          top: 50%;
          transform: translateX(-8px) translateY(-50%);
        }
        
        .tooltip-content.right {
          left: 100%;
          top: 50%;
          transform: translateX(8px) translateY(-50%);
        }
        
        /* Arrow */
        .tooltip-content::before {
          content: '';
          position: absolute;
          width: 0;
          height: 0;
          border: 6px solid transparent;
        }
        
        .tooltip-content.top::before {
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-top-color: var(--color-neutral-900, #111827);
        }
        
        .tooltip-content.bottom::before {
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-bottom-color: var(--color-neutral-900, #111827);
        }
        
        .tooltip-content.left::before {
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-left-color: var(--color-neutral-900, #111827);
        }
        
        .tooltip-content.right::before {
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-right-color: var(--color-neutral-900, #111827);
        }
        
        /* Keyboard shortcut styling */
        .tooltip-shortcut {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 6px;
          font-size: 11px;
          font-family: var(--font-family-mono, monospace);
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
      </style>
    `;
    
    if (!document.getElementById('tooltip-system-styles')) {
      document.head.insertAdjacentHTML('beforeend', styles);
    }
  }
  
  /**
   * Initialize all tooltips in document
   */
  initializeAll() {
    const elements = document.querySelectorAll('[data-tooltip]');
    elements.forEach(el => this.attach(el));
  }
  
  /**
   * Attach tooltip to element
   */
  attach(element, options = {}) {
    const text = element.getAttribute('data-tooltip') || options.text;
    if (!text) return;
    
    const position = element.getAttribute('data-tooltip-position') || options.position || 'top';
    const shortcut = element.getAttribute('data-tooltip-shortcut') || options.shortcut;
    const multiline = element.hasAttribute('data-tooltip-multiline') || options.multiline;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = `tooltip-content ${position}`;
    if (multiline) tooltip.classList.add('multiline');
    
    // Add text and shortcut
    let content = text;
    if (shortcut) {
      content += `<span class="tooltip-shortcut">${shortcut}</span>`;
    }
    tooltip.innerHTML = content;
    
    // Store reference
    this.tooltips.set(element, tooltip);
    
    // Add event listeners
    element.addEventListener('mouseenter', (e) => this.show(element, e));
    element.addEventListener('mouseleave', () => this.hide(element));
    element.addEventListener('focus', (e) => this.show(element, e));
    element.addEventListener('blur', () => this.hide(element));
    
    // Make element position relative if not already
    const position_style = window.getComputedStyle(element).position;
    if (position_style === 'static') {
      element.style.position = 'relative';
    }
  }
  
  /**
   * Show tooltip
   */
  show(element, event) {
    // Clear any existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    // Hide active tooltip
    if (this.activeTooltip && this.activeTooltip !== element) {
      this.hide(this.activeTooltip);
    }
    
    // Show after delay
    this.timeout = setTimeout(() => {
      const tooltip = this.tooltips.get(element);
      if (!tooltip) return;
      
      // Append to element
      if (!tooltip.parentNode) {
        element.appendChild(tooltip);
      }
      
      // Position tooltip
      this.position(tooltip, element);
      
      // Show tooltip
      requestAnimationFrame(() => {
        tooltip.classList.add('show');
      });
      
      this.activeTooltip = element;
    }, this.delay);
  }
  
  /**
   * Hide tooltip
   */
  hide(element) {
    // Clear timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    const tooltip = this.tooltips.get(element);
    if (!tooltip) return;
    
    tooltip.classList.remove('show');
    
    if (this.activeTooltip === element) {
      this.activeTooltip = null;
    }
  }
  
  /**
   * Position tooltip to avoid overflow
   */
  position(tooltip, element) {
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = tooltip.classList.contains('top') ? 'top' :
                    tooltip.classList.contains('bottom') ? 'bottom' :
                    tooltip.classList.contains('left') ? 'left' : 'right';
    
    // Check if tooltip overflows viewport
    const overflowTop = tooltipRect.top < 0;
    const overflowBottom = tooltipRect.bottom > window.innerHeight;
    const overflowLeft = tooltipRect.left < 0;
    const overflowRight = tooltipRect.right > window.innerWidth;
    
    // Adjust position if needed
    if (position === 'top' && overflowTop) {
      tooltip.classList.remove('top');
      tooltip.classList.add('bottom');
    } else if (position === 'bottom' && overflowBottom) {
      tooltip.classList.remove('bottom');
      tooltip.classList.add('top');
    } else if (position === 'left' && overflowLeft) {
      tooltip.classList.remove('left');
      tooltip.classList.add('right');
    } else if (position === 'right' && overflowRight) {
      tooltip.classList.remove('right');
      tooltip.classList.add('left');
    }
  }
  
  /**
   * Update tooltip text
   */
  update(element, text) {
    const tooltip = this.tooltips.get(element);
    if (!tooltip) return;
    
    tooltip.textContent = text;
    element.setAttribute('data-tooltip', text);
  }
  
  /**
   * Remove tooltip
   */
  remove(element) {
    const tooltip = this.tooltips.get(element);
    if (!tooltip) return;
    
    this.hide(element);
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    }
    this.tooltips.delete(element);
  }
  
  /**
   * Destroy all tooltips
   */
  destroy() {
    this.tooltips.forEach((tooltip, element) => {
      this.remove(element);
    });
    this.tooltips.clear();
  }
}

// Create global instance
const tooltipSystem = new TooltipSystem();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TooltipSystem, tooltipSystem };
}
