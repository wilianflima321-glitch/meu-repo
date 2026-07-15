/**
 * AETHEL GAME RUNTIME - macOS Preload Script
 * 
 * Context-isolated bridge between renderer and main process.
 * macOS-optimized with Touch Bar support hooks.
 */

const { contextBridge, ipcRenderer } = require('electron');

// ============================================================================
// AETHEL RUNTIME API
// ============================================================================

contextBridge.exposeInMainWorld('AethelRuntime', {
    // Game Configuration
    getGameConfig: () => ipcRenderer.invoke('get-game-config'),
    
    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    
    // Scene Management
    loadScene: (sceneName) => ipcRenderer.invoke('load-scene', sceneName),
    
    // Asset Loading
    loadAsset: (assetPath) => ipcRenderer.invoke('load-asset', assetPath),
    
    // Save/Load System
    saveGame: (slot, data) => ipcRenderer.invoke('save-game', slot, data),
    loadGame: (slot) => ipcRenderer.invoke('load-game', slot),
    listSaves: () => ipcRenderer.invoke('list-saves'),
    
    // Window Controls
    toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
    quit: () => ipcRenderer.invoke('quit'),
    
    // Platform Info
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    
    // Event Listeners
    onFullscreenChanged: (callback) => {
        ipcRenderer.on('fullscreen-changed', (_, isFullscreen) => callback(isFullscreen));
    },
    onTogglePause: (callback) => {
        ipcRenderer.on('toggle-pause', () => callback());
    },
    onShowSettings: (callback) => {
        ipcRenderer.on('show-settings', () => callback());
    },
    onNewGame: (callback) => {
        ipcRenderer.on('new-game', () => callback());
    },
    onContinueGame: (callback) => {
        ipcRenderer.on('continue-game', () => callback());
    },
    onSaveGame: (callback) => {
        ipcRenderer.on('save-game', () => callback());
    },
    onLoadGame: (callback) => {
        ipcRenderer.on('load-game', () => callback());
    },
    onToggleFPS: (callback) => {
        ipcRenderer.on('toggle-fps', (_, show) => callback(show));
    }
});

// ============================================================================
// PERFORMANCE API
// ============================================================================

contextBridge.exposeInMainWorld('AethelPerf', {
    // Memory usage (approximation)
    getMemoryUsage: () => {
        if (performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    },
    
    // High-resolution time
    now: () => performance.now(),
    
    // Mark for profiling
    mark: (name) => performance.mark(name),
    measure: (name, startMark, endMark) => performance.measure(name, startMark, endMark),
    getEntries: () => performance.getEntries()
});

// ============================================================================
// macOS SPECIFIC
// ============================================================================

contextBridge.exposeInMainWorld('AethelMac', {
    // Check if Touch Bar is available
    hasTouchBar: () => process.platform === 'darwin',
    
    // Appearance
    getAppearance: () => {
        if (window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'unknown';
    },
    
    // Reduce motion preference
    prefersReducedMotion: () => {
        if (window.matchMedia) {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        return false;
    }
});

console.log('[Aethel] macOS Runtime API loaded');
