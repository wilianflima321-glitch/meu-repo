'use client'

import React from 'react'
import { FolderPlus } from 'lucide-react'
import { CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

/**
 * PremiumEmptyState - Canonical empty state for all surfaces.
 * Benchmark: Linear uses honest, minimal empty states with clear CTAs.
 * Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 */

interface PremiumEmptyStateProps {
  icon?: React.ReactNode
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
  className?: string
}

export function PremiumEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = '',
}: PremiumEmptyStateProps) {
  const spacingClass = compact ? 'px-5 py-10' : 'px-6 py-16 sm:py-20'

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${spacingClass} ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] shadow-[0_18px_50px_rgba(2,6,23,0.22)] sm:h-16 sm:w-16">
          {icon}
        </div>
      )}
      <h3 className={`${CANONICAL_TYPOGRAPHY.h2} mb-2 max-w-xl text-balance text-[var(--aethel-text-primary)]`}>
        {title}
      </h3>
      <p className={`${CANONICAL_TYPOGRAPHY.body} mb-6 max-w-md text-balance text-[var(--aethel-text-tertiary)]`}>
        {description}
      </p>
      <div className="flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`min-h-11 rounded-xl px-5 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] motion-safe:transition-all motion-safe:duration-200 ${
              action.variant === 'secondary'
                ? 'border border-[var(--aethel-border-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
                : 'bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] text-[var(--aethel-text-inverse)] shadow-lg shadow-[var(--aethel-primary)]/25 hover:shadow-[var(--aethel-primary)]/40 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="min-h-11 rounded-xl border border-[var(--aethel-border-primary)] px-5 py-2.5 text-sm font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] motion-safe:transition-all motion-safe:duration-200"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}

type PremiumEmptyProjectsProps = {
  onCreate: () => void
  className?: string
}

export function PremiumEmptyProjects({ onCreate, className }: PremiumEmptyProjectsProps) {
  return (
    <PremiumEmptyState
      className={className}
      icon={<FolderPlus className="h-7 w-7 text-[var(--aethel-info)]" aria-hidden="true" />}
      title="Start your first project"
      description="Create a workspace that carries mission context, preview evidence, and IDE handoff in one continuous flow."
      action={{
        label: 'Create first project',
        onClick: onCreate,
      }}
    />
  )
}

export default PremiumEmptyState
