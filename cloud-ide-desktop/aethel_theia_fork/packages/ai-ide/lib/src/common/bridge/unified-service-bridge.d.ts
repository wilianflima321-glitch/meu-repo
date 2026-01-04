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
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Bridge state
 */
export declare enum BridgeState {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
    Error = "error"
}
/**
 * Service type
 */
export declare enum ServiceType {
    Search = "search",
    Keybinding = "keybinding",
    Notification = "notification",
    Theme = "theme"
}
/**
 * Bridge configuration
 */
export interface BridgeConfig {
    webAppEndpoint?: string;
    syncInterval?: number;
    enableRealtime?: boolean;
    preferredSource?: 'theia' | 'webapp';
}
/**
 * Sync status
 */
export interface SyncStatus {
    service: ServiceType;
    lastSync: number;
    inSync: boolean;
    pendingChanges: number;
}
/**
 * Search query (unified)
 */
export interface UnifiedSearchQuery {
    pattern: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    includePattern?: string;
    excludePattern?: string;
    maxResults?: number;
}
/**
 * Search result (unified)
 */
export interface UnifiedSearchResult {
    file: string;
    line: number;
    column: number;
    match: string;
    preview: string;
    previewStart: number;
    previewEnd: number;
}
/**
 * Search bridge interface
 */
export interface ISearchBridge {
    search(query: UnifiedSearchQuery): Promise<UnifiedSearchResult[]>;
    searchInFile(file: string, query: UnifiedSearchQuery): Promise<UnifiedSearchResult[]>;
    replace(query: UnifiedSearchQuery, replacement: string): Promise<number>;
    cancel(): void;
}
/**
 * Unified keybinding
 */
export interface UnifiedKeybinding {
    id: string;
    key: string;
    command: string;
    when?: string;
    args?: unknown;
    source: 'user' | 'extension' | 'default';
}
/**
 * Keybinding bridge interface
 */
export interface IKeybindingBridge {
    getKeybindings(): UnifiedKeybinding[];
    getKeybinding(command: string): UnifiedKeybinding | undefined;
    setKeybinding(keybinding: UnifiedKeybinding): void;
    removeKeybinding(id: string): void;
    resetKeybinding(command: string): void;
    executeCommand(command: string, args?: unknown): Promise<void>;
}
/**
 * Unified notification
 */
export interface UnifiedNotification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'progress';
    message: string;
    detail?: string;
    progress?: number;
    actions?: NotificationAction[];
    source?: string;
    timestamp: number;
}
/**
 * Notification action
 */
export interface NotificationAction {
    id: string;
    label: string;
    primary?: boolean;
}
/**
 * Notification bridge interface
 */
export interface INotificationBridge {
    show(notification: Omit<UnifiedNotification, 'id' | 'timestamp'>): string;
    update(id: string, updates: Partial<UnifiedNotification>): void;
    dismiss(id: string): void;
    dismissAll(): void;
    getNotifications(): UnifiedNotification[];
}
/**
 * Unified theme
 */
export interface UnifiedTheme {
    id: string;
    name: string;
    type: 'light' | 'dark' | 'highContrast' | 'highContrastLight';
    colors: Record<string, string>;
    tokenColors?: TokenColor[];
    semanticTokenColors?: Record<string, string>;
}
/**
 * Token color
 */
export interface TokenColor {
    scope: string | string[];
    settings: {
        foreground?: string;
        background?: string;
        fontStyle?: string;
    };
}
/**
 * Theme bridge interface
 */
