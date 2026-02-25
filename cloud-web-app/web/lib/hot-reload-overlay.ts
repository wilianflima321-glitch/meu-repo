import type { HotReloadEvent } from './hot-reload-system';

interface HotReloadEventSource {
  on(callback: (event: HotReloadEvent) => void): () => void;
}

export class HotReloadOverlay {
  private container: HTMLDivElement | null = null;
  private manager: HotReloadEventSource;
  private visible: boolean = false;
  private notifications: { message: string; type: string; timestamp: number }[] = [];
  
  constructor(manager: HotReloadEventSource) {
    this.manager = manager;
    
    // Listen for events
    manager.on((event) => {
      this.handleEvent(event);
    });
  }
  
  private handleEvent(event: HotReloadEvent): void {
    let message: string;
    let type: string;
    
    switch (event.type) {
      case 'reload':
        message = `Reloaded: ${event.modules?.join(', ') || 'unknown'}`;
        type = 'success';
        break;
      case 'update':
        message = `Updated: ${event.modules?.join(', ') || 'unknown'}`;
        type = 'info';
        break;
      case 'error':
        message = `Error: ${event.error?.message || 'Unknown error'}`;
        type = 'error';
        break;
      case 'connected':
        message = 'Connected to dev server';
        type = 'success';
        break;
      case 'disconnected':
        message = 'Disconnected from dev server';
        type = 'warning';
        break;
      default:
        return;
    }
    
    this.showNotification(message, type);
  }
  
  private showNotification(message: string, type: string): void {
    const notification = { message, type, timestamp: Date.now() };
    this.notifications.push(notification);
    
    // Limit notifications
    if (this.notifications.length > 5) {
      this.notifications.shift();
    }
    
    this.render();
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      const index = this.notifications.indexOf(notification);
      if (index !== -1) {
        this.notifications.splice(index, 1);
        this.render();
      }
    }, 3000);
  }
  
  show(parent: HTMLElement = document.body): void {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.id = 'hot-reload-overlay';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99998;
      pointer-events: none;
    `;
    
    parent.appendChild(this.container);
    this.visible = true;
  }
  
  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.visible = false;
  }
  
  private render(): void {
    if (!this.container) return;
    
    const colors: Record<string, { bg: string; border: string }> = {
      success: { bg: 'rgba(76, 175, 80, 0.9)', border: '#4CAF50' },
      info: { bg: 'rgba(33, 150, 243, 0.9)', border: '#2196F3' },
      warning: { bg: 'rgba(255, 152, 0, 0.9)', border: '#FF9800' },
      error: { bg: 'rgba(244, 67, 54, 0.9)', border: '#F44336' },
    };
    
    this.container.innerHTML = this.notifications.map(n => `
      <div style="
        background: ${colors[n.type]?.bg || colors.info.bg};
        border-left: 4px solid ${colors[n.type]?.border || colors.info.border};
        color: white;
        padding: 10px 15px;
        margin-bottom: 8px;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        animation: slideIn 0.2s ease-out;
        pointer-events: auto;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">
            ${n.type === 'success' ? '✓' : n.type === 'error' ? '✗' : n.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span>${this.escapeHtml(n.message)}</span>
        </div>
      </div>
    `).join('');
    
    // Add animation keyframes if not present
    if (!document.getElementById('hot-reload-styles')) {
      const style = document.createElement('style');
      style.id = 'hot-reload-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  isVisible(): boolean {
    return this.visible;
  }
}
