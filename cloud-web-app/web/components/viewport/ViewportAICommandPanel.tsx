'use client'

import { useState } from 'react'
import { ChevronDown, Play, SlidersHorizontal, Wand2 } from 'lucide-react'
import type { ViewportCreativeMode } from '@/components/viewport/AethelViewport3D'

const iconButton =
  'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
const panelButton =
  'inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]'

export function ViewportAICommandPanel({
  creativeMode,
  abilityLabel,
  isPlaying,
  aiCommand,
  assetImportStatus,
  onAiCommandChange,
  onApplyAiCommand,
  onTogglePlayTest,
}: {
  creativeMode: ViewportCreativeMode
  abilityLabel?: string | null
  isPlaying: boolean
  aiCommand: string
  assetImportStatus: string
  onAiCommandChange: (value: string) => void
  onApplyAiCommand: () => void
  onTogglePlayTest: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isExpanded) {
    return (
      <div
        className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2"
        data-viewport-context-menu="collapsed"
      >
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.84)] px-3 py-2 text-xs font-semibold text-[var(--aethel-text-primary)] shadow-[0_18px_54px_rgba(0,0,0,0.36)] backdrop-blur-md transition hover:border-[var(--aethel-border-secondary)]"
          aria-label="Open viewport edit menu"
          aria-expanded={false}
        >
          <SlidersHorizontal className="h-4 w-4 text-[var(--aethel-info-light)]" />
          Edit
          <span className="sr-only">W/E/R tools</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="absolute right-4 top-4 z-20 w-[340px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.86)] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
      data-viewport-context-menu="expanded"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="sr-only">Viewport edit menu</p>
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
            Edit selection
          </p>
          <p className="sr-only">Apply safe edits to the selected object</p>
        </div>
        <button
          type="button"
          aria-label="Collapse viewport edit menu"
          onClick={() => setIsExpanded(false)}
          className={iconButton}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={aiCommand}
          onChange={(event) => onAiCommandChange(event.target.value)}
          aria-label="AI command for the selected object"
          className="flex-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] outline-none"
        />
        <button
          type="button"
          aria-label="Apply AI command to the selected object"
          onClick={onApplyAiCommand}
          className={panelButton}
        >
          <Wand2 className="h-4 w-4" />
          Apply
        </button>
      </div>
      <details className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
        <summary className="cursor-pointer list-none font-medium text-[var(--aethel-text-primary)] [&::-webkit-details-marker]:hidden">
          Context
        </summary>
        <p className="mt-2 text-[var(--aethel-text-tertiary)]">
          {creativeMode === 'film'
            ? 'Film mode: timing, look, and render review.'
            : 'Game mode: playtest, logic, and abilities.'}
          {abilityLabel ? ` Active ability: ${abilityLabel}.` : ''}
        </p>
        <p className="mt-2 text-[var(--aethel-text-quaternary)]">
          Shift+Click multi-selects. W/E/R switch gizmos. X/Y/Z lock axes. G
          toggles pivot. Esc clears selection.
        </p>
        <button
          type="button"
          aria-label={
            isPlaying ? 'Stop viewport play test' : 'Run viewport play test'
          }
          onClick={onTogglePlayTest}
          className={`${panelButton} mt-3`}
        >
          <Play className="h-4 w-4" />
          {isPlaying ? 'Stop playtest' : 'Run playtest'}
        </button>
        <p className="mt-2 text-[var(--aethel-text-tertiary)]">
          <span className="font-medium text-[var(--aethel-text-primary)]">
            Assets:
          </span>{' '}
          {assetImportStatus}
        </p>
      </details>
    </div>
  )
}
