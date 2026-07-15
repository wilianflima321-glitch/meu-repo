/**
 * AETHEL GAME RUNTIME - Linux Main Process
 * 
 * Electron main process optimized for Linux.
 * Handles game window, system tray, and Linux-specific features.
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, shell, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// ============================================================================
// CONFIGURATION
// ============================================================================

const store = new Store({
    name: 'user-settings',
    defaults: {
        volume: { master: 1.0, music: 0.8, sfx: 1.0, voice: 1.0 },
        graphics: { quality: 'high', vsync: true, fullscreen: false },
        resolution: null,
        lastSave: null
    }
});

let mainWindow = null;
let tray = null;
let gameConfig = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// ============================================================================
// WINDOW CREATION
// ============================================================================

async function createWindow() {
    // Load game config
    const configPath = path.join(app.getAppPath(), 'game.json');
    try {
        const configData = fs.readFileSync(configPath, 'utf-8');
        gameConfig = JSON.parse(configData);
    } catch (error) {
        gameConfig = {
            name: 'Aethel Game',
            version: '1.0.0',
            resolution: { width: 1920, height: 1080 }
        };
    }
    
    const settings = store.store;
    const res = settings.resolution || gameConfig.resolution;
    
    // Disable GPU sandbox for better compatibility on some Linux systems
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
    
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: res?.width || 1920,
        height: res?.height || 1080,
        minWidth: 1280,
        minHeight: 720,
        title: gameConfig.name,
        fullscreen: settings.graphics?.fullscreen || false,
        fullscreenable: true,
        show: false,
        backgroundColor: '#000000',
        frame: true,
        icon: path.join(__dirname, 'build', 'icons', '512x512.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            allowRunningInsecureContent: false
        }
    });
    
    // Load the game
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        createMenu();
        createTray();
    });
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // Handle fullscreen events
    mainWindow.on('enter-full-screen', () => {
        mainWindow.webContents.send('fullscreen-changed', true);
    });
    
    mainWindow.on('leave-full-screen', () => {
        mainWindow.webContents.send('fullscreen-changed', false);
    });
}

// ============================================================================
// MENU
// ============================================================================

function createMenu() {
    const template = [
        {
            label: 'Game',
            submenu: [
                {
                    label: 'New Game',
                    accelerator: 'Ctrl+N',
                    click: () => mainWindow.webContents.send('new-game')
                },
                {
                    label: 'Continue',
                    accelerator: 'Ctrl+Shift+N',
                    click: () => mainWindow.webContents.send('continue-game')
                },
                { type: 'separator' },
                {
                    label: 'Save Game',
                    accelerator: 'Ctrl+S',
                    click: () => mainWindow.webContents.send('save-game')
                },
                {
                    label: 'Load Game',
                    accelerator: 'Ctrl+O',
                    click: () => mainWindow.webContents.send('load-game')
                },
                { type: 'separator' },
                {
                    label: 'Settings',
                    accelerator: 'Ctrl+,',
                    click: () => mainWindow.webContents.send('show-settings')
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Ctrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Full Screen',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                { type: 'separator' },
                {
                    label: 'Show FPS',
                    accelerator: 'F3',
                    type: 'checkbox',
                    checked: false,
                    click: (menuItem) => {
                        mainWindow.webContents.send('toggle-fps', menuItem.checked);
                    }
                },
                {
                    label: 'Developer Tools',
                    accelerator: 'Ctrl+Shift+I',
                    click: () => mainWindow.webContents.toggleDevTools()
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => shell.openExternal('https://aethel.io/docs')
                },
                {
                    label: 'Report Bug',
                    click: () => shell.openExternal('https://aethel.io/support')
                },
                { type: 'separator' },
                {
                    label: `About ${gameConfig.name}`,
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: `About ${gameConfig.name}`,
                            message: gameConfig.name,
                            detail: `Version ${gameConfig.version}\n\nPowered by Aethel Engine`
                        });
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// ============================================================================
// SYSTEM TRAY
// ============================================================================

function createTray() {
    const iconPath = path.join(__dirname, 'build', 'icons', '32x32.png');
    
    if (fs.existsSync(iconPath)) {
        const icon = nativeImage.createFromPath(iconPath);
        tray = new Tray(icon);
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show Game',
                click: () => {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => app.quit()
            }
        ]);
        
        tray.setToolTip(gameConfig.name);
        tray.setContextMenu(contextMenu);
        
        tray.on('click', () => {
            mainWindow.show();
            mainWindow.focus();
        });
    }
}

// ============================================================================
// IPC HANDLERS
// ============================================================================

// Get game configuration
ipcMain.handle('get-game-config', () => gameConfig);

// Get user settings
ipcMain.handle('get-settings', () => store.store);

// Save settings
ipcMain.handle('save-settings', (event, settings) => {
    store.set(settings);
    return { success: true };
});

// Fullscreen toggle
ipcMain.handle('toggle-fullscreen', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
});

// Load scene from assets
ipcMain.handle('load-scene', async (event, sceneName) => {
    try {
        const scenePath = path.join(app.getAppPath(), 'assets', 'scenes', `${sceneName}.json`);
        const sceneData = fs.readFileSync(scenePath, 'utf-8');
        return { success: true, scene: JSON.parse(sceneData) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Load asset
ipcMain.handle('load-asset', async (event, assetPath) => {
    try {
        const fullPath = path.join(app.getAppPath(), 'assets', assetPath);
        const data = fs.readFileSync(fullPath);
        return { success: true, data: data.toString('base64') };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Save game
ipcMain.handle('save-game', async (event, slot, data) => {
    try {
        const savesDir = path.join(app.getPath('userData'), 'saves');
        if (!fs.existsSync(savesDir)) {
            fs.mkdirSync(savesDir, { recursive: true });
        }
        
        const savePath = path.join(savesDir, `${slot}.json`);
        fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
        store.set('lastSave', slot);
        
        return { success: true, path: savePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Load game
ipcMain.handle('load-game', async (event, slot) => {
    try {
        const savePath = path.join(app.getPath('userData'), 'saves', `${slot}.json`);
        const data = fs.readFileSync(savePath, 'utf-8');
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// List saves
ipcMain.handle('list-saves', async () => {
    try {
        const savesDir = path.join(app.getPath('userData'), 'saves');
        if (!fs.existsSync(savesDir)) {
            return { success: true, saves: [] };
        }
        
        const files = fs.readdirSync(savesDir)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const fullPath = path.join(savesDir, f);
                const stats = fs.statSync(fullPath);
                return {
                    slot: f.replace('.json', ''),
                    modifiedTime: stats.mtime
                };
            });
        
        return { success: true, saves: files };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Quit
ipcMain.handle('quit', () => {
    app.quit();
});

// Get platform info
ipcMain.handle('get-platform', () => ({
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    // Linux-specific info
    desktopEnvironment: process.env.XDG_CURRENT_DESKTOP || process.env.DESKTOP_SESSION || 'unknown',
    displayServer: process.env.XDG_SESSION_TYPE || (process.env.WAYLAND_DISPLAY ? 'wayland' : 'x11')
}));

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (tray) tray.destroy();
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

console.log('[Aethel] Linux game runtime starting...');
