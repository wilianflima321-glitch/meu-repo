'use client'

import { type ReactNode, useMemo } from 'react'
import {
  ToastProvider as BaseProvider,
  useToast as useToastBase,
  type Toast as BaseToast,
  type ToastType as BaseToastType,
} from './toast-system'

export type ToastType = BaseToastType

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, description?: string, duration?: number) => string
  error: (title: string, description?: string, duration?: number) => string
  warning: (title: string, description?: string, duration?: number) => string
  info: (title: string, description?: string, duration?: number) => string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return <BaseProvider>{children}</BaseProvider>
}

function mapLegacyToast(toast: Omit<Toast, 'id'>): Omit<BaseToast, 'id'> {
  const hasDescription = Boolean(toast.description)
  return {
    type: toast.type,
    title: hasDescription ? toast.title : undefined,
    message: hasDescription ? toast.description || toast.title : toast.title,
    duration: toast.duration,
    action: toast.action,
  }
}

function mapBaseToLegacy(toast: BaseToast): Toast {
  const hasTitle = Boolean(toast.title)
  return {
    id: toast.id,
    type: toast.type,
    title: hasTitle ? toast.title || toast.message : toast.message,
    description: hasTitle ? toast.message : undefined,
    duration: toast.duration,
    action: toast.action,
  }
}

export function useToast(): ToastContextType {
  const { toasts, addToast, removeToast } = useToastBase()

  const legacyToasts = useMemo(() => toasts.map(mapBaseToLegacy), [toasts])

  const addToastLegacy = (toast: Omit<Toast, 'id'>) => addToast(mapLegacyToast(toast))

  const success = (title: string, description?: string, duration?: number) =>
    addToastLegacy({ type: 'success', title, description, duration })
  const error = (title: string, description?: string, duration?: number) =>
    addToastLegacy({ type: 'error', title, description, duration })
  const warning = (title: string, description?: string, duration?: number) =>
    addToastLegacy({ type: 'warning', title, description, duration })
  const info = (title: string, description?: string, duration?: number) =>
    addToastLegacy({ type: 'info', title, description, duration })

  return {
    toasts: legacyToasts,
    addToast: addToastLegacy,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}

export default ToastProvider
