/**
 * Notification Manager
 * Manages toast notifications and progress indicators
 */

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  severity: NotificationSeverity;
  message: string;
  actions?: NotificationAction[];
  timeout?: number;
  timestamp: Date;
}

export interface NotificationAction {
  label: string;
  callback: () => void;
}

export interface ProgressOptions {
  title: string;
  cancellable?: boolean;
  location?: 'notification' | 'window';
}

export interface Progress {
  report(value: { message?: string; increment?: number }): void;
}

export class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private nextId = 0;
  private listeners: Set<() => void> = new Set();
  private readonly MAX_NOTIFICATIONS = 50;
  private readonly DEFAULT_TIMEOUT = 5000;

  /**
   * Show information notification
   */
  showInformation(message: string, ...actions: string[]): Promise<string | undefined> {
    return this.show('info', message, actions);
  }

  /**
   * Show warning notification
   */
  showWarning(message: string, ...actions: string[]): Promise<string | undefined> {
    return this.show('warning', message, actions);
  }

  /**
   * Show error notification
   */
  showError(message: string, ...actions: string[]): Promise<string | undefined> {
    return this.show('error', message, actions);
  }

  /**
   * Show success notification
   */
  showSuccess(message: string, ...actions: string[]): Promise<string | undefined> {
    return this.show('success', message, actions);
  }

  /**
   * Show notification with actions
   */
  private show(
    severity: NotificationSeverity,
    message: string,
    actionLabels: string[]
  ): Promise<string | undefined> {
    return new Promise((resolve) => {
      const id = `notification-${this.nextId++}`;
      
      const actions: NotificationAction[] = actionLabels.map(label => ({
        label,
        callback: () => {
          this.dismiss(id);
          resolve(label);
        },
      }));

      const notification: Notification = {
        id,
        severity,
        message,
        actions,
        timeout: this.getTimeout(severity),
        timestamp: new Date(),
      };

      this.notifications.set(id, notification);
      this.notifyListeners();

      // Auto-dismiss after timeout
      if (notification.timeout) {
        setTimeout(() => {
          if (this.notifications.has(id)) {
            this.dismiss(id);
            resolve(undefined);
          }
        }, notification.timeout);
      }

      // Trim old notifications
      this.trimNotifications();

      console.log(`[Notification] ${severity.toUpperCase()}: ${message}`);
    });
  }

  /**
   * Show progress notification
   */
  async withProgress<T>(
    options: ProgressOptions,
    task: (progress: Progress, token: CancellationToken) => Promise<T>
  ): Promise<T> {
    const id = `progress-${this.nextId++}`;
    const cancellationToken = new CancellationToken();

    const notification: Notification = {
      id,
      severity: 'info',
      message: options.title,
      actions: options.cancellable ? [
        {
          label: 'Cancel',
          callback: () => {
            cancellationToken.cancel();
            this.dismiss(id);
          },
        },
      ] : undefined,
      timestamp: new Date(),
    };

    this.notifications.set(id, notification);
    this.notifyListeners();

    const progress: Progress = {
      report: (value) => {
        const notif = this.notifications.get(id);
        if (notif && value.message) {
          notif.message = `${options.title}: ${value.message}`;
          this.notifyListeners();
        }
      },
    };

    try {
      const result = await task(progress, cancellationToken);
      this.dismiss(id);
      return result;
    } catch (error) {
      this.dismiss(id);
      throw error;
    }
  }

  /**
   * Dismiss notification
   */
  dismiss(id: string): void {
    this.notifications.delete(id);
    this.notifyListeners();
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this.notifications.clear();
    this.notifyListeners();
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get notification count
   */
  getCount(): number {
    return this.notifications.size;
  }

  /**
   * Listen to changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get timeout based on severity
   */
  private getTimeout(severity: NotificationSeverity): number {
    switch (severity) {
      case 'error':
        return 10000; // 10 seconds for errors
      case 'warning':
        return 7000; // 7 seconds for warnings
      case 'success':
        return 3000; // 3 seconds for success
      case 'info':
      default:
        return this.DEFAULT_TIMEOUT;
    }
  }

  /**
   * Trim old notifications
   */
  private trimNotifications(): void {
    if (this.notifications.size > this.MAX_NOTIFICATIONS) {
      const sorted = Array.from(this.notifications.entries()).sort(
        (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
      );

      const toRemove = sorted.slice(0, this.notifications.size - this.MAX_NOTIFICATIONS);
      for (const [id] of toRemove) {
        this.notifications.delete(id);
      }
    }
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

/**
 * Cancellation Token
 */
export class CancellationToken {
  private cancelled = false;
  private listeners: Set<() => void> = new Set();

  /**
   * Check if cancelled
   */
  isCancellationRequested(): boolean {
    return this.cancelled;
  }

  /**
   * Cancel
   */
  cancel(): void {
    if (this.cancelled) return;
    
    this.cancelled = true;
    this.listeners.forEach(listener => listener());
    this.listeners.clear();
  }

  /**
   * Listen to cancellation
   */
  onCancellationRequested(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// Singleton instance
let notificationManagerInstance: NotificationManager | null = null;

export function getNotificationManager(): NotificationManager {
  if (!notificationManagerInstance) {
    notificationManagerInstance = new NotificationManager();
  }
  return notificationManagerInstance;
}
