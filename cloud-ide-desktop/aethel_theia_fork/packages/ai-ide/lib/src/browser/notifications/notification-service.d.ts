import { Event } from '@theia/core';
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
export declare class NotificationService {
    private notifications;
    private notificationCounter;
    private readonly onNotificationAddedEmitter;
    readonly onNotificationAdded: Event<Notification>;
    private readonly onNotificationRemovedEmitter;
    readonly onNotificationRemoved: Event<string>;
    private readonly onNotificationUpdatedEmitter;
    readonly onNotificationUpdated: Event<Notification>;
    /**
     * Show a notification
     */
    notify(title: string, message: string, options?: NotificationOptions): string;
    /**
     * Show info notification
     */
    info(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string;
    /**
     * Show success notification
     */
    success(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string;
    /**
     * Show warning notification
     */
    warning(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string;
    /**
     * Show error notification
     */
    error(title: string, message: string, options?: Omit<NotificationOptions, 'type'>): string;
    /**
     * Remove a notification
     */
    remove(id: string): void;
    /**
     * Mark notification as read
     */
    markAsRead(id: string): void;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(): void;
    /**
     * Clear all notifications
     */
    clearAll(): void;
    /**
     * Clear read notifications
     */
    clearRead(): void;
    /**
     * Get all notifications
     */
    getAll(): Notification[];
    /**
     * Get unread notifications
     */
    getUnread(): Notification[];
    /**
     * Get notification by ID
     */
    get(id: string): Notification | undefined;
    /**
     * Get unread count
     */
    getUnreadCount(): number;
    /**
     * Get notifications by type
     */
    getByType(type: NotificationType): Notification[];
    /**
     * Get notifications by priority
     */
    getByPriority(priority: NotificationPriority): Notification[];
    /**
     * Check if there are critical notifications
     */
    hasCritical(): boolean;
    /**
     * Clean up expired notifications
     */
    cleanupExpired(): void;
}
