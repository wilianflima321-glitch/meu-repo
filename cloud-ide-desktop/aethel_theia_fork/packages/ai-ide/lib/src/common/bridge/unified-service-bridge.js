"use strict";
/**
 * Unified Service Bridge - Integration Layer
 *
 * Ponte de unificação entre sistemas Theia e WebApp.
 * Este módulo conecta os sistemas canônicos do Theia
 * com os managers do cloud-web-app, evitando duplicação.
 *
 * Sistemas Unificados:
 * - Search: SearchSystem (Theia) + SearchManager (WebApp)
 * - Keyboard: KeybindingSystem (Theia) + KeyboardManager (WebApp)
 * - Notifications: NotificationSystem (Theia) + NotificationCenter (WebApp)
 * - Theme: ThemeSystem (Theia) + ThemeManager (WebApp)
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAppThemeAdapter = exports.WebAppNotificationAdapter = exports.WebAppKeybindingAdapter = exports.WebAppSearchAdapter = exports.UnifiedServiceBridge = exports.ServiceType = exports.BridgeState = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Unified Types ====================
/**
 * Bridge state
 */
var BridgeState;
(function (BridgeState) {
    BridgeState["Disconnected"] = "disconnected";
    BridgeState["Connecting"] = "connecting";
    BridgeState["Connected"] = "connected";
    BridgeState["Error"] = "error";
})(BridgeState || (exports.BridgeState = BridgeState = {}));
/**
 * Service type
 */
