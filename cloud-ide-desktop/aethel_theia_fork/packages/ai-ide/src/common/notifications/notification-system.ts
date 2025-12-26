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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Notification Types ====================

/**
 * Notification severity levels
 */
export enum NotificationSeverity {
    Info = 'info',
    Warning = 'warning',
    Error = 'error',
    Success = 'success',
    Debug = 'debug'
}

/**
 * Notification type
 */
export enum NotificationType {
    Toast = 'toast',
    Banner = 'banner',
    Dialog = 'dialog',
    StatusBar = 'statusbar',
    Badge = 'badge',
    Push = 'push'
}

/**
 * Notification position
 */
export enum NotificationPosition {
    TopLeft = 'top-left',
    TopCenter = 'top-center',
    TopRight = 'top-right',
    BottomLeft = 'bottom-left',
    BottomCenter = 'bottom-center',
    BottomRight = 'bottom-right',
    Center = 'center'
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
    duration?: number; // ms, 0 for persistent
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

// ==================== Banner Types ====================

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

// ==================== Status Bar Types ====================

/**
 * Status bar item alignment
 */
export enum StatusBarAlignment {
    Left = 'left',
    Right = 'right'
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

// ==================== Progress Types ====================

/**
 * Progress location
 */
export enum ProgressLocation {
    Notification = 'notification',
    Window = 'window',
    SourceControl = 'scm',
    Explorer = 'explorer'
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

// ==================== Events ====================

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

// ==================== Configuration ====================

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

// ==================== Main Notification System ====================

@injectable()
export class NotificationSystem {
    // Active notifications
    private readonly notifications: Map<string, Notification> = new Map();
    private readonly notificationQueue: Notification[] = [];
    
    // Banners
    private readonly banners: Map<string, Banner> = new Map();
    
    // Status bar
    private readonly statusBarItems: Map<string, StatusBarItem> = new Map();
    
    // Progress tracking
    private readonly progressHandles: Map<string, ProgressState> = new Map();
    
    // History
    private readonly history: Notification[] = [];
    private readonly MAX_HISTORY = 1000;
    
    // Configuration
    private config: NotificationConfig = {
        maxVisible: 5,
        defaultDuration: 5000,
        position: NotificationPosition.BottomRight,
        soundEnabled: true,
        desktopNotifications: true,
        doNotDisturb: false,
        grouping: true,
        showTimestamp: true,
        stackLimit: 100
    };
    
    // Events
    private readonly onNotificationEmitter = new Emitter<NotificationEvent>();
    readonly onNotification: Event<NotificationEvent> = this.onNotificationEmitter.event;
    
    private readonly onBannerEmitter = new Emitter<BannerEvent>();
    readonly onBanner: Event<BannerEvent> = this.onBannerEmitter.event;
    
    private readonly onStatusBarChangedEmitter = new Emitter<StatusBarItem>();
    readonly onStatusBarChanged: Event<StatusBarItem> = this.onStatusBarChangedEmitter.event;
    
    private readonly onDoNotDisturbChangedEmitter = new Emitter<boolean>();
    readonly onDoNotDisturbChanged: Event<boolean> = this.onDoNotDisturbChangedEmitter.event;

    // Timers
    private readonly timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    // Sound
    private soundPlayer: ((sound: string) => void) | null = null;

    constructor() {
        this.initializeDefaultStatusBarItems();
    }

    // ==================== Toast Notifications ====================

    /**
     * Show info notification
     */
    info(title: string, message?: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            title,
            message,
            severity: NotificationSeverity.Info,
            ...options
        });
    }

