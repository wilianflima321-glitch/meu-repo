/**
 * AETHEL GAME RUNTIME - Preload Script
 * 
 * Exposes safe APIs to the renderer process (game).
 * Context isolation enabled for security.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose Aethel Runtime API to the game
contextBridge.exposeInMainWorld('AethelRuntime', {
    // =========================================================================
    // GAME LIFECYCLE
    // =========================================================================
    
    /**
     * Get the game configuration from game.json
     */
    getGameConfig: () => ipcRenderer.invoke('get-game-config'),
    
    /**
     * Quit the game
     */
    quit: () => ipcRenderer.invoke('quit-game'),
    
    // =========================================================================
    // SETTINGS
    // =========================================================================
    
    /**
     * Get current user settings
     */
    getSettings: () => ipcRenderer.invoke('get-settings'),
    
    /**
     * Update user settings
     */
    setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
    
    /**
     * Get available screen resolutions
     */
    getAvailableResolutions: () => ipcRenderer.invoke('get-available-resolutions'),
    
    /**
     * Change resolution
     */
    setResolution: (width, height) => ipcRenderer.invoke('set-resolution', width, height),
    
    /**
     * Toggle fullscreen
     */
    setFullscreen: (fullscreen) => ipcRenderer.invoke('set-fullscreen', fullscreen),
    
    // =========================================================================
    // ASSETS
    // =========================================================================
    
    /**
     * Load a binary asset (textures, models, audio)
     * @param {string} path - Relative path from assets folder
     * @returns {Promise<{success: boolean, data?: ArrayBuffer, error?: string}>}
     */
    loadAsset: (path) => ipcRenderer.invoke('read-asset', path),
    
    /**
     * Load a scene definition
     * @param {string} sceneName - Scene name without extension
     * @returns {Promise<{success: boolean, scene?: object, error?: string}>}
     */
    loadScene: (sceneName) => ipcRenderer.invoke('load-scene', sceneName),
    
    // =========================================================================
    // SAVE SYSTEM
    // =========================================================================
    
    /**
     * Save game state to a slot
     * @param {string} slot - Save slot identifier
     * @param {object} data - Save data
     */
    saveGame: (slot, data) => ipcRenderer.invoke('save-game', slot, data),
    
    /**
     * Load game state from a slot
     * @param {string} slot - Save slot identifier
     */
    loadGame: (slot) => ipcRenderer.invoke('load-game', slot),
    
    /**
     * List all available save slots
     */
    listSaves: () => ipcRenderer.invoke('list-saves'),
    
    // =========================================================================
    // PLATFORM INFO
    // =========================================================================
    
    /**
     * Get platform information
     */
    getPlatform: () => ({
        os: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
    }),
    
    /**
     * Check if running in development mode
     */
    isDev: () => !!process.env.AETHEL_DEV
});

// Performance monitoring
contextBridge.exposeInMainWorld('AethelPerf', {
    /**
     * Get memory usage
     */
    getMemoryUsage: () => process.memoryUsage(),
    
    /**
     * Get CPU usage (requires sampling over time in renderer)
     */
    getCPUUsage: () => process.cpuUsage(),
    
    /**
     * Force garbage collection (if available)
     */
    gc: () => {
        if (global.gc) {
            global.gc();
            return true;
        }
        return false;
    }
});

console.log('[Preload] Aethel Runtime API exposed');
