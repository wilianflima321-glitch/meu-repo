'use client'

import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
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
  success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  info: <Info className="h-5 w-5 text-blue-400" />,
}

const bgColors: Record<ToastType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/30',
  error: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-amber-500/10 border-amber-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.duration, onClose])

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        shadow-lg shadow-black/20
        transform transition-all duration-300 ease-out
        ${bgColors[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-slate-400">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true)
          setTimeout(onClose, 300)
        }}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4 text-slate-400" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
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