    /**
     * Show warning notification
     */
    warn(title: string, message?: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            title,
            message,
            severity: NotificationSeverity.Warning,
            ...options
        });
    }

    /**
     * Show error notification
     */
    error(title: string, message?: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            title,
            message,
            severity: NotificationSeverity.Error,
            duration: 0, // Errors persist by default
            ...options
        });
    }

    /**
     * Show success notification
     */
    success(title: string, message?: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            title,
            message,
            severity: NotificationSeverity.Success,
            ...options
        });
    }

    /**
     * Show notification with custom options
     */
    show(options: NotificationOptions): string {
        // Check do not disturb mode
        if (this.config.doNotDisturb && options.severity !== NotificationSeverity.Error) {
            // Queue for later
            const notification = this.createNotification(options);
            notification.visible = false;
            this.history.push(notification);
            return notification.id;
        }

        const notification = this.createNotification(options);
        
        // Check if should group with existing notification
        if (this.config.grouping && options.group) {
            const existing = this.findGroupNotification(options.group);
            if (existing) {
                return this.updateGroupedNotification(existing, notification);
            }
        }

        // Check queue capacity
        if (this.getVisibleCount() >= this.config.maxVisible) {
            this.notificationQueue.push(notification);
            return notification.id;
        }

        this.displayNotification(notification);
        return notification.id;
    }

    /**
     * Create notification from options
     */
    private createNotification(options: NotificationOptions): Notification {
        const id = options.id || `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id,
            title: options.title,
            message: options.message,
            detail: options.detail,
            severity: options.severity || NotificationSeverity.Info,
            type: options.type || NotificationType.Toast,
            position: options.position || this.config.position,
            iconPath: options.iconPath || this.getDefaultIcon(options.severity || NotificationSeverity.Info),
            duration: options.duration ?? this.config.defaultDuration,
            actions: options.actions || [],
            progress: options.progress,
            silent: options.silent || false,
            noDismiss: options.noDismiss || false,
            source: options.source || 'system',
            group: options.group,
            priority: options.priority || this.getPriorityForSeverity(options.severity || NotificationSeverity.Info),
            timestamp: options.timestamp || Date.now(),
            data: options.data,
            visible: true,
            dismissed: false,
            interacted: false
        };
    }

    /**
     * Display notification
     */
    private displayNotification(notification: Notification): void {
        this.notifications.set(notification.id, notification);
        notification.visible = true;

        // Add to history
        this.addToHistory(notification);

        // Play sound
        if (!notification.silent && this.config.soundEnabled) {
            this.playNotificationSound(notification.severity);
        }

        // Show desktop notification if enabled
        if (this.config.desktopNotifications && notification.type === NotificationType.Push) {
            this.showDesktopNotification(notification);
        }

        // Fire event
        this.onNotificationEmitter.fire({
            notification,
            action: 'shown'
        });

        // Set auto-dismiss timer if duration > 0
        if (notification.duration > 0 && !notification.noDismiss) {
            const timer = setTimeout(() => {
                this.dismiss(notification.id, 'expired');
            }, notification.duration);
            this.timers.set(notification.id, timer);
        }
    }

    /**
     * Dismiss notification
     */
    dismiss(notificationId: string, reason: 'user' | 'expired' | 'programmatic' = 'user'): void {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        // Clear timer
        const timer = this.timers.get(notificationId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(notificationId);
        }

        notification.visible = false;
        notification.dismissed = true;
        this.notifications.delete(notificationId);

        // Fire event
        this.onNotificationEmitter.fire({
            notification,
            action: reason === 'expired' ? 'expired' : 'dismissed'
        });

        // Show next queued notification
        this.processQueue();
    }

    /**
     * Dismiss all notifications
     */
    dismissAll(): void {
        for (const id of this.notifications.keys()) {
            this.dismiss(id, 'programmatic');
        }
        this.notificationQueue.length = 0;
    }

    /**
     * Update notification
     */
    update(notificationId: string, updates: Partial<NotificationOptions>): void {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        if (updates.title !== undefined) notification.title = updates.title;
        if (updates.message !== undefined) notification.message = updates.message;
        if (updates.detail !== undefined) notification.detail = updates.detail;
        if (updates.severity !== undefined) notification.severity = updates.severity;
        if (updates.progress !== undefined) notification.progress = updates.progress;
        if (updates.actions !== undefined) notification.actions = updates.actions;

        // Extend timer if duration updated
        if (updates.duration !== undefined && updates.duration > 0) {
            const existingTimer = this.timers.get(notificationId);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            const timer = setTimeout(() => {
                this.dismiss(notificationId, 'expired');
            }, updates.duration);
            this.timers.set(notificationId, timer);
        }
    }

    /**
     * Execute notification action
     */
    async executeAction(notificationId: string, actionId: string): Promise<void> {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        const action = notification.actions.find(a => a.id === actionId);
        if (!action) return;

        notification.interacted = true;

        // Fire event
        this.onNotificationEmitter.fire({
            notification,
            action: 'action',
            actionId
        });

        // Execute handler
        if (action.handler) {
            await action.handler();
        }

        // Dismiss unless keepOpen is set
        if (!action.keepOpen) {
            this.dismiss(notificationId, 'user');
        }
    }

    /**
     * Click notification
     */
    click(notificationId: string): void {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        notification.interacted = true;

        this.onNotificationEmitter.fire({
            notification,
            action: 'clicked'
        });
    }

    // ==================== Progress Notifications ====================

    /**
     * Show progress notification
     */
    withProgress<T>(
        options: NotificationOptions,
        task: (progress: ProgressHandle) => Promise<T>
    ): Promise<T> {
        const notification = this.createNotification({
            ...options,
            progress: options.progress || { current: 0, indeterminate: true }
        });

        this.displayNotification(notification);

        const state: ProgressState = {
            cancelled: false,
            completed: false
        };
        this.progressHandles.set(notification.id, state);

        const handle: ProgressHandle = {
            report: (progress) => {
                if (!state.cancelled && !state.completed) {
                    this.update(notification.id, { progress: { ...notification.progress, ...progress } });
                }
            },
            complete: (message) => {
                state.completed = true;
                this.progressHandles.delete(notification.id);
                
                if (message) {
                    this.update(notification.id, { 
                        message,
                        progress: undefined
                    });
                }
                
                // Auto dismiss after short delay
                setTimeout(() => this.dismiss(notification.id, 'programmatic'), 2000);
            },
            cancel: () => {
                state.cancelled = true;
                this.progressHandles.delete(notification.id);
                this.dismiss(notification.id, 'programmatic');
            },
            isCancelled: () => state.cancelled
        };

        return task(handle).then(
            result => {
                if (!state.cancelled && !state.completed) {
                    handle.complete();
                }
                return result;
            },
            error => {
                if (!state.cancelled) {
                    this.error(options.title, error.message || 'Operation failed');
                }
                handle.cancel();
                throw error;
            }
        );
    }

    /**
     * Cancel progress notification
     */
    cancelProgress(notificationId: string): void {
        const state = this.progressHandles.get(notificationId);
        if (state) {
            state.cancelled = true;
            this.progressHandles.delete(notificationId);
        }
        this.dismiss(notificationId, 'programmatic');
    }

    // ==================== Banners ====================

    /**
     * Show banner
     */
    showBanner(options: Omit<Banner, 'id'>): string {
        const id = `banner_${Date.now()}`;
        const banner: Banner = { id, ...options };
        
        this.banners.set(id, banner);
        
        this.onBannerEmitter.fire({
            banner,
            action: 'shown'
        });

        // Set expiry timer if specified
        if (banner.showUntil) {
            const delay = banner.showUntil - Date.now();
            if (delay > 0) {
                setTimeout(() => this.dismissBanner(id), delay);
            }
        }

        return id;
    }

    /**
     * Dismiss banner
     */
    dismissBanner(bannerId: string): void {
        const banner = this.banners.get(bannerId);
        if (!banner) return;

        this.banners.delete(bannerId);
        
        this.onBannerEmitter.fire({
            banner,
            action: 'dismissed'
        });
    }

    /**
     * Get all banners
     */
    getBanners(): Banner[] {
        return Array.from(this.banners.values());
    }

    // ==================== Status Bar ====================

    /**
     * Create status bar item
     */
    createStatusBarItem(options: Omit<StatusBarItem, 'visible'> & { visible?: boolean }): StatusBarItem {
        const item: StatusBarItem = {
            ...options,
            visible: options.visible ?? true
        };
        
        this.statusBarItems.set(item.id, item);
        this.onStatusBarChangedEmitter.fire(item);
        
        return item;
    }

    /**
     * Update status bar item
     */
    updateStatusBarItem(itemId: string, updates: Partial<StatusBarItem>): void {
        const item = this.statusBarItems.get(itemId);
        if (!item) return;

        Object.assign(item, updates);
        this.onStatusBarChangedEmitter.fire(item);
    }

    /**
     * Show status bar item
     */
    showStatusBarItem(itemId: string): void {
        this.updateStatusBarItem(itemId, { visible: true });
    }

    /**
     * Hide status bar item
     */
    hideStatusBarItem(itemId: string): void {
        this.updateStatusBarItem(itemId, { visible: false });
    }

    /**
     * Remove status bar item
     */
    removeStatusBarItem(itemId: string): void {
        this.statusBarItems.delete(itemId);
    }

    /**
     * Get all status bar items
     */
    getStatusBarItems(): StatusBarItem[] {
        return Array.from(this.statusBarItems.values())
            .filter(item => item.visible)
            .sort((a, b) => {
                if (a.alignment !== b.alignment) {
                    return a.alignment === StatusBarAlignment.Left ? -1 : 1;
                }
                return a.priority - b.priority;
            });
    }

    /**
     * Show status bar message
     */
    setStatusBarMessage(message: string, timeout?: number): Disposable {
        const id = `status_message_${Date.now()}`;
        
        this.createStatusBarItem({
            id,
            text: message,
            alignment: StatusBarAlignment.Left,
            priority: 1000 // High priority (shown first)
        });

        if (timeout) {
            setTimeout(() => this.removeStatusBarItem(id), timeout);
        }

        return {
            dispose: () => this.removeStatusBarItem(id)
        };
    }

    // ==================== History ====================

    /**
     * Add to history
     */
    private addToHistory(notification: Notification): void {
        this.history.push({ ...notification });
        
        // Trim history if needed
        while (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }

    /**
     * Get notification history
     */
    getHistory(options?: {
        severity?: NotificationSeverity;
        source?: string;
        limit?: number;
        since?: number;
    }): Notification[] {
        let filtered = [...this.history];
        
        if (options?.severity) {
            filtered = filtered.filter(n => n.severity === options.severity);
        }
        if (options?.source) {
            filtered = filtered.filter(n => n.source === options.source);
        }
        if (options?.since !== undefined) {
            const since = options.since;
            filtered = filtered.filter(n => n.timestamp >= since);
        }
        
        filtered.reverse(); // Newest first
        
        if (options?.limit) {
            filtered = filtered.slice(0, options.limit);
        }
        
        return filtered;
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history.length = 0;
    }

    // ==================== Configuration ====================

    /**
     * Get configuration
     */
    getConfig(): NotificationConfig {
        return { ...this.config };
    }

    /**
     * Set configuration
     */
    setConfig(config: Partial<NotificationConfig>): void {
        Object.assign(this.config, config);
        
        if (config.doNotDisturb !== undefined) {
            this.onDoNotDisturbChangedEmitter.fire(this.config.doNotDisturb);
        }
    }

    /**
     * Toggle do not disturb
     */
    toggleDoNotDisturb(): boolean {
        this.config.doNotDisturb = !this.config.doNotDisturb;
        this.onDoNotDisturbChangedEmitter.fire(this.config.doNotDisturb);
        return this.config.doNotDisturb;
    }

    // ==================== Desktop Notifications ====================

    /**
     * Request desktop notification permission
     */
    async requestDesktopPermission(): Promise<boolean> {
        if (typeof Notification === 'undefined') return false;
        
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    /**
     * Show desktop notification
     */
    private async showDesktopNotification(notification: Notification): Promise<void> {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;

        const desktop = new Notification(notification.title, {
            body: notification.message,
            icon: notification.iconPath,
            tag: notification.id,
            silent: notification.silent
        });

        desktop.onclick = () => {
            window.focus();
            this.click(notification.id);
        };
    }

    // ==================== Sound ====================

    /**
     * Set sound player
     */
    setSoundPlayer(player: (sound: string) => void): void {
        this.soundPlayer = player;
    }

    /**
     * Play notification sound
     */
    private playNotificationSound(severity: NotificationSeverity): void {
        if (!this.soundPlayer) return;
        
        const sounds: Record<NotificationSeverity, string> = {
            [NotificationSeverity.Info]: 'notification-info',
            [NotificationSeverity.Warning]: 'notification-warning',
            [NotificationSeverity.Error]: 'notification-error',
            [NotificationSeverity.Success]: 'notification-success',
            [NotificationSeverity.Debug]: 'notification-debug'
        };
        
        this.soundPlayer(sounds[severity]);
    }

    // ==================== Helpers ====================

    /**
     * Get visible notification count
     */
    private getVisibleCount(): number {
        return Array.from(this.notifications.values()).filter(n => n.visible).length;
    }

    /**
     * Process notification queue
     */
    private processQueue(): void {
        while (this.notificationQueue.length > 0 && this.getVisibleCount() < this.config.maxVisible) {
            const next = this.notificationQueue.shift()!;
            this.displayNotification(next);
        }
    }

    /**
     * Find notification in same group
     */
    private findGroupNotification(group: string): Notification | undefined {
        return Array.from(this.notifications.values()).find(n => n.group === group);
    }

    /**
     * Update grouped notification
     */
    private updateGroupedNotification(existing: Notification, newNotification: Notification): string {
        // Update existing notification with new info
        this.update(existing.id, {
            title: newNotification.title,
            message: newNotification.message,
            detail: newNotification.detail,
            severity: Math.max(
                this.getSeverityValue(existing.severity),
                this.getSeverityValue(newNotification.severity)
            ) === this.getSeverityValue(existing.severity) ? existing.severity : newNotification.severity
        });
        
        return existing.id;
    }

    /**
     * Get severity value for comparison
     */
    private getSeverityValue(severity: NotificationSeverity): number {
        const values: Record<NotificationSeverity, number> = {
            [NotificationSeverity.Debug]: 0,
            [NotificationSeverity.Info]: 1,
            [NotificationSeverity.Success]: 2,
            [NotificationSeverity.Warning]: 3,
            [NotificationSeverity.Error]: 4
        };
        return values[severity];
    }

    /**
     * Get default icon for severity
     */
    private getDefaultIcon(severity: NotificationSeverity): string {
        const icons: Record<NotificationSeverity, string> = {
            [NotificationSeverity.Info]: '$(info)',
            [NotificationSeverity.Warning]: '$(warning)',
            [NotificationSeverity.Error]: '$(error)',
            [NotificationSeverity.Success]: '$(check)',
            [NotificationSeverity.Debug]: '$(bug)'
        };
        return icons[severity];
    }

    /**
     * Get priority for severity
     */
    private getPriorityForSeverity(severity: NotificationSeverity): number {
        const priorities: Record<NotificationSeverity, number> = {
            [NotificationSeverity.Debug]: 0,
            [NotificationSeverity.Info]: 1,
            [NotificationSeverity.Success]: 2,
            [NotificationSeverity.Warning]: 3,
            [NotificationSeverity.Error]: 4
        };
        return priorities[severity];
    }

    /**
     * Initialize default status bar items
     */
    private initializeDefaultStatusBarItems(): void {
        // Notification center
        this.createStatusBarItem({
            id: 'notification-center',
            text: '$(bell)',
            tooltip: 'Notifications',
            alignment: StatusBarAlignment.Right,
            priority: 100,
            command: 'notifications.showCenter'
        });
    }

    // ==================== Query ====================

    /**
     * Get notification by ID
     */
    getNotification(notificationId: string): Notification | undefined {
        return this.notifications.get(notificationId);
    }

    /**
     * Get all visible notifications
     */
    getVisibleNotifications(): Notification[] {
        return Array.from(this.notifications.values())
            .filter(n => n.visible)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get notifications by severity
     */
    getNotificationsBySeverity(severity: NotificationSeverity): Notification[] {
        return Array.from(this.notifications.values()).filter(n => n.severity === severity);
    }

    /**
     * Get notification count
     */
    getNotificationCount(): { total: number; byType: Record<NotificationSeverity, number> } {
        const notifications = Array.from(this.notifications.values());
        return {
            total: notifications.length,
            byType: {
                [NotificationSeverity.Info]: notifications.filter(n => n.severity === NotificationSeverity.Info).length,
                [NotificationSeverity.Warning]: notifications.filter(n => n.severity === NotificationSeverity.Warning).length,
                [NotificationSeverity.Error]: notifications.filter(n => n.severity === NotificationSeverity.Error).length,
                [NotificationSeverity.Success]: notifications.filter(n => n.severity === NotificationSeverity.Success).length,
                [NotificationSeverity.Debug]: notifications.filter(n => n.severity === NotificationSeverity.Debug).length
            }
        };
    }

    // ==================== Utilities ====================

    /**
     * Dispose
     */
    dispose(): void {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        
        // Clear all notifications
        this.notifications.clear();
        this.notificationQueue.length = 0;
        this.banners.clear();
        this.statusBarItems.clear();
        this.progressHandles.clear();
        
        // Dispose emitters
        this.onNotificationEmitter.dispose();
        this.onBannerEmitter.dispose();
        this.onStatusBarChangedEmitter.dispose();
        this.onDoNotDisturbChangedEmitter.dispose();
    }
}

// ==================== Types ====================

interface ProgressState {
    cancelled: boolean;
    completed: boolean;
}

interface Disposable {
    dispose(): void;
}

// ==================== Export ====================

export default NotificationSystem;