var ServiceType;
(function (ServiceType) {
    ServiceType["Search"] = "search";
    ServiceType["Keybinding"] = "keybinding";
    ServiceType["Notification"] = "notification";
    ServiceType["Theme"] = "theme";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
// ==================== Main Unified Service Bridge ====================
let UnifiedServiceBridge = class UnifiedServiceBridge {
    constructor() {
        // State
        this.state = BridgeState.Disconnected;
        this.config = {};
        // Sync status
        this.syncStatus = new Map();
        // Service references (would be injected)
        this.searchSystem = null;
        this.keybindingSystem = null;
        this.notificationSystem = null;
        this.themeSystem = null;
        // WebApp adapters
        this.webAppSearchAdapter = null;
        this.webAppKeybindingAdapter = null;
        this.webAppNotificationAdapter = null;
        this.webAppThemeAdapter = null;
        // Sync timers
        this.syncTimer = null;
        // Events
        this.onStateChangedEmitter = new Emitter();
        this.onStateChanged = this.onStateChangedEmitter.event;
        this.onSyncCompletedEmitter = new Emitter();
        this.onSyncCompleted = this.onSyncCompletedEmitter.event;
        this.onErrorEmitter = new Emitter();
        this.onError = this.onErrorEmitter.event;
        // Initialize sync status
        for (const service of Object.values(ServiceType)) {
            this.syncStatus.set(service, {
                service,
                lastSync: 0,
                inSync: false,
                pendingChanges: 0
            });
        }
    }
    // ==================== Initialization ====================
    /**
     * Initialize the bridge
     */
    async initialize(config) {
        this.config = config;
        this.state = BridgeState.Connecting;
        this.onStateChangedEmitter.fire(this.state);
        try {
            // Connect to WebApp if endpoint provided
            if (config.webAppEndpoint) {
                await this.connectToWebApp(config.webAppEndpoint);
            }
            // Start sync if enabled
            if (config.syncInterval && config.syncInterval > 0) {
                this.startSync(config.syncInterval);
            }
            this.state = BridgeState.Connected;
            this.onStateChangedEmitter.fire(this.state);
        }
        catch (error) {
            this.state = BridgeState.Error;
            this.onStateChangedEmitter.fire(this.state);
            throw error;
        }
    }
    /**
     * Connect to WebApp
     */
    async connectToWebApp(endpoint) {
        // TODO: Implement WebSocket or HTTP connection to WebApp
        console.log(`Connecting to WebApp at ${endpoint}...`);
    }
    /**
     * Register Theia systems
     */
    registerTheiaSystems(systems) {
        if (systems.search)
            this.searchSystem = systems.search;
        if (systems.keybinding)
            this.keybindingSystem = systems.keybinding;
        if (systems.notification)
            this.notificationSystem = systems.notification;
        if (systems.theme)
            this.themeSystem = systems.theme;
    }
    /**
     * Register WebApp adapters
     */
    registerWebAppAdapters(adapters) {
        if (adapters.search)
            this.webAppSearchAdapter = adapters.search;
        if (adapters.keybinding)
            this.webAppKeybindingAdapter = adapters.keybinding;
        if (adapters.notification)
            this.webAppNotificationAdapter = adapters.notification;
        if (adapters.theme)
            this.webAppThemeAdapter = adapters.theme;
    }
    // ==================== Unified Search API ====================
    /**
     * Get unified search interface
     */
    getSearch() {
        const preferredSource = this.config.preferredSource || 'theia';
        const primary = preferredSource === 'theia' ? this.searchSystem : this.webAppSearchAdapter;
        const fallback = preferredSource === 'theia' ? this.webAppSearchAdapter : this.searchSystem;
        return {
            search: async (query) => {
                try {
                    if (primary) {
                        const results = await primary.search(query);
                        // Sync to secondary
                        this.syncSearchResults(query, results);
                        return results;
                    }
                    if (fallback) {
                        return fallback.search(query);
                    }
                    throw new Error('No search service available');
                }
                catch (error) {
                    this.onErrorEmitter.fire({ service: ServiceType.Search, error: error });
                    throw error;
                }
            },
            searchInFile: async (file, query) => {
                const service = primary || fallback;
                if (!service)
                    throw new Error('No search service available');
                return service.searchInFile(file, query);
            },
            replace: async (query, replacement) => {
                const service = primary || fallback;
                if (!service)
                    throw new Error('No search service available');
                return service.replace(query, replacement);
            },
            cancel: () => {
                primary?.cancel();
                fallback?.cancel();
            }
        };
    }
    /**
     * Sync search results to secondary
     */
    syncSearchResults(query, results) {
        // TODO: Sync search history/results to WebApp for UI display
        const status = this.syncStatus.get(ServiceType.Search);
        if (status) {
            status.lastSync = Date.now();
            status.inSync = true;
        }
        this.onSyncCompletedEmitter.fire(ServiceType.Search);
    }
    // ==================== Unified Keybinding API ====================
    /**
     * Get unified keybinding interface
     */
    getKeybinding() {
        const preferredSource = this.config.preferredSource || 'theia';
        const primary = preferredSource === 'theia' ? this.keybindingSystem : this.webAppKeybindingAdapter;
        const fallback = preferredSource === 'theia' ? this.webAppKeybindingAdapter : this.keybindingSystem;
        return {
            getKeybindings: () => {
                // Merge keybindings from both sources
                const theiaBindings = this.keybindingSystem?.getKeybindings() || [];
                const webAppBindings = this.webAppKeybindingAdapter?.getKeybindings() || [];
                // Deduplicate by command, prefer primary source
                const bindingsMap = new Map();
                // Add fallback first
                for (const binding of webAppBindings) {
                    bindingsMap.set(binding.command, binding);
                }
                // Override with primary
                for (const binding of theiaBindings) {
                    bindingsMap.set(binding.command, binding);
                }
                return Array.from(bindingsMap.values());
            },
            getKeybinding: (command) => {
                return (primary?.getKeybinding(command) || fallback?.getKeybinding(command));
            },
            setKeybinding: (keybinding) => {
                // Set on both sources
                this.keybindingSystem?.setKeybinding(keybinding);
                this.webAppKeybindingAdapter?.setKeybinding(keybinding);
                this.syncKeybindings();
            },
            removeKeybinding: (id) => {
                this.keybindingSystem?.removeKeybinding(id);
                this.webAppKeybindingAdapter?.removeKeybinding(id);
                this.syncKeybindings();
            },
            resetKeybinding: (command) => {
                this.keybindingSystem?.resetKeybinding(command);
                this.webAppKeybindingAdapter?.resetKeybinding(command);
                this.syncKeybindings();
            },
            executeCommand: async (command, args) => {
                const service = primary || fallback;
                if (!service)
                    throw new Error('No keybinding service available');
                return service.executeCommand(command, args);
            }
        };
    }
    /**
     * Sync keybindings between sources
     */
    syncKeybindings() {
        const status = this.syncStatus.get(ServiceType.Keybinding);
        if (status) {
            status.lastSync = Date.now();
            status.inSync = true;
        }
        this.onSyncCompletedEmitter.fire(ServiceType.Keybinding);
    }
    // ==================== Unified Notification API ====================
    /**
     * Get unified notification interface
     */
    getNotification() {
        const preferredSource = this.config.preferredSource || 'theia';
        const primary = preferredSource === 'theia' ? this.notificationSystem : this.webAppNotificationAdapter;
        const fallback = preferredSource === 'theia' ? this.webAppNotificationAdapter : this.notificationSystem;
        return {
            show: (notification) => {
                // Show on primary, sync to secondary
                let id = '';
                if (primary) {
                    id = primary.show(notification);
                }
                if (fallback && this.config.enableRealtime) {
                    fallback.show({ ...notification });
                }
                this.syncNotification(ServiceType.Notification);
                return id;
            },
            update: (id, updates) => {
                primary?.update(id, updates);
                fallback?.update(id, updates);
            },
            dismiss: (id) => {
                primary?.dismiss(id);
                fallback?.dismiss(id);
            },
            dismissAll: () => {
                primary?.dismissAll();
                fallback?.dismissAll();
            },
            getNotifications: () => {
                // Return from primary
                return primary?.getNotifications() || fallback?.getNotifications() || [];
            }
        };
    }
    /**
     * Sync notification
     */
    syncNotification(service) {
        const status = this.syncStatus.get(service);
        if (status) {
            status.lastSync = Date.now();
            status.inSync = true;
        }
        this.onSyncCompletedEmitter.fire(service);
    }
    // ==================== Unified Theme API ====================
    /**
     * Get unified theme interface
     */
    getTheme() {
        const preferredSource = this.config.preferredSource || 'theia';
        const primary = preferredSource === 'theia' ? this.themeSystem : this.webAppThemeAdapter;
        const fallback = preferredSource === 'theia' ? this.webAppThemeAdapter : this.themeSystem;
        return {
            getThemes: () => {
                // Merge themes from both sources
                const theiaThemes = this.themeSystem?.getThemes() || [];
                const webAppThemes = this.webAppThemeAdapter?.getThemes() || [];
                const themesMap = new Map();
                for (const theme of webAppThemes) {
                    themesMap.set(theme.id, theme);
                }
                for (const theme of theiaThemes) {
                    themesMap.set(theme.id, theme);
                }
                return Array.from(themesMap.values());
            },
            getCurrentTheme: () => {
                const theme = primary?.getCurrentTheme() || fallback?.getCurrentTheme();
                if (!theme) {
                    // Return default theme
                    return {
                        id: 'dark-default',
                        name: 'Dark Default',
                        type: 'dark',
                        colors: {}
                    };
                }
                return theme;
            },
            setTheme: async (themeId) => {
                // Set on both sources for consistency
                await Promise.all([
                    this.themeSystem?.setTheme(themeId),
                    this.webAppThemeAdapter?.setTheme(themeId)
                ]);
                this.syncTheme();
            },
            getColor: (colorId) => {
                return primary?.getColor(colorId) || fallback?.getColor(colorId);
            }
        };
    }
    /**
     * Sync theme
     */
    syncTheme() {
        const status = this.syncStatus.get(ServiceType.Theme);
        if (status) {
            status.lastSync = Date.now();
            status.inSync = true;
        }
        this.onSyncCompletedEmitter.fire(ServiceType.Theme);
    }
    // ==================== Sync Management ====================
    /**
     * Start automatic sync
     */
    startSync(intervalMs) {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        this.syncTimer = setInterval(() => {
            this.syncAll();
        }, intervalMs);
    }
    /**
     * Stop automatic sync
     */
    stopSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }
    /**
     * Sync all services
     */
    async syncAll() {
        // Sync keybindings
        this.syncKeybindings();
        // Sync theme
        this.syncTheme();
        // Note: Search and notifications are synced on-demand
    }
    /**
     * Get sync status
     */
    getSyncStatus(service) {
        return this.syncStatus.get(service);
    }
    /**
     * Get all sync statuses
     */
    getAllSyncStatuses() {
        return Array.from(this.syncStatus.values());
    }
    // ==================== State Management ====================
    /**
     * Get current state
     */
    getState() {
        return this.state;
    }
    /**
     * Is connected
     */
    isConnected() {
        return this.state === BridgeState.Connected;
    }
    // ==================== Dispose ====================
    /**
     * Dispose
     */
    dispose() {
        this.stopSync();
        this.searchSystem = null;
        this.keybindingSystem = null;
        this.notificationSystem = null;
        this.themeSystem = null;
        this.webAppSearchAdapter = null;
        this.webAppKeybindingAdapter = null;
        this.webAppNotificationAdapter = null;
        this.webAppThemeAdapter = null;
        this.syncStatus.clear();
        this.onStateChangedEmitter.dispose();
        this.onSyncCompletedEmitter.dispose();
        this.onErrorEmitter.dispose();
    }
};
exports.UnifiedServiceBridge = UnifiedServiceBridge;
exports.UnifiedServiceBridge = UnifiedServiceBridge = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], UnifiedServiceBridge);
// ==================== WebApp Adapters ====================
/**
 * WebApp Search Adapter
 * Wraps cloud-web-app SearchManager for unified interface
 */
