export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'collaboration'
  | 'billing'
  | 'ai'
  | 'achievement'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationChannel =
  | 'in_app'
  | 'push'
  | 'email'
  | 'sms'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  icon?: string
  imageUrl?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
  channels: NotificationChannel[]
  read: boolean
  dismissed: boolean
  expiresAt?: Date
  createdAt: Date
}

export interface NotificationPreferences {
  userId: string
  channels: {
    in_app: boolean
    push: boolean
    email: boolean
    sms: boolean
  }
  types: Record<NotificationType, boolean>
  quietHours?: {
    enabled: boolean
    start: string
    end: string
    timezone: string
  }
  emailDigest: 'instant' | 'daily' | 'weekly' | 'never'
}

export interface ToastOptions {
  type?: NotificationType
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export interface Toast extends ToastOptions {
  id: string
  title: string
  message: string
}

export type NotificationListener = (notification: Notification) => void
