import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react'

import { cn } from '@/lib/utils'

export type CreativeWorkbenchSlotStatus = 'available' | 'held' | 'blocked' | 'needs-review'

export type CreativeWorkbenchEvidence = {
  label: string
  status: CreativeWorkbenchSlotStatus
  detail: string
}

export const STATUS_TONE: Record<CreativeWorkbenchSlotStatus, string> = {
  available:      'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] text-[var(--aethel-success-light)]',
  held:           'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] text-[var(--aethel-warning-light)]',
  blocked:        'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]   bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)]   text-[var(--aethel-error-light)]',
  'needs-review': 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]    bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)]    text-[var(--aethel-info-light)]',
}

export const STATUS_DOT: Record<CreativeWorkbenchSlotStatus, string> = {
  available:      'bg-[var(--aethel-success-light)]',
  held:           'bg-[var(--aethel-warning-light)]',
  blocked:        'bg-[var(--aethel-error-light)]',
  'needs-review': 'bg-[var(--aethel-info-light)]',
}

// --- Sub-components -----------------------------------------------------------

export function ResizeGrip({
  axis,
  onMouseDown,
  label,
  value,
  min,
  max,
  onKeyDelta,
}: {
  axis: 'horizontal' | 'vertical'
  onMouseDown: (e: ReactMouseEvent) => void
  label: string
  value: number
  min: number
  max: number
  onKeyDelta: (delta: number) => void
}) {
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8
    const negative = axis === 'horizontal' ? event.key === 'ArrowLeft' : event.key === 'ArrowUp'
    const positive = axis === 'horizontal' ? event.key === 'ArrowRight' : event.key === 'ArrowDown'
    if (!negative && !positive) return
    event.preventDefault()
    onKeyDelta(positive ? step : -step)
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      className={cn(
        'group z-10 shrink-0 select-none transition-colors',
        'bg-transparent hover:bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] focus-visible:outline-none',
        axis === 'horizontal'
          ? 'w-1 cursor-col-resize'
          : 'h-1 cursor-row-resize',
      )}
    >
      {/* Visual drag indicator */}
      <div className={cn(
        'opacity-0 transition-opacity group-hover:opacity-100',
        axis === 'horizontal'
          ? 'mx-auto h-8 w-px bg-[var(--aethel-primary)]'
          : 'mx-auto h-px w-8 bg-[var(--aethel-primary)]',
      )} />
    </div>
  )
}

export function Panel({
  label,
  children,
  open,
  onToggle,
  className,
}: {
  label: string
  children?: ReactNode
  open: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <section
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-lg', className)}
      style={{
        background: 'rgba(8,12,22,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,.10)',
      }}
      aria-label={label}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left transition-colors hover:bg-[rgba(255,255,255,.03)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-inset"
        style={{ borderBottom: '1px solid rgba(148,163,184,.08)' }}
        aria-expanded={open}
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
          {label}
        </span>
        <svg
          className={cn('h-3 w-3 text-[var(--aethel-text-quaternary)] transition-transform duration-150', open ? 'rotate-0' : '-rotate-90')}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="min-h-0 flex-1 overflow-auto">
          {children ?? (
            <p className="px-2 py-2 text-[11px] leading-relaxed text-[var(--aethel-text-quaternary)]">
              No content for this slot.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export function HeaderAction({
  label,
  onClick,
  title,
}: {
  label: string
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="shrink-0 rounded-md border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
    >
      {label}
    </button>
  )
}

export function ToolbarBtn({
  label, active, onClick, title,
}: {
  label: string; active: boolean; onClick: () => void; title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]',
        active
          ? 'border-[color-mix(in_srgb,var(--aethel-primary)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
          : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]',
      )}
    >
      {label}
    </button>
  )
}

