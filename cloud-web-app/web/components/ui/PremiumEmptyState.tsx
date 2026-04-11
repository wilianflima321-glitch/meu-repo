'use client'

import React from 'react'
import { FolderPlus } from 'lucide-react'
import { CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

/**
 * PremiumEmptyState — Canonical empty state for all surfaces.
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
  className?: string
}

export function PremiumEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: PremiumEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]">
          {icon}
        </div>
      )}
      <h3 className={`${CANONICAL_TYPOGRAPHY.h2} text-[var(--aethel-text-primary)] mb-2`}>
        {title}
      </h3>
      <p className={`${CANONICAL_TYPOGRAPHY.body} text-[var(--aethel-text-tertiary)] max-w-md mb-6`}>
        {description}
      </p>
      <div className="flex items-center gap-3">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
              action.variant === 'secondary'
                ? 'border border-[var(--aethel-border-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
                : 'bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] text-white shadow-lg shadow-[var(--aethel-primary)]/25 hover:shadow-[var(--aethel-primary)]/40 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="rounded-xl border border-[var(--aethel-border-primary)] px-5 py-2.5 text-sm font-medium text-[var(--aethel-text-secondary)] transition-all duration-200 hover:bg-[var(--aethel-surface-tertiary)]"
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
      title="Nenhum projeto criado ainda"
      description="Crie o primeiro workspace para seguir do Studio para a IDE com contexto, preview e execucao no mesmo fluxo."
      action={{
        label: 'Criar primeiro projeto',
        onClick: onCreate,
      }}
    />
  )
}

export default PremiumEmptyState
