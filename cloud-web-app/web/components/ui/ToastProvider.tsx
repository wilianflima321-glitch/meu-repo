'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import Codicon from '@/components/ide/Codicon'

/* ── Types ── */
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastContextType {
  toast: (message: string, options?: { type?: ToastType; duration?: number; action?: { label: string; onClick: () => void } }) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  dismiss: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

/* ── Styles ── */
const typeStyles: Record<ToastType, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
}

const typeIcons: Record<ToastType, string> = {
  success: 'check-all',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

/* ── Provider ── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, options?: { type?: ToastType; duration?: number; action?: { label: string; onClick: () => void } }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const type = options?.type ?? 'info'
      const duration = options?.duration ?? 4000

      setToasts((prev) => [...prev.slice(-4), { id, message, type, duration, action: options?.action }])

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container - bottom right */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[1080] flex flex-col gap-2 sm:bottom-6 sm:right-6"
          role="region"
          aria-label="Notificacoes"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl animate-slide-in-right ${typeStyles[t.type]}`}
              role="alert"
            >
              <Codicon name={typeIcons[t.type]} />
              <span className="flex-1 text-sm font-medium">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                  className="text-sm font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded opacity-60 transition-opacity hover:opacity-100"
                aria-label="Fechar"
              >
                <Codicon name="close" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
