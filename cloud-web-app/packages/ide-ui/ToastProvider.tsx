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
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading'

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
  loading: (message: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 4000
const MAX_TOASTS = 4

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    Icon: React.FC<{ size?: number; className?: string }>
    iconColor: string
    borderColor: string
    bgColor: string
    glowColor: string
  }
> = {
  success: {
    Icon: CheckCircle2,
    iconColor: 'var(--aethel-success)',
    borderColor: 'rgba(var(--aethel-success-rgb), 0.3)',
    bgColor: 'rgba(var(--aethel-success-rgb), 0.06)',
    glowColor: 'rgba(var(--aethel-success-rgb), 0.15)',
  },
  error: {
    Icon: AlertCircle,
    iconColor: 'var(--aethel-error)',
    borderColor: 'rgba(var(--aethel-error-rgb), 0.3)',
    bgColor: 'rgba(var(--aethel-error-rgb), 0.06)',
    glowColor: 'rgba(var(--aethel-error-rgb), 0.15)',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: 'var(--aethel-warning)',
    borderColor: 'rgba(var(--aethel-warning-rgb), 0.3)',
    bgColor: 'rgba(var(--aethel-warning-rgb), 0.06)',
    glowColor: 'rgba(var(--aethel-warning-rgb), 0.15)',
  },
  info: {
    Icon: Info,
    iconColor: 'var(--aethel-primary)',
    borderColor: 'rgba(var(--aethel-primary-rgb), 0.3)',
    bgColor: 'rgba(var(--aethel-primary-rgb), 0.06)',
    glowColor: 'rgba(var(--aethel-primary-rgb), 0.15)',
  },
  loading: {
    Icon: Loader2,
    iconColor: 'var(--aethel-accent)',
    borderColor: 'rgba(var(--aethel-accent-rgb), 0.3)',
    bgColor: 'rgba(var(--aethel-accent-rgb), 0.06)',
    glowColor: 'rgba(var(--aethel-accent-rgb), 0.15)',
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
    // Ensure sticky loading doesn't auto-dismiss unless overriden
    const effectiveDuration = variant === 'loading' && options?.duration === undefined ? 0 : options?.duration
    const t: Toast = { id, message, variant, ...options, duration: effectiveDuration }
    
    setToasts(prev => {
      const next = [t, ...prev]
      if (next.length > MAX_TOASTS) {
        return next.slice(0, MAX_TOASTS)
      }
      return next
    })
    return id
  }, [])

  const ctx: ToastContextValue = {
    toast: add,
    success: (msg, opts) => add(msg, 'success', opts),
    error:   (msg, opts) => add(msg, 'error',   opts),
    warning: (msg, opts) => add(msg, 'warning', opts),
    info:    (msg, opts) => add(msg, 'info',    opts),
    loading: (msg, opts) => add(msg, 'loading', opts),
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
        @keyframes aethel-toast-enter {
          0% { opacity: 0; transform: translateY(16px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aethel-toast-exit {
          0% { opacity: 1; transform: translateY(0) scale(1); margin-bottom: 8px; max-height: 120px; }
          100% { opacity: 0; transform: scale(0.9); margin-bottom: 0; max-height: 0; padding-top: 0; padding-bottom: 0; border-width: 0; }
        }
        .aethel-toast-item {
          animation: aethel-toast-enter 0.3s cubic-bezier(0.2, 1, 0.2, 1) forwards;
          transform-origin: bottom center;
        }
        .aethel-toast-item[data-exiting="true"] {
          animation: aethel-toast-exit 0.2s ease-in forwards;
        }
      `}</style>
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 8,
          maxWidth: 360,
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
    exitTimeoutRef.current = setTimeout(() => onDismiss(toast.id), 200)
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

  const { Icon, iconColor, borderColor, bgColor, glowColor } = VARIANT_CONFIG[toast.variant]

  return (
    <div
      role="alert"
      className="aethel-toast-item"
      data-exiting={exiting}
      style={{
        pointerEvents: 'all',
        background: 'var(--aethel-panel-strong)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--aethel-border-secondary)',
        borderRadius: 12,
        boxShadow: `0 16px 40px color-mix(in srgb, var(--aethel-brand-pure-black) 60%, transparent), 0 0 0 1px ${borderColor} inset, 0 8px 16px ${glowColor}`,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background tint based on variant */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${bgColor} 0%, transparent 100%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 8,
            background: bgColor,
            color: iconColor,
            flexShrink: 0,
            boxShadow: `0 0 0 1px ${borderColor}`,
          }}
        >
          <Icon size={14} className={toast.variant === 'loading' ? 'animate-spin' : ''} />
        </span>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, marginTop: 1 }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--aethel-text-primary)',
            lineHeight: 1.4,
            letterSpacing: '0.01em',
          }}>
            {toast.message}
          </p>
          {toast.description && (
            <p style={{
              margin: '2px 0 0',
              fontSize: 11,
              color: 'var(--aethel-text-tertiary)',
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
            padding: 4,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--aethel-text-tertiary)',
            display: 'flex',
            borderRadius: 6,
            marginTop: -2,
            marginRight: -4,
            transition: 'all 100ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--aethel-text-primary)'; e.currentTarget.style.background = 'var(--aethel-interactive-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--aethel-text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar line */}
      {duration > 0 && (
        <div style={{ width: '100%', height: 2, background: 'var(--aethel-border-secondary)', position: 'relative', zIndex: 1 }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: iconColor,
            boxShadow: `0 0 6px ${iconColor}`,
            transition: 'width 16ms linear',
          }} />
        </div>
      )}
    </div>
  )
}
