"use strict";
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
exports.NotificationSystem = exports.ProgressLocation = exports.StatusBarAlignment = exports.NotificationPosition = exports.NotificationType = exports.NotificationSeverity = void 0;
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
// ==================== Notification Types ====================
/**
 * Notification severity levels
 */
var NotificationSeverity;
(function (NotificationSeverity) {
    NotificationSeverity["Info"] = "info";
    NotificationSeverity["Warning"] = "warning";
    NotificationSeverity["Error"] = "error";
    NotificationSeverity["Success"] = "success";
    NotificationSeverity["Debug"] = "debug";
})(NotificationSeverity || (exports.NotificationSeverity = NotificationSeverity = {}));
/**
 * Notification type
 */
var NotificationType;
(function (NotificationType) {
    NotificationType["Toast"] = "toast";
    NotificationType["Banner"] = "banner";
    NotificationType["Dialog"] = "dialog";
    NotificationType["StatusBar"] = "statusbar";
    NotificationType["Badge"] = "badge";
    NotificationType["Push"] = "push";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/**
 * Notification position
 */
var NotificationPosition;
(function (NotificationPosition) {
    NotificationPosition["TopLeft"] = "top-left";
    NotificationPosition["TopCenter"] = "top-center";
    NotificationPosition["TopRight"] = "top-right";
    NotificationPosition["BottomLeft"] = "bottom-left";
    NotificationPosition["BottomCenter"] = "bottom-center";
    NotificationPosition["BottomRight"] = "bottom-right";
    NotificationPosition["Center"] = "center";
})(NotificationPosition || (exports.NotificationPosition = NotificationPosition = {}));
// ==================== Status Bar Types ====================
/**
 * Status bar item alignment
 */
var StatusBarAlignment;
(function (StatusBarAlignment) {
    StatusBarAlignment["Left"] = "left";
    StatusBarAlignment["Right"] = "right";
})(StatusBarAlignment || (exports.StatusBarAlignment = StatusBarAlignment = {}));
// ==================== Progress Types ====================
/**
 * Progress location
 */
var ProgressLocation;
(function (ProgressLocation) {
    ProgressLocation["Notification"] = "notification";
    ProgressLocation["Window"] = "window";
    ProgressLocation["SourceControl"] = "scm";
    ProgressLocation["Explorer"] = "explorer";
})(ProgressLocation || (exports.ProgressLocation = ProgressLocation = {}));
// ==================== Main Notification System ====================
let NotificationSystem = class NotificationSystem {
    constructor() {
        // Active notifications
        this.notifications = new Map();
        this.notificationQueue = [];
        // Banners
        this.banners = new Map();
        // Status bar
        this.statusBarItems = new Map();
        // Progress tracking
        this.progressHandles = new Map();
        // History
        this.history = [];
        this.MAX_HISTORY = 1000;
        // Configuration
        this.config = {
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
        this.onNotificationEmitter = new Emitter();
        this.onNotification = this.onNotificationEmitter.event;
        this.onBannerEmitter = new Emitter();
        this.onBanner = this.onBannerEmitter.event;
        this.onStatusBarChangedEmitter = new Emitter();
        this.onStatusBarChanged = this.onStatusBarChangedEmitter.event;
        this.onDoNotDisturbChangedEmitter = new Emitter();
        this.onDoNotDisturbChanged = this.onDoNotDisturbChangedEmitter.event;
        // Timers
        this.timers = new Map();
        // Sound
        this.soundPlayer = null;
        this.initializeDefaultStatusBarItems();
    }
    // ==================== Toast Notifications ====================
    /**
     * Show info notification
     */
    info(title, message, options) {
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
    warn(title, message, options) {
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
    error(title, message, options) {
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
    success(title, message, options) {
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
    show(options) {
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
    createNotification(options) {
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
    displayNotification(notification) {
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
    dismiss(notificationId, reason = 'user') {
        const notification = this.notifications.get(notificationId);
        if (!notification)
            return;
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
    dismissAll() {
        for (const id of this.notifications.keys()) {
            this.dismiss(id, 'programmatic');
        }
        this.notificationQueue.length = 0;
    }
    /**
     * Update notification
     */
    update(notificationId, updates) {
        const notification = this.notifications.get(notificationId);
        if (!notification)
            return;
        if (updates.title !== undefined)
            notification.title = updates.title;
        if (updates.message !== undefined)
            notification.message = updates.message;
        if (updates.detail !== undefined)
            notification.detail = updates.detail;
        if (updates.severity !== undefined)
            notification.severity = updates.severity;
        if (updates.progress !== undefined)
            notification.progress = updates.progress;
        if (updates.actions !== undefined)
            notification.actions = updates.actions;
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
    async executeAction(notificationId, actionId) {
        const notification = this.notifications.get(notificationId);
        if (!notification)
            return;
        const action = notification.actions.find(a => a.id === actionId);
        if (!action)
            return;
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
    click(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification)
            return;
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
    withProgress(options, task) {
        const notification = this.createNotification({
            ...options,
            progress: options.progress || { current: 0, indeterminate: true }
        });
        this.displayNotification(notification);
        const state = {
            cancelled: false,
            completed: false
        };
        this.progressHandles.set(notification.id, state);
        const handle = {
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
        return task(handle).then(result => {
            if (!state.cancelled && !state.completed) {
                handle.complete();
            }
            return result;
        }, error => {
            if (!state.cancelled) {
                this.error(options.title, error.message || 'Operation failed');
            }
            handle.cancel();
            throw error;
        });
    }
    /**
     * Cancel progress notification
     */
    cancelProgress(notificationId) {
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
    showBanner(options) {
        const id = `banner_${Date.now()}`;
        const banner = { id, ...options };
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
    dismissBanner(bannerId) {
        const banner = this.banners.get(bannerId);
        if (!banner)
            return;
        this.banners.delete(bannerId);
        this.onBannerEmitter.fire({
            banner,
            action: 'dismissed'
        });
    }
    /**
     * Get all banners
     */
    getBanners() {
        return Array.from(this.banners.values());
    }
    // ==================== Status Bar ====================
    /**
     * Create status bar item
     */
    createStatusBarItem(options) {
        const item = {
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
    updateStatusBarItem(itemId, updates) {
        const item = this.statusBarItems.get(itemId);
        if (!item)
            return;
        Object.assign(item, updates);
        this.onStatusBarChangedEmitter.fire(item);
    }
    /**
     * Show status bar item
     */
    showStatusBarItem(itemId) {
        this.updateStatusBarItem(itemId, { visible: true });
    }
    /**
     * Hide status bar item
     */
    hideStatusBarItem(itemId) {
        this.updateStatusBarItem(itemId, { visible: false });
    }
    /**
     * Remove status bar item
     */
    removeStatusBarItem(itemId) {
        this.statusBarItems.delete(itemId);
    }
    /**
     * Get all status bar items
     */
    getStatusBarItems() {
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
    setStatusBarMessage(message, timeout) {
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
    addToHistory(notification) {
        this.history.push({ ...notification });
        // Trim history if needed
        while (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }
    /**
     * Get notification history
     */
    getHistory(options) {
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
    clearHistory() {
        this.history.length = 0;
    }
    // ==================== Configuration ====================
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Set configuration
     */
    setConfig(config) {
        Object.assign(this.config, config);
        if (config.doNotDisturb !== undefined) {
            this.onDoNotDisturbChangedEmitter.fire(this.config.doNotDisturb);
        }
    }
    /**
     * Toggle do not disturb
     */
    toggleDoNotDisturb() {
        this.config.doNotDisturb = !this.config.doNotDisturb;
        this.onDoNotDisturbChangedEmitter.fire(this.config.doNotDisturb);
        return this.config.doNotDisturb;
    }
    // ==================== Desktop Notifications ====================
    /**
     * Request desktop notification permission
     */
    async requestDesktopPermission() {
        if (typeof Notification === 'undefined')
            return false;
        if (Notification.permission === 'granted')
            return true;
        if (Notification.permission === 'denied')
            return false;
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    /**
     * Show desktop notification
     */
    async showDesktopNotification(notification) {
        if (typeof Notification === 'undefined')
            return;
        if (Notification.permission !== 'granted')
            return;
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
    setSoundPlayer(player) {
        this.soundPlayer = player;
    }
    /**
     * Play notification sound
     */
    playNotificationSound(severity) {
        if (!this.soundPlayer)
            return;
        const sounds = {
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
    getVisibleCount() {
        return Array.from(this.notifications.values()).filter(n => n.visible).length;
    }
    /**
     * Process notification queue
     */
    processQueue() {
        while (this.notificationQueue.length > 0 && this.getVisibleCount() < this.config.maxVisible) {
            const next = this.notificationQueue.shift();
            this.displayNotification(next);
        }
    }
    /**
     * Find notification in same group
     */
    findGroupNotification(group) {
        return Array.from(this.notifications.values()).find(n => n.group === group);
    }
    /**
     * Update grouped notification
     */
    updateGroupedNotification(existing, newNotification) {
        // Update existing notification with new info
        this.update(existing.id, {
            title: newNotification.title,
            message: newNotification.message,
            detail: newNotification.detail,
            severity: Math.max(this.getSeverityValue(existing.severity), this.getSeverityValue(newNotification.severity)) === this.getSeverityValue(existing.severity) ? existing.severity : newNotification.severity
        });
        return existing.id;
    }
    /**
     * Get severity value for comparison
     */
    getSeverityValue(severity) {
        const values = {
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
    getDefaultIcon(severity) {
        const icons = {
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
    getPriorityForSeverity(severity) {
        const priorities = {
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
    initializeDefaultStatusBarItems() {
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
    getNotification(notificationId) {
        return this.notifications.get(notificationId);
    }
    /**
     * Get all visible notifications
     */
    getVisibleNotifications() {
        return Array.from(this.notifications.values())
            .filter(n => n.visible)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Get notifications by severity
     */
    getNotificationsBySeverity(severity) {
        return Array.from(this.notifications.values()).filter(n => n.severity === severity);
    }
    /**
     * Get notification count
     */
    getNotificationCount() {
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
    dispose() {
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
};
exports.NotificationSystem = NotificationSystem;
exports.NotificationSystem = NotificationSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], NotificationSystem);
// ==================== Export ====================
exports.default = NotificationSystem;
