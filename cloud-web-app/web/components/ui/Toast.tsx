'use client'

import { useEffect, useState, createContext, useContext, type ReactNode, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

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
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
}

const toastStyles: Record<ToastType, { bg: string; icon: string; border: string; progress: string }> = {
  success: {
    bg: 'bg-slate-900/95',
    icon: 'text-emerald-400',
    border: 'border-emerald-500/30',
    progress: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-slate-900/95',
    icon: 'text-red-400',
    border: 'border-red-500/30',
    progress: 'bg-red-500',
  },
  warning: {
    bg: 'bg-slate-900/95',
    icon: 'text-amber-400',
    border: 'border-amber-500/30',
    progress: 'bg-amber-500',
  },
  info: {
    bg: 'bg-slate-900/95',
    icon: 'text-blue-400',
    border: 'border-blue-500/30',
    progress: 'bg-blue-500',
  },
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  const duration = toast.duration || 5000
  const styles = toastStyles[toast.type]

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 50))
        if (newProgress <= 0) {
          setIsExiting(true)
          setTimeout(onClose, 300)
          return 0
        }
        return newProgress
      })
    }, 50)

    return () => clearInterval(interval)
  }, [duration, onClose, isPaused])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 300)
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 
        rounded-xl border
        backdrop-blur-xl
        shadow-2xl shadow-black/30
        transform transition-all duration-300 ease-out
        ${styles.bg} ${styles.border}
        ${isExiting 
          ? 'opacity-0 translate-x-full scale-95' 
          : 'opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right-full'
        }
      `}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
        {icons[toast.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 leading-tight">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-1 text-sm text-slate-400 leading-relaxed">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              handleClose()
            }}
            className="mt-2 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="
          flex-shrink-0 p-1.5 -m-1 rounded-lg
          text-slate-400 hover:text-slate-200
          hover:bg-slate-700/50
          transition-all duration-200
        "
        aria-label="Fechar notificação"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
        <div
          className={`h-full ${styles.progress} transition-all duration-50 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]) // Keep max 5 toasts
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Convenience methods
  const success = useCallback((title: string, description?: string) => 
    addToast({ type: 'success', title, description }), [addToast])
  
  const error = useCallback((title: string, description?: string) => 
    addToast({ type: 'error', title, description }), [addToast])
  
  const warning = useCallback((title: string, description?: string) => 
    addToast({ type: 'warning', title, description }), [addToast])
  
  const info = useCallback((title: string, description?: string) => 
    addToast({ type: 'info', title, description }), [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="
          fixed bottom-6 right-6 z-[9999] 
          flex flex-col gap-3 
          max-w-md w-full 
          pointer-events-none
        "
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