export interface IThemeBridge {
    getThemes(): UnifiedTheme[];
    getCurrentTheme(): UnifiedTheme;
    setTheme(themeId: string): Promise<void>;
    getColor(colorId: string): string | undefined;
}
export declare class UnifiedServiceBridge {
    private state;
    private config;
    private readonly syncStatus;
    private searchSystem;
    private keybindingSystem;
    private notificationSystem;
    private themeSystem;
    private webAppSearchAdapter;
    private webAppKeybindingAdapter;
    private webAppNotificationAdapter;
    private webAppThemeAdapter;
    private syncTimer;
    private readonly onStateChangedEmitter;
    readonly onStateChanged: Event<BridgeState>;
    private readonly onSyncCompletedEmitter;
    readonly onSyncCompleted: Event<ServiceType>;
    private readonly onErrorEmitter;
    readonly onError: Event<{
        service: ServiceType;
        error: Error;
    }>;
    constructor();
    /**
     * Initialize the bridge
     */
    initialize(config: BridgeConfig): Promise<void>;
    /**
     * Connect to WebApp
     */
    private connectToWebApp;
    /**
     * Register Theia systems
     */
    registerTheiaSystems(systems: {
        search?: ISearchBridge;
        keybinding?: IKeybindingBridge;
        notification?: INotificationBridge;
        theme?: IThemeBridge;
    }): void;
    /**
     * Register WebApp adapters
     */
    registerWebAppAdapters(adapters: {
        search?: ISearchBridge;
        keybinding?: IKeybindingBridge;
        notification?: INotificationBridge;
        theme?: IThemeBridge;
    }): void;
    /**
     * Get unified search interface
     */
    getSearch(): ISearchBridge;
    /**
     * Sync search results to secondary
     */
    private syncSearchResults;
    /**
     * Get unified keybinding interface
     */
    getKeybinding(): IKeybindingBridge;
    /**
     * Sync keybindings between sources
     */
    private syncKeybindings;
    /**
     * Get unified notification interface
     */
    getNotification(): INotificationBridge;
    /**
     * Sync notification
     */
    private syncNotification;
    /**
     * Get unified theme interface
     */
    getTheme(): IThemeBridge;
    /**
     * Sync theme
     */
    private syncTheme;
    /**
     * Start automatic sync
     */
    private startSync;
    /**
     * Stop automatic sync
     */
    stopSync(): void;
    /**
     * Sync all services
     */
    syncAll(): Promise<void>;
    /**
     * Get sync status
     */
    getSyncStatus(service: ServiceType): SyncStatus | undefined;
    /**
     * Get all sync statuses
     */
    getAllSyncStatuses(): SyncStatus[];
    /**
     * Get current state
     */
    getState(): BridgeState;
    /**
     * Is connected
     */
    isConnected(): boolean;
    /**
     * Dispose
     */
    dispose(): void;
}
/**
 * WebApp Search Adapter
 * Wraps cloud-web-app SearchManager for unified interface
 */
export declare class WebAppSearchAdapter implements ISearchBridge {
    private searchManager;
    constructor(searchManager: unknown);
    search(query: UnifiedSearchQuery): Promise<UnifiedSearchResult[]>;
    searchInFile(file: string, query: UnifiedSearchQuery): Promise<UnifiedSearchResult[]>;
    replace(query: UnifiedSearchQuery, replacement: string): Promise<number>;
    cancel(): void;
}
/**
 * WebApp Keybinding Adapter
 * Wraps cloud-web-app KeyboardManager for unified interface
 */
export declare class WebAppKeybindingAdapter implements IKeybindingBridge {
    private keyboardManager;
    constructor(keyboardManager: unknown);
    getKeybindings(): UnifiedKeybinding[];
    getKeybinding(command: string): UnifiedKeybinding | undefined;
    setKeybinding(keybinding: UnifiedKeybinding): void;
    removeKeybinding(id: string): void;
    resetKeybinding(command: string): void;
    executeCommand(command: string, args?: unknown): Promise<void>;
}
/**
 * WebApp Notification Adapter
 * Wraps cloud-web-app NotificationCenter for unified interface
 */
export declare class WebAppNotificationAdapter implements INotificationBridge {
    private notificationCenter;
    constructor(notificationCenter: unknown);
    show(notification: Omit<UnifiedNotification, 'id' | 'timestamp'>): string;
    update(id: string, updates: Partial<UnifiedNotification>): void;
    dismiss(id: string): void;
    dismissAll(): void;
    getNotifications(): UnifiedNotification[];
}
/**
 * WebApp Theme Adapter
 * Wraps cloud-web-app ThemeManager for unified interface
 */
export declare class WebAppThemeAdapter implements IThemeBridge {
    private themeManager;
    constructor(themeManager: unknown);
    getThemes(): UnifiedTheme[];
    getCurrentTheme(): UnifiedTheme;
    setTheme(themeId: string): Promise<void>;
    getColor(colorId: string): string | undefined;
}
export default UnifiedServiceBridge;
