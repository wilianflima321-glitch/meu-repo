'use client'

import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

type AgentWindowStateProps = {
  className?: string
  focusClass?: string
  onRetry?: () => void
}

export function AgentWindowNoProject({ className }: AgentWindowStateProps) {
  return (
    <section className={cn('flex h-full flex-col items-center justify-center gap-3 p-6 text-center', className)}>
      <ShieldCheck className="h-9 w-9 text-[var(--aethel-primary-light)]" />
      <div>
        <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Agent window needs a project</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--aethel-text-tertiary)]">
          Open a workspace to see coordinators, scope locks, read receipts, replay evidence, and budget-aware execution in one place.
        </p>
      </div>
    </section>
  )
}

export function AgentWindowLoading({ className }: AgentWindowStateProps) {
  return (
    <section className={cn('flex h-full items-center justify-center p-6 text-sm text-[var(--aethel-text-secondary)]', className)}>
      <Activity className="mr-2 h-4 w-4 animate-pulse" />
      Syncing agent workforce...
    </section>
  )
}

export function AgentWindowError({ className, focusClass = '', onRetry }: AgentWindowStateProps) {
  return (
    <section className={cn('flex h-full flex-col items-center justify-center gap-3 p-6 text-center', className)}>
      <AlertTriangle className="h-8 w-8 text-[var(--aethel-warning-light)]" />
      <div>
        <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Agent fleet unavailable</h3>
        <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">The server-side scope gates remain active. Refresh when project state is available.</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn('rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
        >
          Retry
        </button>
      ) : null}
    </section>
  )
}