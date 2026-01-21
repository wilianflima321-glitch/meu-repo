/**
 * Notification/Toast System - Sistema de Notificações Avançado
 * 
 * Sistema completo com:
 * - Toast notifications (success, error, warning, info)
 * - In-game notifications (achievements, objectives, etc.)
 * - Notification queue with priority
 * - Custom notification types
 * - Animation and positioning
 * - Sound integration
 * - Action buttons
 * - Progress notifications
 * - Persistent notifications
 * 
 * @module lib/ui/notification-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType = 
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'achievement'
  | 'objective'
  | 'item'
  | 'level_up'
  | 'message'
  | 'system'
  | 'custom';

export type NotificationPosition = 
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationAnimation = 
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'scale'
  | 'bounce'
  | 'none';

export interface NotificationAction {
  id: string;
  label: string;
  icon?: string;
  style?: 'primary' | 'secondary' | 'danger';
  callback?: () => void;
}

export interface NotificationOptions {
  id?: string;
  type?: NotificationType;
  title: string;
  message?: string;
  icon?: string;
  image?: string;
  duration?: number; // ms, 0 = persistent
  priority?: NotificationPriority;
  position?: NotificationPosition;
  animation?: NotificationAnimation;
  sound?: string;
  actions?: NotificationAction[];
  progress?: number; // 0-100
  closable?: boolean;
  pauseOnHover?: boolean;
  group?: string;
  data?: Record<string, unknown>;
  onShow?: () => void;
  onClose?: () => void;
  onClick?: () => void;
}

export interface Notification extends Required<Omit<NotificationOptions, 'onShow' | 'onClose' | 'onClick'>> {
  createdAt: number;
  expiresAt: number | null;
  visible: boolean;
  paused: boolean;
  remainingTime: number;
  onShow?: () => void;
  onClose?: () => void;
  onClick?: () => void;
}

export interface NotificationConfig {
  maxVisible: number;
  defaultDuration: number;
  defaultPosition: NotificationPosition;
  defaultAnimation: NotificationAnimation;
  stackDirection: 'up' | 'down';
  spacing: number;
  sounds: Record<NotificationType, string | null>;
  enableSounds: boolean;
  pauseOnWindowBlur: boolean;
  groupSimilar: boolean;
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

export interface NotificationTemplate {
  type: NotificationType;
  icon: string;
  defaultTitle: string;
  defaultDuration: number;
  sound?: string;
  position?: NotificationPosition;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  success: {
    type: 'success',
    icon: '✓',
    defaultTitle: 'Success',
    defaultDuration: 3000,
    sound: 'success',
  },
  error: {
    type: 'error',
    icon: '✕',
    defaultTitle: 'Error',
    defaultDuration: 5000,
    sound: 'error',
  },
  warning: {
    type: 'warning',
    icon: '⚠',
    defaultTitle: 'Warning',
    defaultDuration: 4000,
    sound: 'warning',
  },
  info: {
    type: 'info',
    icon: 'ℹ',
    defaultTitle: 'Info',
    defaultDuration: 3000,
    sound: 'info',
  },
  achievement: {
    type: 'achievement',
    icon: '🏆',
    defaultTitle: 'Achievement Unlocked',
    defaultDuration: 5000,
    sound: 'achievement',
    position: 'top-center',
  },
  objective: {
    type: 'objective',
    icon: '◉',
    defaultTitle: 'New Objective',
    defaultDuration: 4000,
    sound: 'objective',
    position: 'top-left',
  },
  item: {
    type: 'item',
    icon: '📦',
    defaultTitle: 'Item Received',
    defaultDuration: 3000,
    sound: 'item_pickup',
  },
  level_up: {
    type: 'level_up',
    icon: '⬆',
    defaultTitle: 'Level Up!',
    defaultDuration: 5000,
    sound: 'level_up',
    position: 'center',
  },
  message: {
    type: 'message',
    icon: '💬',
    defaultTitle: 'New Message',
    defaultDuration: 4000,
    sound: 'message',
  },
  system: {
    type: 'system',
    icon: '⚙',
    defaultTitle: 'System',
    defaultDuration: 3000,
  },
  custom: {
    type: 'custom',
    icon: '•',
    defaultTitle: 'Notification',
    defaultDuration: 3000,
  },
};

// ============================================================================
// NOTIFICATION MANAGER
// ============================================================================

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
    
    this.config = {
      maxVisible: 5,
      defaultDuration: 3000,
      defaultPosition: 'top-right',
      defaultAnimation: 'slide-left',
      stackDirection: 'down',
      spacing: 10,
      sounds: {
        success: 'ui/success.mp3',
        error: 'ui/error.mp3',
        warning: 'ui/warning.mp3',
        info: 'ui/info.mp3',
        achievement: 'ui/achievement.mp3',
        objective: 'ui/objective.mp3',
        item: 'ui/item.mp3',
        level_up: 'ui/level_up.mp3',
        message: 'ui/message.mp3',
        system: null,
        custom: null,
      },
      enableSounds: true,
      pauseOnWindowBlur: true,
      groupSimilar: true,
      ...config,
    };
    
    // Start update loop
    this.startUpdateLoop();
    
    // Handle window blur/focus
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
  
  // ============================================================================
  // UPDATE LOOP
  // ============================================================================
  
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
    
    // Process queue
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
  
  // ============================================================================
  // SHOW NOTIFICATIONS
  // ============================================================================
  
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
    
    // Play sound
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
  
  // ============================================================================
  // CLOSE NOTIFICATIONS
  // ============================================================================
  
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
  
  // ============================================================================
  // UPDATE NOTIFICATIONS
  // ============================================================================
  
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
  
  // ============================================================================
  // PAUSE/HOVER
  // ============================================================================
  
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
  
  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================
  
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
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
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
  
  // ============================================================================
  // SOUND
  // ============================================================================
  
  private playSound(soundId: string): void {
    // Implementation depends on audio system
    this.emit('playSound', soundId);
  }
  
  setEnableSounds(enabled: boolean): void {
    this.config.enableSounds = enabled;
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
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
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stopUpdateLoop();
    this.notifications.clear();
    this.queue = [];
    this.removeAllListeners();
    NotificationManager.instance = null;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface NotificationContextValue {
  manager: NotificationManager;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<NotificationConfig>;
}) {
  const value = useMemo(() => ({
    manager: new NotificationManager(config),
  }), []);
  
  useEffect(() => {
    return () => {
      value.manager.dispose();
    };
  }, [value]);
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    return NotificationManager.getInstance();
  }
  return context.manager;
}

export function useVisibleNotifications() {
  const manager = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>(manager.getVisible());
  
  useEffect(() => {
    const update = (n: Notification[]) => setNotifications([...n]);
    manager.on('change', update);
    
    return () => {
      manager.off('change', update);
    };
  }, [manager]);
  
  return notifications;
}

export function useNotificationsByPosition(position: NotificationPosition) {
  const manager = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>(
    manager.getByPosition(position)
  );
  
  useEffect(() => {
    const update = () => setNotifications(manager.getByPosition(position));
    manager.on('change', update);
    
    return () => {
      manager.off('change', update);
    };
  }, [manager, position]);
  
  return notifications;
}

export function useToast() {
  const manager = useNotifications();
  
  const toast = useCallback((options: NotificationOptions) => {
    return manager.show(options);
  }, [manager]);
  
  const success = useCallback((title: string, message?: string) => {
    return manager.success(title, message);
  }, [manager]);
  
  const error = useCallback((title: string, message?: string) => {
    return manager.error(title, message);
  }, [manager]);
  
  const warning = useCallback((title: string, message?: string) => {
    return manager.warning(title, message);
  }, [manager]);
  
  const info = useCallback((title: string, message?: string) => {
    return manager.info(title, message);
  }, [manager]);
  
  const close = useCallback((id: string) => {
    manager.close(id);
  }, [manager]);
  
  const promise = useCallback(<T,>(
    p: Promise<T>,
    options: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) => {
    return manager.promise(p, options);
  }, [manager]);
  
  return { toast, success, error, warning, info, close, promise };
}

export function useGameNotifications() {
  const manager = useNotifications();
  
  const achievement = useCallback((title: string, message?: string) => {
    return manager.achievement(title, message);
  }, [manager]);
  
  const objective = useCallback((title: string, message?: string) => {
    return manager.objective(title, message);
  }, [manager]);
  
  const item = useCallback((itemName: string) => {
    return manager.item(itemName);
  }, [manager]);
  
  const levelUp = useCallback((level: number) => {
    return manager.levelUp(level);
  }, [manager]);
  
  const message = useCallback((from: string, content: string) => {
    return manager.message(from, content);
  }, [manager]);
  
  return { achievement, objective, item, levelUp, message };
}

export function useNotificationProgress(id: string) {
  const manager = useNotifications();
  
  const setProgress = useCallback((progress: number) => {
    manager.setProgress(id, progress);
  }, [manager, id]);
  
  const complete = useCallback(() => {
    manager.setProgress(id, 100);
    setTimeout(() => manager.close(id), 500);
  }, [manager, id]);
  
  return { setProgress, complete };
}

export default {
  NotificationManager,
  NOTIFICATION_TEMPLATES,
  NotificationProvider,
  useNotifications,
  useVisibleNotifications,
  useNotificationsByPosition,
  useToast,
  useGameNotifications,
  useNotificationProgress,
};
