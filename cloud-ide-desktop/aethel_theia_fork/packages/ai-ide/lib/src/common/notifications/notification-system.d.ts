/**
 * Notification System - Professional Notification & Alert Infrastructure
 *
 * Sistema de notificações profissional para IDE de produção.
 * Suporta:
 * - Toasts com ações
 * - Notificações persistentes
 * - Notificações de progresso
 * - Banners e alertas
 * - Push notifications (desktop/mobile)
 * - Agrupamento inteligente
 * - Priorização e escalonamento
 * - Histórico completo
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Notification severity levels
 */
export declare enum NotificationSeverity {
    Info = "info",
    Warning = "warning",
    Error = "error",
    Success = "success",
    Debug = "debug"
}
/**
 * Notification type
 */
export declare enum NotificationType {
    Toast = "toast",
    Banner = "banner",
    Dialog = "dialog",
    StatusBar = "statusbar",
    Badge = "badge",
    Push = "push"
}
/**
 * Notification position
 */
export declare enum NotificationPosition {
    TopLeft = "top-left",
    TopCenter = "top-center",
    TopRight = "top-right",
    BottomLeft = "bottom-left",
    BottomCenter = "bottom-center",
    BottomRight = "bottom-right",
    Center = "center"
}
/**
 * Notification action
 */
export interface NotificationAction {
    id: string;
    label: string;
    tooltip?: string;
    iconPath?: string;
    primary?: boolean;
    keepOpen?: boolean;
    handler?: () => void | Promise<void>;
}
/**
 * Progress notification options
 */
export interface ProgressOptions {
    current?: number;
    total?: number;
    message?: string;
    cancellable?: boolean;
    indeterminate?: boolean;
}
/**
 * Notification options
 */
export interface NotificationOptions {
    id?: string;
    title: string;
    message?: string;
    detail?: string;
    severity?: NotificationSeverity;
    type?: NotificationType;
    position?: NotificationPosition;
    iconPath?: string;
    duration?: number;
    actions?: NotificationAction[];
    progress?: ProgressOptions;
    silent?: boolean;
    noDismiss?: boolean;
    source?: string;
    group?: string;
    priority?: number;
    timestamp?: number;
    data?: unknown;
    onDismiss?: () => void;
    onClick?: () => void;
}
/**
 * Notification
 */
export interface Notification {
    id: string;
    title: string;
    message?: string;
    detail?: string;
    severity: NotificationSeverity;
    type: NotificationType;
    position: NotificationPosition;
    iconPath?: string;
    duration: number;
    actions: NotificationAction[];
    progress?: ProgressOptions;
    silent: boolean;
    noDismiss: boolean;
    source: string;
    group?: string;
    priority: number;
    timestamp: number;
    data?: unknown;
    visible: boolean;
    dismissed: boolean;
    interacted: boolean;
}
/**
 * Banner type
 */
export interface Banner {
    id: string;
    message: string;
    severity: NotificationSeverity;
    iconPath?: string;
    actions?: NotificationAction[];
    dismissable: boolean;
    showUntil?: number;
    link?: {
        label: string;
        url: string;
    };
}
/**
 * Status bar item alignment
 */
export declare enum StatusBarAlignment {
    Left = "left",
    Right = "right"
}
/**
 * Status bar item
 */
export interface StatusBarItem {
    id: string;
    text: string;
    tooltip?: string;
    iconPath?: string;
    color?: string;
    backgroundColor?: string;
    alignment: StatusBarAlignment;
    priority: number;
    command?: string;
    visible: boolean;
}
/**
 * Progress location
 */
export declare enum ProgressLocation {
    Notification = "notification",
    Window = "window",
    SourceControl = "scm",
    Explorer = "explorer"
}
/**
 * Progress notification handle
 */
export interface ProgressHandle {
    report(progress: Partial<ProgressOptions>): void;
    complete(message?: string): void;
    cancel(): void;
    isCancelled(): boolean;
}
/**
 * Notification event
 */
export interface NotificationEvent {
    notification: Notification;
    action: 'shown' | 'dismissed' | 'clicked' | 'action' | 'expired';
    actionId?: string;
}
/**
 * Banner event
 */
export interface BannerEvent {
    banner: Banner;
    action: 'shown' | 'dismissed' | 'clicked' | 'action';
    actionId?: string;
}
/**
 * Notification configuration
 */
