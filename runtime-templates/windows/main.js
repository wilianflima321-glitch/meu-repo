/**
 * AETHEL GAME RUNTIME - Electron Main Process
 * 
 * Standalone game player for exported Aethel Engine games.
 * This is the template that gets bundled with user's game assets.
 */

const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Game configuration loaded from game.json
let gameConfig = {
    name: 'Aethel Game',
    version: '1.0.0',
    resolution: { width: 1920, height: 1080 },
    fullscreen: false,
    vsync: true,
    antialiasing: true,
    shadowQuality: 'high',
    textureQuality: 'high',
    physicsTickRate: 60,
    maxFPS: 0, // 0 = unlimited
    startScene: 'main',
    splashScreen: null,
    icon: null
};

// Load game configuration
function loadGameConfig() {
    const configPath = path.join(__dirname, 'game.json');
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            gameConfig = { ...gameConfig, ...data };
            console.log('[Runtime] Game config loaded:', gameConfig.name);
        }
    } catch (error) {
        console.error('[Runtime] Failed to load game.json:', error);
    }
}

// User settings (persisted)
let userSettings = {
    resolution: null,
    fullscreen: null,
    vsync: null,
    volume: { master: 1.0, music: 0.8, sfx: 1.0, voice: 1.0 },
    language: 'en',
    graphicsPreset: 'high',
    customGraphics: null
};

function loadUserSettings() {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
        if (fs.existsSync(settingsPath)) {
            userSettings = { ...userSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
        }
    } catch (error) {
        console.warn('[Runtime] Could not load user settings, using defaults');
    }
}

function saveUserSettings() {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(userSettings, null, 2));
    } catch (error) {
        console.error('[Runtime] Failed to save settings:', error);
    }
}

// Main window
let mainWindow = null;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Determine resolution
    const resolution = userSettings.resolution || gameConfig.resolution;
    const isFullscreen = userSettings.fullscreen ?? gameConfig.fullscreen;
    
    mainWindow = new BrowserWindow({
        width: isFullscreen ? screenWidth : resolution.width,
        height: isFullscreen ? screenHeight : resolution.height,
        fullscreen: isFullscreen,
        fullscreenable: true,
        resizable: !isFullscreen,
        frame: !isFullscreen,
        title: gameConfig.name,
        icon: gameConfig.icon ? path.join(__dirname, gameConfig.icon) : undefined,
        backgroundColor: '#000000',
        show: false, // Show after ready
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webgl: true,
            webSecurity: true,
            allowRunningInsecureContent: false
        }
    });

    // Load the game
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        if (gameConfig.splashScreen) {
            // Show splash then game
            setTimeout(() => mainWindow.show(), 100);
        } else {
            mainWindow.show();
        }
    });

    // Handle close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Disable menu in production
    if (!process.env.AETHEL_DEV) {
        mainWindow.setMenu(null);
    }

    // Handle F11 for fullscreen toggle
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            const isFullscreen = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFullscreen);
            userSettings.fullscreen = !isFullscreen;
            saveUserSettings();
        }
    });
}

// App lifecycle
app.whenReady().then(() => {
    loadGameConfig();
    loadUserSettings();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers for game <-> runtime communication

// Settings
ipcMain.handle('get-settings', () => userSettings);
ipcMain.handle('set-settings', (event, newSettings) => {
    userSettings = { ...userSettings, ...newSettings };
    saveUserSettings();
    return userSettings;
});

// Game config
ipcMain.handle('get-game-config', () => gameConfig);

// Resolution
ipcMain.handle('set-resolution', (event, width, height) => {
    if (mainWindow) {
        mainWindow.setSize(width, height);
        userSettings.resolution = { width, height };
        saveUserSettings();
    }
});

ipcMain.handle('set-fullscreen', (event, fullscreen) => {
    if (mainWindow) {
        mainWindow.setFullScreen(fullscreen);
        userSettings.fullscreen = fullscreen;
        saveUserSettings();
    }
});

ipcMain.handle('get-available-resolutions', () => {
    const displays = screen.getAllDisplays();
    const resolutions = new Set();
    
    // Common resolutions
    const common = [
        { width: 1280, height: 720 },
        { width: 1366, height: 768 },
        { width: 1600, height: 900 },
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 },
        { width: 3840, height: 2160 }
    ];
    
    displays.forEach(display => {
        resolutions.add(JSON.stringify({ width: display.size.width, height: display.size.height }));
    });
    
    common.forEach(res => {
        displays.forEach(display => {
            if (res.width <= display.size.width && res.height <= display.size.height) {
                resolutions.add(JSON.stringify(res));
            }
        });
    });
    
    return Array.from(resolutions).map(r => JSON.parse(r)).sort((a, b) => a.width - b.width);
});

// File system (sandboxed to game directory)
ipcMain.handle('read-asset', async (event, relativePath) => {
    const safePath = path.join(__dirname, 'assets', path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, ''));
    try {
        const data = await fs.promises.readFile(safePath);
        return { success: true, data: data.buffer };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-scene', async (event, sceneName) => {
    const scenePath = path.join(__dirname, 'scenes', `${sceneName}.json`);
    try {
        const data = await fs.promises.readFile(scenePath, 'utf8');
        return { success: true, scene: JSON.parse(data) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Save/Load game state
ipcMain.handle('save-game', async (event, slot, data) => {
    const savePath = path.join(app.getPath('userData'), 'saves');
    await fs.promises.mkdir(savePath, { recursive: true });
    const saveFile = path.join(savePath, `save_${slot}.json`);
    try {
        await fs.promises.writeFile(saveFile, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-game', async (event, slot) => {
    const saveFile = path.join(app.getPath('userData'), 'saves', `save_${slot}.json`);
    try {
        const data = await fs.promises.readFile(saveFile, 'utf8');
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('list-saves', async () => {
    const savePath = path.join(app.getPath('userData'), 'saves');
    try {
        await fs.promises.mkdir(savePath, { recursive: true });
        const files = await fs.promises.readdir(savePath);
        const saves = [];
        for (const file of files) {
            if (file.startsWith('save_') && file.endsWith('.json')) {
                const stat = await fs.promises.stat(path.join(savePath, file));
                saves.push({
                    slot: file.replace('save_', '').replace('.json', ''),
                    modified: stat.mtime
                });
            }
        }
        return saves;
    } catch (error) {
        return [];
    }
});

// Quit game
ipcMain.handle('quit-game', () => {
    app.quit();
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('[Runtime] Uncaught exception:', error);
    dialog.showErrorBox('Game Error', `An unexpected error occurred:\n${error.message}`);
});

console.log('[Runtime] Aethel Game Runtime initialized');
