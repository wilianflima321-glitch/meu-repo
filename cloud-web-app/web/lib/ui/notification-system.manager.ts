import { EventEmitter } from 'events';

import { createDefaultNotificationConfig } from './notification-system.defaults';
import {
  NOTIFICATION_TEMPLATES,
  type Notification,
  type NotificationConfig,
  type NotificationOptions,
  type NotificationPosition,
  type NotificationPriority,
  type NotificationType,
} from './notification-system.types';
export {
  NOTIFICATION_TEMPLATES,
  type Notification,
  type NotificationAction,
  type NotificationAnimation,
  type NotificationConfig,
  type NotificationOptions,
  type NotificationPosition,
  type NotificationPriority,
  type NotificationTemplate,
  type NotificationType,
} from './notification-system.types';

export class NotificationManager extends EventEmitter {
  private static instance: NotificationManager | null = null;

  private config: NotificationConfig;
  private notifications: Map<string, Notification> = new Map();
  private queue: Notification[] = [];
  private activeCount = 0;
  private idCounter = 0;
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private isPaused = false;

  constructor(config: Partial<NotificationConfig> = {}) {
    super();

    this.config = createDefaultNotificationConfig(config);

    this.startUpdateLoop();

    if (typeof window !== 'undefined' && this.config.pauseOnWindowBlur) {
      window.addEventListener('blur', () => this.pause());
      window.addEventListener('focus', () => this.resume());
    }
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private startUpdateLoop(): void {
    this.updateTimer = setInterval(() => this.update(), 100);
  }

  private stopUpdateLoop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private update(): void {
    if (this.isPaused) return;

    const now = Date.now();

    for (const [id, notification] of this.notifications) {
      if (notification.paused || !notification.visible) continue;

      if (notification.expiresAt && now >= notification.expiresAt) {
        this.close(id);
      } else if (notification.expiresAt) {
        notification.remainingTime = notification.expiresAt - now;
      }
    }

    this.processQueue();
  }

  pause(): void {
    this.isPaused = true;
    this.emit('paused');
  }

  resume(): void {
    this.isPaused = false;

    // Extend expiration times for visible notifications
    const now = Date.now();
    for (const notification of this.notifications.values()) {
      if (notification.visible && notification.expiresAt) {
        notification.expiresAt = now + notification.remainingTime;
      }
    }

    this.emit('resumed');
  }

  show(options: NotificationOptions): string {
    const template = NOTIFICATION_TEMPLATES[options.type || 'info'];
    const id = options.id || this.generateId();

    // Check for existing notification with same ID
    if (this.notifications.has(id)) {
      this.update();
      return id;
    }

    // Check for grouping
    if (this.config.groupSimilar && options.group) {
      const existing = this.findByGroup(options.group);
      if (existing) {
        // Update existing instead of creating new
        this.updateNotification(existing.id, {
          message: options.message,
          progress: options.progress,
        });
        return existing.id;
      }
    }

    const duration = options.duration ?? template.defaultDuration ?? this.config.defaultDuration;
    const now = Date.now();

    const notification: Notification = {
      id,
      type: options.type || 'info',
      title: options.title || template.defaultTitle,
      message: options.message || '',
      icon: options.icon || template.icon,
      image: options.image || '',
      duration,
      priority: options.priority || 'normal',
      position: options.position || template.position || this.config.defaultPosition,
      animation: options.animation || this.config.defaultAnimation,
      sound: options.sound || template.sound || '',
      actions: options.actions || [],
      progress: options.progress ?? -1,
      closable: options.closable ?? true,
      pauseOnHover: options.pauseOnHover ?? true,
      group: options.group || '',
      data: options.data || {},
      createdAt: now,
      expiresAt: duration > 0 ? now + duration : null,
      visible: false,
      paused: false,
      remainingTime: duration,
      onShow: options.onShow,
      onClose: options.onClose,
      onClick: options.onClick,
    };

    this.notifications.set(id, notification);

    // Check if we can show immediately or need to queue
    if (this.activeCount < this.config.maxVisible) {
      this.showNotification(notification);
    } else {
      this.queueNotification(notification);
    }

    return id;
  }

  private showNotification(notification: Notification): void {
    notification.visible = true;
    this.activeCount++;

    if (this.config.enableSounds && notification.sound) {
      this.playSound(notification.sound);
    }

    // Callback
    notification.onShow?.();

    this.emit('show', notification);
    this.emit('change', this.getVisible());
  }

  private queueNotification(notification: Notification): void {
    // Insert based on priority
    const priorityOrder: Record<NotificationPriority, number> = {
      low: 0,
      normal: 1,
      high: 2,
      critical: 3,
    };

    const priority = priorityOrder[notification.priority];
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] < priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, notification);
    this.emit('queued', notification);
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.activeCount < this.config.maxVisible) {
      const notification = this.queue.shift();
      if (notification) {
        this.showNotification(notification);
      }
    }
  }

  close(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    if (notification.visible) {
      notification.visible = false;
      this.activeCount--;
    }

    // Callback
    notification.onClose?.();

    this.emit('close', notification);

    // Remove after animation
    setTimeout(() => {
      this.notifications.delete(id);
      this.processQueue();
      this.emit('change', this.getVisible());
    }, 300);
  }

  closeAll(): void {
    for (const id of this.notifications.keys()) {
      this.close(id);
    }
  }

  closeByType(type: NotificationType): void {
    for (const [id, notification] of this.notifications) {
      if (notification.type === type) {
        this.close(id);
      }
    }
  }

  closeByGroup(group: string): void {
    for (const [id, notification] of this.notifications) {
      if (notification.group === group) {
        this.close(id);
      }
    }
  }

  updateNotification(id: string, updates: Partial<NotificationOptions>): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    if (updates.title !== undefined) notification.title = updates.title;
    if (updates.message !== undefined) notification.message = updates.message;
    if (updates.icon !== undefined) notification.icon = updates.icon;
    if (updates.progress !== undefined) notification.progress = updates.progress;
    if (updates.actions !== undefined) notification.actions = updates.actions;

    // Extend duration if updating
    if (updates.duration !== undefined && notification.expiresAt) {
      notification.expiresAt = Date.now() + updates.duration;
      notification.remainingTime = updates.duration;
    }

    this.emit('update', notification);
    this.emit('change', this.getVisible());
  }

  setProgress(id: string, progress: number): void {
    this.updateNotification(id, { progress: Math.max(0, Math.min(100, progress)) });
  }

  pauseNotification(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification || notification.paused) return;

    notification.paused = true;
    if (notification.expiresAt) {
      notification.remainingTime = notification.expiresAt - Date.now();
    }

    this.emit('pause', notification);
  }

  resumeNotification(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification || !notification.paused) return;

    notification.paused = false;
    if (notification.remainingTime > 0) {
      notification.expiresAt = Date.now() + notification.remainingTime;
    }

    this.emit('resume', notification);
  }

  success(title: string, message?: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'success', title, message });
  }

  error(title: string, message?: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'error', title, message });
  }

  warning(title: string, message?: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'warning', title, message });
  }

  info(title: string, message?: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'info', title, message });
  }

  achievement(title: string, message?: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'achievement', title, message, priority: 'high' });
  }

  objective(title: string, message?: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'objective', title, message });
  }

  item(itemName: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'item', title: 'Item Received', message: itemName });
  }

  levelUp(level: number, options?: Partial<NotificationOptions>): string {
    return this.show({
      ...options,
      type: 'level_up',
      title: 'Level Up!',
      message: `You are now level ${level}`,
      priority: 'high',
    });
  }

  message(from: string, content: string, options?: Partial<NotificationOptions>): string {
    return this.show({ ...options, type: 'message', title: from, message: content });
  }

  loading(title: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      ...options,
      type: 'info',
      title,
      progress: 0,
      duration: 0, // Persistent
      closable: false,
    });
  }

  promise<T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((err: unknown) => string);
    }
  ): Promise<T> {
    const id = this.loading(options.loading);

    return promise
      .then((result) => {
        const message = typeof options.success === 'function'
          ? options.success(result)
          : options.success;
        this.close(id);
        this.success(message);
        return result;
      })
      .catch((err) => {
        const message = typeof options.error === 'function'
          ? options.error(err)
          : options.error;
        this.close(id);
        this.error(message);
        throw err;
      });
  }

  getAll(): Notification[] {
    return Array.from(this.notifications.values());
  }

  getVisible(): Notification[] {
    return this.getAll().filter(n => n.visible);
  }

  getQueued(): Notification[] {
    return [...this.queue];
  }

  get(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  getByType(type: NotificationType): Notification[] {
    return this.getAll().filter(n => n.type === type);
  }

  getByPosition(position: NotificationPosition): Notification[] {
    return this.getVisible().filter(n => n.position === position);
  }

  findByGroup(group: string): Notification | undefined {
    for (const notification of this.notifications.values()) {
      if (notification.group === group) {
        return notification;
      }
    }
    return undefined;
  }

  getCount(): number {
    return this.notifications.size;
  }

  getVisibleCount(): number {
    return this.activeCount;
  }

  private playSound(soundId: string): void {
    // Implementation depends on audio system
    this.emit('playSound', soundId);
  }

  setEnableSounds(enabled: boolean): void {
    this.config.enableSounds = enabled;
  }

  private generateId(): string {
    return `notification_${Date.now()}_${++this.idCounter}`;
  }

  setConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  dispose(): void {
    this.stopUpdateLoop();
    this.notifications.clear();
    this.queue = [];
    this.removeAllListeners();
    NotificationManager.instance = null;
  }
}
