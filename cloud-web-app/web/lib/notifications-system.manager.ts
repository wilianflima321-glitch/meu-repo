import { createComponentLogger } from '@/lib/observability/logger'
import type { Notification, NotificationListener } from '@/lib/notifications-system.types'
import {
  getChromeNotifications,
  setChromeNotifications,
} from '@/lib/storage/ui-persistence-spine'

const log = createComponentLogger('notifications-system')

export class NotificationManager {
  private static instance: NotificationManager
  private notifications: Notification[] = []
  private listeners: Set<NotificationListener> = new Set()
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private userId?: string

  private constructor() {
    this.loadFromStorage()
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  connect(userId: string): void {
    this.userId = userId
    if (typeof window === 'undefined') return

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/notifications/ws?userId=${userId}`

    try {
      this.ws = new WebSocket(wsUrl)
      this.ws.onopen = () => {
        log.info('[Notifications] WebSocket connected')
        this.reconnectAttempts = 0
      }
      this.ws.onmessage = (event) => {
        try {
          this.addNotification(JSON.parse(event.data) as Notification)
        } catch (error) {
          log.error('[Notifications] Failed to parse message:', error)
        }
      }
      this.ws.onclose = () => {
        log.info('[Notifications] WebSocket closed')
        this.attemptReconnect()
      }
      this.ws.onerror = (error) => {
        log.error('[Notifications] WebSocket error:', error)
      }
    } catch (error) {
      log.error('[Notifications] Failed to connect:', error)
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.userId = undefined
  }

  addNotification(notification: Notification): void {
    this.notifications.unshift(notification)
    this.saveToStorage()
    this.notifyListeners(notification)

    if (notification.channels.includes('in_app')) {
      this.showToast(notification)
    }
    if (notification.channels.includes('push')) {
      void this.showPushNotification(notification)
    }
  }

  notify(title: string, message: string, options?: Partial<Notification>): void {
    this.addNotification({
      id: this.generateId(),
      userId: this.userId || '',
      type: options?.type || 'info',
      priority: options?.priority || 'normal',
      title,
      message,
      icon: options?.icon,
      imageUrl: options?.imageUrl,
      actionUrl: options?.actionUrl,
      actionLabel: options?.actionLabel,
      metadata: options?.metadata,
      channels: options?.channels || ['in_app'],
      read: false,
      dismissed: false,
      expiresAt: options?.expiresAt,
      createdAt: new Date(),
    })
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find((item) => item.id === notificationId)
    if (notification) {
      notification.read = true
      this.saveToStorage()
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach((notification) => {
      notification.read = true
    })
    this.saveToStorage()
  }

  dismiss(notificationId: string): void {
    const index = this.notifications.findIndex((notification) => notification.id === notificationId)
    if (index !== -1) {
      this.notifications.splice(index, 1)
      this.saveToStorage()
    }
  }

  clearAll(): void {
    this.notifications = []
    this.saveToStorage()
  }

  getAll(): Notification[] {
    return [...this.notifications]
  }

  getUnread(): Notification[] {
    return this.notifications.filter((notification) => !notification.read)
  }

  getUnreadCount(): number {
    return this.getUnread().length
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private attemptReconnect(): void {
    if (!this.userId || this.reconnectAttempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts += 1
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    setTimeout(() => {
      if (this.userId) this.connect(this.userId)
    }, delay)
  }

  private notifyListeners(notification: Notification): void {
    this.listeners.forEach((listener) => listener(notification))
  }

  private showToast(notification: Notification): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aethel:toast', { detail: notification }))
    }
  }

  private async showPushNotification(notification: Notification): Promise<void> {
    if (typeof globalThis.Notification === 'undefined') return

    if (globalThis.Notification.permission === 'granted') {
      new globalThis.Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/icon-192.png',
        tag: notification.id,
        data: { url: notification.actionUrl },
      })
    } else if (globalThis.Notification.permission !== 'denied') {
      const permission = await globalThis.Notification.requestPermission()
      if (permission === 'granted') {
        await this.showPushNotification(notification)
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    setChromeNotifications(this.notifications.slice(0, 100))
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    try {
      this.notifications = getChromeNotifications<Notification>([])
    } catch (error) {
      log.error('[Notifications] Failed to load from storage:', error)
    }
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

export const notifications = typeof window !== 'undefined'
  ? NotificationManager.getInstance()
  : null
