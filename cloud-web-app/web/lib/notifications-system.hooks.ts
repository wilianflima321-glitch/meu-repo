import { useCallback, useEffect, useMemo, useState } from 'react'

import { NotificationManager } from '@/lib/notifications-system.manager'
import type { Notification, Toast, ToastOptions } from '@/lib/notifications-system.types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const manager = useMemo(() => NotificationManager.getInstance(), [])

  const refresh = useCallback(() => {
    setNotifications(manager.getAll())
    setUnreadCount(manager.getUnreadCount())
  }, [manager])

  useEffect(() => {
    refresh()
    return manager.subscribe(refresh)
  }, [manager, refresh])

  const markAsRead = useCallback((id: string) => {
    manager.markAsRead(id)
    refresh()
  }, [manager, refresh])

  const markAllAsRead = useCallback(() => {
    manager.markAllAsRead()
    refresh()
  }, [manager, refresh])

  const dismiss = useCallback((id: string) => {
    manager.dismiss(id)
    refresh()
  }, [manager, refresh])

  const clearAll = useCallback(() => {
    manager.clearAll()
    refresh()
  }, [manager, refresh])

  const notify = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    manager.notify(title, message, options)
  }, [manager])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    notify,
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((title: string, message: string, options?: ToastOptions) => {
    const id = `toast_${Date.now()}`
    const toast: Toast = {
      id,
      title,
      message,
      type: options?.type || 'info',
      duration: options?.duration ?? 5000,
      position: options?.position || 'top-right',
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    }

    setToasts((previous) => [...previous, toast])

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => removeToast(id), toast.duration)
    }
  }, [removeToast])

  useEffect(() => {
    const handleToast = (event: CustomEvent<Notification>) => {
      const notification = event.detail
      addToast(notification.title, notification.message, {
        type: notification.type,
        duration: 5000,
      })
    }

    window.addEventListener('aethel:toast', handleToast as EventListener)
    return () => window.removeEventListener('aethel:toast', handleToast as EventListener)
  }, [addToast])

  const toast = {
    info: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) =>
      addToast(title, message, { ...opts, type: 'info' }),
    success: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) =>
      addToast(title, message, { ...opts, type: 'success' }),
    warning: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) =>
      addToast(title, message, { ...opts, type: 'warning' }),
    error: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) =>
      addToast(title, message, { ...opts, type: 'error' }),
  }

  return {
    toasts,
    addToast,
    removeToast,
    toast,
  }
}