class WebAppSearchAdapter {
    constructor(searchManager) {
        this.searchManager = searchManager;
    }
    async search(query) {
        // TODO: Adapt SearchManager.search() to unified format
        return [];
    }
    async searchInFile(file, query) {
        // TODO: Adapt SearchManager.searchInFile() to unified format
        return [];
    }
    async replace(query, replacement) {
        // TODO: Adapt SearchManager.replace() to unified format
        return 0;
    }
    cancel() {
        // TODO: Call SearchManager.cancel()
    }
}
exports.WebAppSearchAdapter = WebAppSearchAdapter;
/**
 * WebApp Keybinding Adapter
 * Wraps cloud-web-app KeyboardManager for unified interface
 */
class WebAppKeybindingAdapter {
    constructor(keyboardManager) {
        this.keyboardManager = keyboardManager;
    }
    getKeybindings() {
        // TODO: Adapt KeyboardManager.getBindings() to unified format
        return [];
    }
    getKeybinding(command) {
        // TODO: Adapt KeyboardManager.getBinding() to unified format
        return undefined;
    }
    setKeybinding(keybinding) {
        // TODO: Adapt to KeyboardManager.bind()
    }
    removeKeybinding(id) {
        // TODO: Adapt to KeyboardManager.unbind()
    }
    resetKeybinding(command) {
        // TODO: Adapt to KeyboardManager.reset()
    }
    async executeCommand(command, args) {
        // TODO: Adapt to KeyboardManager.execute()
    }
}
exports.WebAppKeybindingAdapter = WebAppKeybindingAdapter;
/**
 * WebApp Notification Adapter
 * Wraps cloud-web-app NotificationCenter for unified interface
 */
