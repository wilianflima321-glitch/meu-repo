'use client'

import type { HTMLAttributes } from 'react'
import Codicon from '@/components/ide/Codicon'

/* ── Empty State ── */
interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
}

export function EmptyState({ icon = 'inbox', title, description, action, secondaryAction, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`} role="status">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-500">
        <Codicon name={icon} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                action.variant === 'secondary'
                  ? 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="text-sm text-zinc-500 transition-colors hover:text-white"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Skeleton Loader ── */
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800/60 ${className}`}
      aria-hidden="true"
      {...props}
    />
  )
}

/* ── Card Skeleton ── */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <Skeleton className="mb-4 h-4 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" style={{ width: `${85 - i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}

/* ── List Skeleton ── */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2" aria-label="Carregando..." role="status">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3">
          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Dashboard Stats Skeleton ── */
export function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Carregando estatisticas..." role="status">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-7 w-2/3 mb-2" />
          <Skeleton className="h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  )
}

/* ── Progress Stepper ── */
interface ProgressStep {
  label: string
  completed: boolean
  active?: boolean
}

export function ProgressStepper({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex items-center gap-1" role="progressbar" aria-valuenow={steps.filter(s => s.completed).length} aria-valuemax={steps.length}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          <div
            className={`flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
              step.completed
                ? 'bg-emerald-500/15 text-emerald-400'
                : step.active
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-zinc-800/60 text-zinc-600'
            }`}
          >
            {step.completed ? <Codicon name="check" /> : null}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-4 ${step.completed ? 'bg-emerald-500/30' : 'bg-zinc-800'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Toast Notification ── */
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
}

export function Toast({ message, type = 'info', onDismiss, action }: ToastProps) {
  const styles = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  }

  const icons = {
    success: 'check-all',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${styles[type]}`} role="alert">
      <Codicon name={icons[type]} />
      <span className="flex-1 text-sm">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-sm font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 flex h-5 w-5 items-center justify-center rounded text-current opacity-60 transition-opacity hover:opacity-100"
          aria-label="Fechar notificacao"
        >
          <Codicon name="close" />
        </button>
      )}
    </div>
  )
}

/* ── Badge / Status indicator ── */
interface BadgeProps {
  label: string
  variant?: 'active' | 'partial' | 'blocked' | 'absent' | 'frozen'
}

export function StatusBadge({ label, variant = 'active' }: BadgeProps) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blocked: 'bg-red-500/10 text-red-400 border-red-500/20',
    absent: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    frozen: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[variant]}`}>
      {label}
    </span>
  )
}

/* ── Keyboard shortcut display ── */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-1.5 text-[10px] font-medium text-zinc-400">
      {children}
    </kbd>
  )
}
