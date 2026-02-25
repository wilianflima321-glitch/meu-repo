/**
 * Client runtime script generator for hot-reload websocket runtime.
 */
export function generateHotReloadClientScript(port: number): string {
  return `
(function() {
  'use strict';

  // Hot Reload Client for Aethel Engine
  const HotReloadClient = {
    socket: null,
    clientId: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    errorOverlay: null,
    
    init: function(wsUrl) {
      this.wsUrl = wsUrl || 'ws://' + location.hostname + ':${port}';
      this.connect();
    },
    
    connect: function() {
      try {
        this.socket = new WebSocket(this.wsUrl);
        
        this.socket.onopen = () => {
          console.log('[HMR] Connected to Hot Reload Server');
          this.reconnectAttempts = 0;
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        
        this.socket.onclose = () => {
          console.log('[HMR] Disconnected from Hot Reload Server');
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('[HMR] WebSocket error:', error);
        };
      } catch (error) {
        console.error('[HMR] Failed to connect:', error);
        this.attemptReconnect();
      }
    },
    
    attemptReconnect: function() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        console.log('[HMR] Reconnecting in ' + Math.round(delay) + 'ms...');
        setTimeout(() => this.connect(), delay);
      }
    },
    
    handleMessage: function(message) {
      switch (message.type) {
        case 'connected':
          this.clientId = message.clientId;
          console.log('[HMR] Client ID:', message.clientId);
          break;
          
        case 'ping':
          this.send({ type: 'pong', timestamp: Date.now() });
          break;
          
        case 'update':
          this.handleUpdate(message);
          break;
          
        case 'reload':
          console.log('[HMR] Full reload:', message.reason);
          location.reload();
          break;
          
        case 'error':
          this.showErrorOverlay(message.error);
          break;
          
        case 'clear-error':
          this.hideErrorOverlay();
          break;
          
        case 'build-start':
          console.log('[HMR] Build started...');
          break;
          
        case 'build-end':
          console.log('[HMR] Build completed in ' + message.duration + 'ms');
          break;
      }
    },
    
    handleUpdate: function(message) {
      console.log('[HMR] Received update:', message.strategy, message.files.map(f => f.path));
      
      switch (message.strategy) {
        case 'css-inject':
          this.injectCSS(message.files);
          break;
          
        case 'hmr':
          this.applyHMR(message.files);
          break;
          
        case 'full-reload':
          location.reload();
          break;
      }
    },
    
    injectCSS: function(files) {
      files.forEach(file => {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        let updated = false;
        
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href.includes(file.path.replace(/\\\\/g, '/'))) {
            const newHref = href.split('?')[0] + '?t=' + Date.now();
            link.setAttribute('href', newHref);
            updated = true;
            console.log('[HMR] CSS updated:', file.path);
          }
        });
        
        if (!updated && file.content) {
          const style = document.createElement('style');
          style.setAttribute('data-hmr-path', file.path);
          style.textContent = file.content;
          document.head.appendChild(style);
          console.log('[HMR] CSS injected:', file.path);
        }
      });
    },
    
    applyHMR: function(files) {
      let reloadNeeded = false;
      
      files.forEach(file => {
        if (window.__HMR_MODULES__ && window.__HMR_MODULES__[file.path]) {
          try {
            window.__HMR_MODULES__[file.path](file);
            console.log('[HMR] Module updated:', file.path);
            this.send({ type: 'hmr-accept', path: file.path });
          } catch (error) {
            console.error('[HMR] Module update failed:', file.path, error);
            this.send({ type: 'hmr-decline', path: file.path });
            reloadNeeded = true;
          }
        } else {
          reloadNeeded = true;
        }
      });
      
      if (reloadNeeded) {
        console.log('[HMR] HMR not available, reloading...');
        location.reload();
      }
    },
    
    showErrorOverlay: function(error) {
      this.hideErrorOverlay();
      
      const overlay = document.createElement('div');
      overlay.id = 'hmr-error-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);color:#ff6b6b;font-family:monospace;font-size:14px;padding:40px;z-index:999999;overflow:auto;';
      
      let html = '<div style="max-width:900px;margin:0 auto;">';
      html += '<h2 style="color:#ff6b6b;margin:0 0 20px;">Build Error</h2>';
      html += '<pre style="background:#1a1a1a;padding:20px;border-radius:8px;overflow:auto;white-space:pre-wrap;word-wrap:break-word;">';
      html += this.escapeHtml(error.message);
      
      if (error.file) {
        html += '\\n\\nFile: ' + this.escapeHtml(error.file);
        if (error.line) html += ':' + error.line;
        if (error.column) html += ':' + error.column;
      }
      
      if (error.frame) {
        html += '\\n\\n' + this.escapeHtml(error.frame);
      }
      
      if (error.stack) {
        html += '\\n\\nStack:\\n' + this.escapeHtml(error.stack);
      }
      
      html += '</pre>';
      html += '<button onclick="document.getElementById(\\'hmr-error-overlay\\').remove()" style="position:absolute;top:20px;right:20px;background:#333;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Close</button>';
      html += '</div>';
      
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      this.errorOverlay = overlay;
    },
    
    hideErrorOverlay: function() {
      if (this.errorOverlay) {
        this.errorOverlay.remove();
        this.errorOverlay = null;
      }
      const existing = document.getElementById('hmr-error-overlay');
      if (existing) existing.remove();
    },
    
    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    send: function(message) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    }
  };
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HotReloadClient.init());
  } else {
    HotReloadClient.init();
  }
  
  // Export for global access
  window.HotReloadClient = HotReloadClient;
  window.__HMR_MODULES__ = window.__HMR_MODULES__ || {};
})();
`;
}