export interface NotificationConfig {
    maxVisible: number;
    defaultDuration: number;
    position: NotificationPosition;
    soundEnabled: boolean;
    desktopNotifications: boolean;
    doNotDisturb: boolean;
    grouping: boolean;
    showTimestamp: boolean;
    stackLimit: number;
}
export declare class NotificationSystem {
    private readonly notifications;
    private readonly notificationQueue;
    private readonly banners;
    private readonly statusBarItems;
    private readonly progressHandles;
    private readonly history;
    private readonly MAX_HISTORY;
    private config;
    private readonly onNotificationEmitter;
    readonly onNotification: Event<NotificationEvent>;
    private readonly onBannerEmitter;
    readonly onBanner: Event<BannerEvent>;
    private readonly onStatusBarChangedEmitter;
    readonly onStatusBarChanged: Event<StatusBarItem>;
    private readonly onDoNotDisturbChangedEmitter;
    readonly onDoNotDisturbChanged: Event<boolean>;
    private readonly timers;
    private soundPlayer;
    constructor();
    /**
     * Show info notification
     */
    info(title: string, message?: string, options?: Partial<NotificationOptions>): string;
    /**
     * Show warning notification
     */
    warn(title: string, message?: string, options?: Partial<NotificationOptions>): string;
    /**
     * Show error notification
     */
    error(title: string, message?: string, options?: Partial<NotificationOptions>): string;
    /**
     * Show success notification
     */
    success(title: string, message?: string, options?: Partial<NotificationOptions>): string;
    /**
     * Show notification with custom options
     */
    show(options: NotificationOptions): string;
    /**
     * Create notification from options
     */
    private createNotification;
    /**
     * Display notification
     */
    private displayNotification;
    /**
     * Dismiss notification
     */
    dismiss(notificationId: string, reason?: 'user' | 'expired' | 'programmatic'): void;
    /**
     * Dismiss all notifications
     */
    dismissAll(): void;
    /**
     * Update notification
     */
    update(notificationId: string, updates: Partial<NotificationOptions>): void;
    /**
     * Execute notification action
     */
    executeAction(notificationId: string, actionId: string): Promise<void>;
    /**
     * Click notification
     */
    click(notificationId: string): void;
    /**
     * Show progress notification
     */
    withProgress<T>(options: NotificationOptions, task: (progress: ProgressHandle) => Promise<T>): Promise<T>;
    /**
     * Cancel progress notification
     */
    cancelProgress(notificationId: string): void;
    /**
     * Show banner
     */
    showBanner(options: Omit<Banner, 'id'>): string;
    /**
     * Dismiss banner
     */
    dismissBanner(bannerId: string): void;
    /**
     * Get all banners
     */
    getBanners(): Banner[];
    /**
     * Create status bar item
     */
    createStatusBarItem(options: Omit<StatusBarItem, 'visible'> & {
        visible?: boolean;
    }): StatusBarItem;
    /**
     * Update status bar item
     */
    updateStatusBarItem(itemId: string, updates: Partial<StatusBarItem>): void;
    /**
     * Show status bar item
     */
    showStatusBarItem(itemId: string): void;
    /**
     * Hide status bar item
     */
    hideStatusBarItem(itemId: string): void;
    /**
     * Remove status bar item
     */
    removeStatusBarItem(itemId: string): void;
    /**
     * Get all status bar items
     */
    getStatusBarItems(): StatusBarItem[];
    /**
     * Show status bar message
     */
    setStatusBarMessage(message: string, timeout?: number): Disposable;
    /**
     * Add to history
     */
    private addToHistory;
    /**
     * Get notification history
     */
    getHistory(options?: {
        severity?: NotificationSeverity;
        source?: string;
        limit?: number;
        since?: number;
    }): Notification[];
    /**
     * Clear history
     */
    clearHistory(): void;
    /**
     * Get configuration
     */
    getConfig(): NotificationConfig;
    /**
     * Set configuration
     */
    setConfig(config: Partial<NotificationConfig>): void;
    /**
     * Toggle do not disturb
     */
    toggleDoNotDisturb(): boolean;
    /**
     * Request desktop notification permission
     */
    requestDesktopPermission(): Promise<boolean>;
    /**
     * Show desktop notification
     */
    private showDesktopNotification;
    /**
     * Set sound player
     */
    setSoundPlayer(player: (sound: string) => void): void;
    /**
     * Play notification sound
     */
    private playNotificationSound;
    /**
     * Get visible notification count
     */
    private getVisibleCount;
    /**
     * Process notification queue
     */
    private processQueue;
    /**
     * Find notification in same group
     */
    private findGroupNotification;
    /**
     * Update grouped notification
     */
    private updateGroupedNotification;
    /**
     * Get severity value for comparison
     */
    private getSeverityValue;
    /**
     * Get default icon for severity
     */
    private getDefaultIcon;
    /**
     * Get priority for severity
     */
    private getPriorityForSeverity;
    /**
     * Initialize default status bar items
     */
    private initializeDefaultStatusBarItems;
    /**
     * Get notification by ID
     */
    getNotification(notificationId: string): Notification | undefined;
    /**
     * Get all visible notifications
     */
    getVisibleNotifications(): Notification[];
    /**
     * Get notifications by severity
     */
    getNotificationsBySeverity(severity: NotificationSeverity): Notification[];
    /**
     * Get notification count
     */
    getNotificationCount(): {
        total: number;
        byType: Record<NotificationSeverity, number>;
    };
    /**
     * Dispose
     */
    dispose(): void;
}
interface Disposable {
    dispose(): void;
}
export default NotificationSystem;
