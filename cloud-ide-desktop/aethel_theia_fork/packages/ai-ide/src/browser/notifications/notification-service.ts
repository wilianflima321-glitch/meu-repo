import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    timestamp: number;
    read: boolean;
    persistent: boolean;
    actions?: NotificationAction[];
    metadata?: Record<string, any>;
    expiresAt?: number;
}

export interface NotificationAction {
    label: string;
    action: () => void | Promise<void>;
    primary?: boolean;
}

export interface NotificationOptions {
    type?: NotificationType;
    priority?: NotificationPriority;
    persistent?: boolean;
    actions?: NotificationAction[];
    metadata?: Record<string, any>;
    duration?: number;
}

/**
 * Notification Service
 * Manages system notifications with priority, persistence, and actions
 */
@injectable()
export class NotificationService {
    private notifications: Map<string, Notification> = new Map();
    private notificationCounter = 0;

    private readonly onNotificationAddedEmitter = new Emitter<Notification>();
    readonly onNotificationAdded: Event<Notification> = this.onNotificationAddedEmitter.event;

    private readonly onNotificationRemovedEmitter = new Emitter<string>();
    readonly onNotificationRemoved: Event<string> = this.onNotificationRemovedEmitter.event;

    private readonly onNotificationUpdatedEmitter = new Emitter<Notification>();
    readonly onNotificationUpdated: Event<Notification> = this.onNotificationUpdatedEmitter.event;

    /**
     * Show a notification
     */
    notify(title: string, message: string, options: NotificationOptions = {}): string {
        const id = `notification-${++this.notificationCounter}-${Date.now()}`;
        
        const notification: Notification = {
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
    info(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string {
        return this.notify(title, message, { ...options, type: 'info' });
    }

    /**
     * Show success notification
     */
    success(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string {
        return this.notify(title, message, { ...options, type: 'success' });
    }

    /**
     * Show warning notification
     */
    warning(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string {
        return this.notify(title, message, { ...options, type: 'warning' });
    }

    /**
     * Show error notification
     */
    error(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string {
        return this.notify(title, message, { ...options, type: 'error', persistent: true });
    }

    /**
     * Remove a notification
     */
    remove(id: string): void {
        if (this.notifications.has(id)) {
            this.notifications.delete(id);
            this.onNotificationRemovedEmitter.fire(id);
        }
    }

    /**
     * Mark notification as read
     */
    markAsRead(id: string): void {
        const notification = this.notifications.get(id);
        if (notification && !notification.read) {
            notification.read = true;
            this.onNotificationUpdatedEmitter.fire(notification);
        }
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(): void {
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
    clearAll(): void {
        const ids = Array.from(this.notifications.keys());
        this.notifications.clear();
        ids.forEach(id => this.onNotificationRemovedEmitter.fire(id));
    }

    /**
     * Clear read notifications
     */
    clearRead(): void {
        const toRemove: string[] = [];
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
    getAll(): Notification[] {
        return Array.from(this.notifications.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get unread notifications
     */
    getUnread(): Notification[] {
        return this.getAll().filter(n => !n.read);
    }

    /**
     * Get notification by ID
     */
    get(id: string): Notification | undefined {
        return this.notifications.get(id);
    }

    /**
     * Get unread count
     */
    getUnreadCount(): number {
        return this.getUnread().length;
    }

    /**
     * Get notifications by type
     */
    getByType(type: NotificationType): Notification[] {
        return this.getAll().filter(n => n.type === type);
    }

    /**
     * Get notifications by priority
     */
    getByPriority(priority: NotificationPriority): Notification[] {
        return this.getAll().filter(n => n.priority === priority);
    }

    /**
     * Check if there are critical notifications
     */
    hasCritical(): boolean {
        return this.getByPriority('critical').some(n => !n.read);
    }

    /**
     * Clean up expired notifications
     */
    cleanupExpired(): void {
        const now = Date.now();
        const toRemove: string[] = [];

        for (const [id, notification] of this.notifications.entries()) {
            if (notification.expiresAt && notification.expiresAt < now) {
                toRemove.push(id);
            }
        }

        toRemove.forEach(id => this.remove(id));
    }
}
