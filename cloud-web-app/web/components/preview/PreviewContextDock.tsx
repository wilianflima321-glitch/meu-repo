'use client'

import { useState, type MouseEvent } from 'react'
import { ChevronDown, RefreshCw, Sparkles, Wand2 } from 'lucide-react'

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

type PreviewContextDockProps = {
  isInline: boolean
  isInspecting?: boolean
  isStale?: boolean
  onInspect: (event: MouseEvent<HTMLButtonElement>) => void
  onRefresh?: () => void
}

const dockButtonClass = `inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--aethel-text-primary)] shadow-[var(--aethel-shadow-lg)] transition hover:border-[var(--aethel-border-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

export function PreviewContextDock({ isInline, isInspecting, isStale, onInspect, onRefresh }: PreviewContextDockProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2" data-preview-context-menu="collapsed">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={dockButtonClass}
          aria-label="Open preview edit menu"
          aria-expanded={false}
        >
          <Sparkles className="h-4 w-4 text-[var(--aethel-info-light)]" />
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 right-4 z-30 w-[260px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] p-2 shadow-[var(--aethel-shadow-xl)] backdrop-blur-md" data-preview-context-menu="expanded">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <div>
          <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">Preview edit menu</p>
          <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {isInline ? 'Local preview' : isStale ? 'Review sync before editing' : 'Runtime ready'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg border border-[var(--aethel-border-subtle)] p-1.5 text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          aria-label="Collapse preview edit menu"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1 space-y-1">
        <button
          type="button"
          onClick={(event) => {
            setIsOpen(false)
            onInspect(event)
          }}
          className="flex w-full items-center gap-2 rounded-xl bg-[var(--aethel-surface-elevated)] px-3 py-2 text-left text-xs font-medium text-[var(--aethel-text-primary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
          title="Inspect with AI"
          aria-label="Inspect preview with AI"
        >
          <Wand2 className="h-4 w-4 text-[var(--aethel-info-light)]" />
          {isInspecting ? 'Select an element' : 'Inspect with AI'}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!onRefresh}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] hover:text-[var(--aethel-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh preview
        </button>
      </div>
    </div>
  )
}

export default PreviewContextDock
