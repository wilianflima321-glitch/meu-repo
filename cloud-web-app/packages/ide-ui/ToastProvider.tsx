'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  description?: string
  variant: ToastVariant
  duration?: number // ms — default 4000, 0 = sticky
}

export interface ToastOptions {
  description?: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => string
  success: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
  warning: (message: string, options?: ToastOptions) => string
  info: (message: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 4000
const MAX_TOASTS = 5

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    Icon: React.FC<{ size?: number }>
    iconColor: string
    borderColor: string
    bgColor: string
  }
> = {
  success: {
    Icon: CheckCircle,
    iconColor: 'var(--aethel-success, #4ade80)',
    borderColor: 'color-mix(in srgb, #4ade80 30%, transparent)',
    bgColor: 'color-mix(in srgb, #4ade80 8%, var(--aethel-surface-secondary))',
  },
  error: {
    Icon: AlertCircle,
    iconColor: 'var(--aethel-error)',
    borderColor: 'color-mix(in srgb, var(--aethel-error) 35%, transparent)',
    bgColor: 'color-mix(in srgb, var(--aethel-error) 10%, var(--aethel-surface-secondary))',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: 'var(--aethel-warning-light, #fbbf24)',
    borderColor: 'color-mix(in srgb, #fbbf24 30%, transparent)',
    bgColor: 'color-mix(in srgb, #fbbf24 8%, var(--aethel-surface-secondary))',
  },
  info: {
    Icon: Info,
    iconColor: 'var(--aethel-info-light, #60a5fa)',
    borderColor: 'color-mix(in srgb, #60a5fa 30%, transparent)',
    bgColor: 'color-mix(in srgb, #60a5fa 8%, var(--aethel-surface-secondary))',
  },
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => setToasts([]), [])

  const add = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    options?: ToastOptions
  ): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const t: Toast = { id, message, variant, ...options }
    setToasts(prev => [t, ...prev].slice(0, MAX_TOASTS))
    return id
  }, [])

  const ctx: ToastContextValue = {
    toast: add,
    success: (msg, opts) => add(msg, 'success', opts),
    error:   (msg, opts) => add(msg, 'error',   opts),
    warning: (msg, opts) => add(msg, 'warning', opts),
    info:    (msg, opts) => add(msg, 'info',    opts),
    dismiss,
    dismissAll,
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {mounted && createPortal(
        <ToastRegion toasts={toasts} onDismiss={dismiss} />,
        document.body
      )}
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}

// ─── Region ───────────────────────────────────────────────────────────────────

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <>
      <style>{`
        @keyframes aethel-toast-in {
          from { opacity: 0; transform: translateX(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
        @keyframes aethel-toast-out {
          from { opacity: 1; transform: translateX(0)    scale(1); max-height: 120px; }
          to   { opacity: 0; transform: translateX(24px) scale(0.96); max-height: 0; }
        }
        [data-aethel-toast] {
          animation: aethel-toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        [data-aethel-toast][data-exiting] {
          animation: aethel-toast-out 180ms ease-in both;
        }
      `}</style>
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 8,
          maxWidth: 380,
          width: 'calc(100vw - 48px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  )
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const duration = toast.duration ?? DEFAULT_DURATION
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startExit = useCallback(() => {
    if (exiting) return
    setExiting(true)
    exitTimeoutRef.current = setTimeout(() => onDismiss(toast.id), 180)
  }, [exiting, onDismiss, toast.id])

  // Auto-dismiss with progress bar
  useEffect(() => {
    if (duration === 0) return
    startRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now)
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct <= 0) {
        startExit()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)
    }
  }, [duration, startExit])

  const { Icon, iconColor, borderColor, bgColor } = VARIANT_CONFIG[toast.variant]

  return (
    <div
      role="alert"
      data-aethel-toast
      data-exiting={exiting || undefined}
      style={{
        pointerEvents: 'all',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
        {/* Icon */}
        <span style={{ color: iconColor, flexShrink: 0, marginTop: 1 }}>
          <Icon size={16} />
        </span>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--aethel-text-primary)',
            lineHeight: 1.4,
          }}>
            {toast.message}
          </p>
          {toast.description && (
            <p style={{
              margin: '4px 0 0',
              fontSize: 11,
              color: 'var(--aethel-text-secondary)',
              lineHeight: 1.4,
            }}>
              {toast.description}
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={startExit}
          style={{
            flexShrink: 0,
            padding: 2,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--aethel-text-tertiary)',
            display: 'flex',
            borderRadius: 4,
            marginTop: -1,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--aethel-text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--aethel-text-tertiary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 2,
          width: `${progress}%`,
          background: iconColor,
          opacity: 0.6,
          transition: 'width 16ms linear',
          borderRadius: '0 0 0 10px',
        }} />
      )}
    </div>
  )
}
