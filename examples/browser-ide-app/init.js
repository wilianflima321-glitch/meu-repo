/**
 * Initialization Script
 * Ensures all systems are loaded and ready
 */

(function() {
  'use strict';

  // Track loading status
  const loadingStatus = {
    icons: false,
    integrationHub: false,
    theme: false,
    toast: false,
    navbar: false,
    breadcrumbs: false,
    fileExplorer: false
  };

  // Check if all required systems are loaded
  function checkSystems() {
    loadingStatus.icons = typeof Icons !== 'undefined';
    loadingStatus.integrationHub = typeof window.IntegrationHub !== 'undefined';
    loadingStatus.theme = typeof ThemeToggle !== 'undefined';
    loadingStatus.toast = typeof window.ToastSystem !== 'undefined';
    loadingStatus.navbar = typeof window.GlobalNavbar !== 'undefined';
    loadingStatus.breadcrumbs = typeof window.Breadcrumbs !== 'undefined';
    
    // File explorer is optional (only on editor pages)
    const editorPages = ['monaco-editor', 'visual-scripting', '3d-viewport'];
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    if (editorPages.includes(currentPage)) {
      loadingStatus.fileExplorer = typeof window.FileExplorer !== 'undefined';
    } else {
      loadingStatus.fileExplorer = true; // Not required
    }

    return loadingStatus;
  }

  // Initialize when DOM is ready
  function init() {
    console.log('🚀 Initializing AI IDE...');

    // Wait a bit for all scripts to load
    setTimeout(() => {
      const status = checkSystems();
      
      // Log status
      console.log('📊 System Status:', status);

      // Check if all required systems are loaded
      const allLoaded = Object.values(status).every(v => v === true);

      if (allLoaded) {
        console.log('✅ All systems loaded successfully!');
        
        // Show success toast if available
        if (window.ToastSystem) {
          window.ToastSystem.show('IDE Ready!', 'success');
        }

        // Emit ready event
        if (window.IntegrationHub) {
          window.IntegrationHub.emit('ide:ready', { timestamp: Date.now() });
        }
      } else {
        console.warn('⚠️ Some systems failed to load:', status);
        
        // Show warning
        const missing = Object.entries(status)
          .filter(([_, loaded]) => !loaded)
          .map(([name]) => name);
        
        console.error('❌ Missing systems:', missing);
      }
    }, 500);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose status checker
  window.checkIDEStatus = checkSystems;
})();
