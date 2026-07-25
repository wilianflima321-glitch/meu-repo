'use client'

/**
 * CW5 — shared loading / error / empty states for critical Studio shells.
 * Uses design-system primitives (EmptyState + Skeleton); tokens only; EN UI.
 */

import { EmptyState, Skeleton } from '@/components/ui/UXPrimitives'

export type WorkbenchSurfaceKind = 'loading' | 'error' | 'empty'

export function WorkbenchLoadingState({
  label = 'Loading workbench…',
  rows = 4,
}: {
  label?: string
  rows?: number
}) {
  return (
    <div
      className="flex h-full min-h-[160px] flex-col justify-center gap-3 p-4"
      role="status"
      aria-label={label}
      data-aethel-cw5="surface-loading"
    >
      <Skeleton className="h-3 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-3 w-full"
            style={{ width: `${92 - index * 10}%` }}
          />
        ))}
      </div>
      <p className="text-[11px] text-[var(--aethel-text-tertiary)]">{label}</p>
    </div>
  )
}

export function WorkbenchErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string
  description: string
  onRetry?: () => void
}) {
  return (
    <div data-aethel-cw5="surface-error" className="h-full min-h-[160px]">
      <EmptyState
        icon="error"
        title={title}
        description={description}
        compact
        action={
          onRetry
            ? { label: 'Retry', onClick: onRetry, variant: 'secondary' }
            : undefined
        }
      />
    </div>
  )
}

export function WorkbenchEmptyState({
  title,
  description,
  icon = 'inbox',
  action,
}: {
  title: string
  description: string
  icon?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div data-aethel-cw5="surface-empty" className="h-full min-h-[160px]">
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        compact
        action={action}
      />
    </div>
  )
}
