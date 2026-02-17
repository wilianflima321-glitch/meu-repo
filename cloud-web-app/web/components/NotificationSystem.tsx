'use client'

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react'

// ============= Notification Types =============

type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

// ============= Context =============

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => string
  removeNotification: (id: string) => void
  updateNotification: (id: string, updates: Partial<Notification>) => void
  clearAll: () => void
  // Convenience methods
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
  loading: (title: string, message?: string) => string
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => Promise<T>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

// ============= Provider =============

interface NotificationProviderProps {
  children: ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxNotifications?: number
}

export function NotificationProvider({
  children,
  position = 'top-right',
  maxNotifications = 5,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id'>): string => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const newNotification: Notification = {
        id,
        dismissible: true,
        duration: notification.type === 'loading' ? 0 : 5000,
        ...notification,
      }

      setNotifications((prev) => {
        const updated = [newNotification, ...prev]
        return updated.slice(0, maxNotifications)
      })

      // Auto-dismiss
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => removeNotification(id), newNotification.duration)
      }

      return id
    },
    [maxNotifications, removeNotification]
  )

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    )

    // If updating to non-loading type, set auto-dismiss
    if (updates.type && updates.type !== 'loading') {
      const duration = updates.duration ?? 5000
      if (duration > 0) {
        setTimeout(() => removeNotification(id), duration)
      }
    }
  }, [removeNotification])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string) =>
      addNotification({ type: 'success', title, message }),
    [addNotification]
  )

  const error = useCallback(
    (title: string, message?: string) =>
      addNotification({ type: 'error', title, message, duration: 8000 }),
    [addNotification]
  )

  const warning = useCallback(
    (title: string, message?: string) =>
      addNotification({ type: 'warning', title, message }),
    [addNotification]
  )

  const info = useCallback(
    (title: string, message?: string) =>
      addNotification({ type: 'info', title, message }),
    [addNotification]
  )

  const loading = useCallback(
    (title: string, message?: string) =>
      addNotification({ type: 'loading', title, message, dismissible: false }),
    [addNotification]
  )

  const promise = useCallback(
    async <T,>(
      promiseToTrack: Promise<T>,
      messages: { loading: string; success: string; error: string }
    ): Promise<T> => {
      const id = loading(messages.loading)
      try {
        const result = await promiseToTrack
        updateNotification(id, { type: 'success', title: messages.success })
        return result
      } catch (err) {
        updateNotification(id, {
          type: 'error',
          title: messages.error,
          message: err instanceof Error ? err.message : undefined,
        })
        throw err
      }
    },
    [loading, updateNotification]
  )

  // Position classes
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        updateNotification,
        clearAll,
        success,
        error,
        warning,
        info,
        loading,
        promise,
      }}
    >
      {children}

      {/* Notification Container */}
      <div
        className={`fixed z-[100] flex flex-col gap-3 ${positionClasses[position]}`}
        role="region"
        aria-label="Notifications"
      >
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

// ============= Notification Item =============

interface NotificationItemProps {
  notification: Notification
  onDismiss: () => void
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(onDismiss, 200)
  }

  const icons: Record<NotificationType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    loading: Loader2,
  }

  const colors: Record<NotificationType, { bg: string; icon: string; border: string }> = {
    success: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      border: 'border-emerald-500/30',
    },
    error: {
      bg: 'bg-red-500/10',
      icon: 'text-red-400',
      border: 'border-red-500/30',
    },
    warning: {
      bg: 'bg-amber-500/10',
      icon: 'text-amber-400',
      border: 'border-amber-500/30',
    },
    info: {
      bg: 'bg-blue-500/10',
      icon: 'text-blue-400',
      border: 'border-blue-500/30',
    },
    loading: {
      bg: 'bg-slate-500/10',
      icon: 'text-slate-400',
      border: 'border-slate-500/30',
    },
  }

  const Icon = icons[notification.type]
  const color = colors[notification.type]

  return (
    <div
      className={`
        w-80 p-4 rounded-xl border backdrop-blur-xl shadow-xl
        ${color.bg} ${color.border}
        ${isExiting ? 'animate-fade-out' : 'animate-slide-in-right'}
      `}
      role="alert"
    >
      <div className="flex gap-3">
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${color.icon} ${
            notification.type === 'loading' ? 'animate-spin' : ''
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{notification.title}</p>
          {notification.message && (
            <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
          )}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        {notification.dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white transition-colors rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============= Hook =============

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Alias for backward compatibility
export const NotificationSystem = NotificationProvider;

// ============= CSS for animations =============
// Add to your global CSS:
/*
@keyframes fade-out {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(100%); }
}

.animate-fade-out {
  animation: fade-out 200ms ease-out forwards;
}
*/
