/**
 * Enhanced Toast System - Elite Notifications
 * 
 * Suporta múltiplos tipos, ações contextuais e feedback tátil
 * Padrão: Vercel, Linear, Cursor
 */

'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
  X,
  RotateCcw,
  Copy,
  Loader2,
} from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
  variant?: 'primary' | 'secondary'
}

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  description?: string
  action?: ToastAction
  duration?: number // ms, 0 = indefinido
  dismissible?: boolean
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (message: Omit<ToastMessage, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  loading: (title: string, description?: string) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

/**
 * Provider para Toast System
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: Omit<ToastMessage, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const toast: ToastMessage = {
        ...message,
        id,
        duration: message.duration ?? 4000,
        dismissible: message.dismissible ?? true,
      }

      setToasts((prev) => [...prev, toast])

      // Auto-dismiss se duration > 0
      const duration = toast.duration ?? 0
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }

      return id
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'success', title, description }),
    [addToast]
  )

  const error = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'error', title, description, duration: 6000 }),
    [addToast]
  )

  const warning = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'warning', title, description, duration: 5000 }),
    [addToast]
  )

  const info = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'info', title, description }),
    [addToast]
  )

  const loading = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'loading', title, description, duration: 0, dismissible: false }),
    [addToast]
  )

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    loading,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

/**
 * Hook para usar Toast System
 */
export function useToast(): Omit<ToastContextType, 'toasts' | 'addToast' | 'removeToast'> {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }
  return {
    success: context.success,
    error: context.error,
    warning: context.warning,
    info: context.info,
    loading: context.loading,
  }
}

/**
 * Container de Toasts
 */
function ToastContainer() {
  const context = useContext(ToastContext)
  if (!context) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {context.toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => context.removeToast(toast.id)} />
      ))}
    </div>
  )
}

/**
 * Individual Toast Item
 */
function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[var(--aethel-success)]" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[var(--aethel-error)]" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[var(--aethel-warning)]" />
      case 'info':
        return <Info className="w-5 h-5 text-[var(--aethel-info)]" />
      case 'loading':
        return <Loader2 className="w-5 h-5 text-[var(--aethel-primary)] animate-spin" />
      default:
        return null
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-[var(--aethel-success)]/10 border-[var(--aethel-success)]/30'
      case 'error':
        return 'bg-[var(--aethel-error)]/10 border-[var(--aethel-error)]/30'
      case 'warning':
        return 'bg-[var(--aethel-warning)]/10 border-[var(--aethel-warning)]/30'
      case 'info':
        return 'bg-[var(--aethel-info)]/10 border-[var(--aethel-info)]/30'
      case 'loading':
        return 'bg-[var(--aethel-surface-secondary)] border-[var(--aethel-border-primary)]'
      default:
        return 'bg-[var(--aethel-surface-secondary)] border-[var(--aethel-border-primary)]'
    }
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${getBackgroundColor()} shadow-lg backdrop-blur-sm animate-in slide-in-from-right-4 fade-in-80 duration-300`}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-xs text-[var(--aethel-text-secondary)] mt-1">
            {toast.description}
          </p>
        )}

        {/* Action Button */}
        {toast.action && (
          <button
            onClick={async () => {
              await toast.action?.onClick()
              onDismiss()
            }}
            className={`mt-2 text-xs font-medium px-3 py-1 rounded transition-colors ${
              toast.action.variant === 'primary'
                ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-primary-dark)]'
                : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
            }`}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      {toast.dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Padrões de uso comuns
 */
export const toastPatterns = {
  /**
   * Padrão de sucesso com ação
   */
  successWithAction: (
    title: string,
    action: ToastAction,
    description?: string
  ) => ({
    type: 'success' as const,
    title,
    description,
    action,
  }),

  /**
   * Padrão de erro com retry
   */
  errorWithRetry: (
    title: string,
    onRetry: () => void | Promise<void>,
    description?: string
  ) => ({
    type: 'error' as const,
    title,
    description,
    action: {
      label: 'Tentar Novamente',
      onClick: onRetry,
      variant: 'primary' as const,
    },
  }),

  /**
   * Padrão de loading com cancelamento
   */
  loadingWithCancel: (
    title: string,
    onCancel: () => void,
    description?: string
  ) => ({
    type: 'loading' as const,
    title,
    description,
    action: {
      label: 'Cancelar',
      onClick: onCancel,
      variant: 'secondary' as const,
    },
  }),

  /**
   * Padrão de cópia bem-sucedida
   */
  copiedToClipboard: (text?: string) => ({
    type: 'success' as const,
    title: 'Copiado para a área de transferência',
    description: text ? `"${text.substring(0, 30)}..."` : undefined,
    duration: 2000,
  }),

  /**
   * Padrão de operação completada
   */
  operationComplete: (title: string, description?: string) => ({
    type: 'success' as const,
    title,
    description,
    duration: 3000,
  }),

  /**
   * Padrão de erro crítico
   */
  criticalError: (title: string, description?: string) => ({
    type: 'error' as const,
    title,
    description,
    duration: 0, // Permanente até dismiss
    dismissible: true,
  }),
}
