"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const inversify_1 = require("inversify");
const core_1 = require("@theia/core");
/**
 * Notification Service
 * Manages system notifications with priority, persistence, and actions
 */
let NotificationService = class NotificationService {
    constructor() {
        this.notifications = new Map();
        this.notificationCounter = 0;
        this.onNotificationAddedEmitter = new core_1.Emitter();
        this.onNotificationAdded = this.onNotificationAddedEmitter.event;
        this.onNotificationRemovedEmitter = new core_1.Emitter();
        this.onNotificationRemoved = this.onNotificationRemovedEmitter.event;
        this.onNotificationUpdatedEmitter = new core_1.Emitter();
        this.onNotificationUpdated = this.onNotificationUpdatedEmitter.event;
    }
    /**
     * Show a notification
     */
    notify(title, message, options = {}) {
        const id = `notification-${++this.notificationCounter}-${Date.now()}`;
        const notification = {
            id,
            type: options.type || 'info',
            title,
            message,
            priority: options.priority || 'normal',
            timestamp: Date.now(),
            read: false,
            persistent: options.persistent || false,
            actions: options.actions,
            metadata: options.metadata,
            expiresAt: options.duration ? Date.now() + options.duration : undefined,
        };
        this.notifications.set(id, notification);
        this.onNotificationAddedEmitter.fire(notification);
        // Auto-remove non-persistent notifications
        if (!notification.persistent && notification.expiresAt) {
            setTimeout(() => {
                this.remove(id);
            }, options.duration);
        }
        return id;
    }
    /**
     * Show info notification
     */
    info(title, message, options) {
        return this.notify(title, message, { ...options, type: 'info' });
    }
    /**
     * Show success notification
     */
    success(title, message, options) {
        return this.notify(title, message, { ...options, type: 'success' });
    }
    /**
     * Show warning notification
     */
    warning(title, message, options) {
        return this.notify(title, message, { ...options, type: 'warning' });
    }
    /**
     * Show error notification
     */
    error(title, message, options) {
        return this.notify(title, message, { ...options, type: 'error', persistent: true });
    }
    /**
     * Remove a notification
     */
    remove(id) {
        if (this.notifications.has(id)) {
            this.notifications.delete(id);
            this.onNotificationRemovedEmitter.fire(id);
        }
    }
    /**
     * Mark notification as read
     */
    markAsRead(id) {
        const notification = this.notifications.get(id);
        if (notification && !notification.read) {
            notification.read = true;
            this.onNotificationUpdatedEmitter.fire(notification);
        }
    }
    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
        for (const notification of this.notifications.values()) {
            if (!notification.read) {
                notification.read = true;
                this.onNotificationUpdatedEmitter.fire(notification);
            }
        }
    }
    /**
     * Clear all notifications
     */
    clearAll() {
        const ids = Array.from(this.notifications.keys());
        this.notifications.clear();
        ids.forEach(id => this.onNotificationRemovedEmitter.fire(id));
    }
    /**
     * Clear read notifications
     */
    clearRead() {
        const toRemove = [];
        for (const [id, notification] of this.notifications.entries()) {
            if (notification.read) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.remove(id));
    }
    /**
     * Get all notifications
     */
    getAll() {
        return Array.from(this.notifications.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Get unread notifications
     */
    getUnread() {
        return this.getAll().filter(n => !n.read);
    }
    /**
     * Get notification by ID
     */
    get(id) {
        return this.notifications.get(id);
    }
    /**
     * Get unread count
     */
    getUnreadCount() {
        return this.getUnread().length;
    }
    /**
     * Get notifications by type
     */
    getByType(type) {
        return this.getAll().filter(n => n.type === type);
    }
    /**
     * Get notifications by priority
     */
    getByPriority(priority) {
        return this.getAll().filter(n => n.priority === priority);
    }
    /**
     * Check if there are critical notifications
     */
    hasCritical() {
        return this.getByPriority('critical').some(n => !n.read);
    }
    /**
     * Clean up expired notifications
     */
    cleanupExpired() {
        const now = Date.now();
        const toRemove = [];
        for (const [id, notification] of this.notifications.entries()) {
            if (notification.expiresAt && notification.expiresAt < now) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.remove(id));
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, inversify_1.injectable)()
], NotificationService);
