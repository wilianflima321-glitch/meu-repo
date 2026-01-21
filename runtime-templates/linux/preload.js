/**
 * AETHEL GAME RUNTIME - Linux Preload Script
 * 
 * Context-isolated bridge between renderer and main process.
 * Linux-optimized with desktop integration hooks.
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
    // Memory usage
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
    
    // Profiling
    mark: (name) => performance.mark(name),
    measure: (name, startMark, endMark) => performance.measure(name, startMark, endMark),
    getEntries: () => performance.getEntries()
});

// ============================================================================
// LINUX SPECIFIC
// ============================================================================

contextBridge.exposeInMainWorld('AethelLinux', {
    // Check Wayland vs X11
    isWayland: () => {
        return process.env.XDG_SESSION_TYPE === 'wayland' || !!process.env.WAYLAND_DISPLAY;
    },
    
    // Get desktop environment
    getDesktopEnvironment: () => {
        return process.env.XDG_CURRENT_DESKTOP || 
               process.env.DESKTOP_SESSION || 
               'unknown';
    },
    
    // Accessibility preferences
    prefersReducedMotion: () => {
        if (window.matchMedia) {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        return false;
    },
    
    // Color scheme
    getColorScheme: () => {
        if (window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'unknown';
    }
});

console.log('[Aethel] Linux Runtime API loaded');