class WebAppNotificationAdapter {
    constructor(notificationCenter) {
        this.notificationCenter = notificationCenter;
    }
    show(notification) {
        // TODO: Adapt to NotificationCenter.show()
        return '';
    }
    update(id, updates) {
        // TODO: Adapt to NotificationCenter.update()
    }
    dismiss(id) {
        // TODO: Adapt to NotificationCenter.dismiss()
    }
    dismissAll() {
        // TODO: Adapt to NotificationCenter.dismissAll()
    }
    getNotifications() {
        // TODO: Adapt NotificationCenter.getAll() to unified format
        return [];
    }
}
exports.WebAppNotificationAdapter = WebAppNotificationAdapter;
/**
 * WebApp Theme Adapter
 * Wraps cloud-web-app ThemeManager for unified interface
 */
class WebAppThemeAdapter {
    constructor(themeManager) {
        this.themeManager = themeManager;
    }
    getThemes() {
        // TODO: Adapt ThemeManager.getThemes() to unified format
        return [];
    }
    getCurrentTheme() {
        // TODO: Adapt ThemeManager.getCurrentTheme() to unified format
        return {
            id: 'dark',
            name: 'Dark',
            type: 'dark',
            colors: {}
        };
    }
    async setTheme(themeId) {
        // TODO: Adapt to ThemeManager.setTheme()
    }
    getColor(colorId) {
        // TODO: Adapt to ThemeManager.getColor()
        return undefined;
    }
}
exports.WebAppThemeAdapter = WebAppThemeAdapter;
// ==================== Export ====================
exports.default = UnifiedServiceBridge;
