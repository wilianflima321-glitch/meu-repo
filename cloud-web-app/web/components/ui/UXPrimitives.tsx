'use client'

import type { HTMLAttributes } from 'react'
import Codicon from '@/components/ide/Codicon'

// --- Empty State ---
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] text-[var(--aethel-text-tertiary)]">
        <Codicon name={icon} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--aethel-text-secondary)]">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              aria-label={action.label}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                action.variant == 'secondary'
                  ? 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'
                  : 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)]'
              }`}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              aria-label={secondaryAction.label}
              className="text-sm text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// --- Skeleton Loader ---
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] ${className}`}
      aria-hidden="true"
      {...props}
    />
  )
}

// --- Card Skeleton ---
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-5">
      <Skeleton className="mb-4 h-4 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" style={{ width: `${85 - i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}

// --- List Skeleton ---
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading..." role="status">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-3">
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

// --- Dashboard Stats Skeleton ---
export function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading stats..." role="status">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] p-4">
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-7 w-2/3 mb-2" />
          <Skeleton className="h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  )
}

// --- Progress Stepper ---
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
                ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]'
                : step.active
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary-light)]'
                : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-tertiary)]'
            }`}
          >
            {step.completed ? <Codicon name="check" /> : null}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-4 ${
                step.completed
                  ? 'bg-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]'
                  : 'bg-[var(--aethel-border-subtle)]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// --- Toast Notification ---
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
}

export function Toast({ message, type = 'info', onDismiss, action }: ToastProps) {
  const styles = {
    success:
      'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
    error:
      'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]',
    warning:
      'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
    info:
      'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
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
          aria-label={action.label}
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
          aria-label="Close notification"
        >
          <Codicon name="close" />
        </button>
      )}
    </div>
  )
}

// --- Badge / Status indicator ---
interface BadgeProps {
  label: string
  variant?: 'active' | 'partial' | 'blocked' | 'absent' | 'frozen'
}

export function StatusBadge({ label, variant = 'active' }: BadgeProps) {
  const styles = {
    active: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_25%,transparent)]',
    partial: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)]',
    blocked: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)] border-[color-mix(in_srgb,var(--aethel-error)_25%,transparent)]',
    absent: 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-tertiary)] border-[var(--aethel-border-subtle)]',
    frozen: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)]',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[variant]}`}>
      {label}
    </span>
  )
}

// --- Keyboard shortcut display ---
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-1.5 text-[10px] font-medium text-[var(--aethel-text-tertiary)]">
      {children}
    </kbd>
  )
}
