'use client'

import { useMemo } from 'react'

const IDE_CHAT_INTENTS = [
  {
    id: 'implement',
    label: 'Implement in editor',
    description: 'Translate the current mission into concrete steps and changes.',
    buildPrompt: (mission?: string | null) =>
      mission
        ? `${mission}\n\nConvert this into an implementation plan in the editor, with files, steps, and the main risk.`
        : 'Convert the current task into an implementation plan in the editor, with files, steps, and the main risk.',
  },
  {
    id: 'review',
    label: 'Critique and review',
    description: 'Review what already exists and identify the next improvement.',
    buildPrompt: (mission?: string | null) =>
      mission
        ? `${mission}\n\nReview the current state, critique the gaps, and propose the highest-impact next improvement.`
        : 'Review the current state, critique the gaps, and propose the highest-impact next improvement.',
  },
  {
    id: 'runtime',
    label: 'Prepare preview/runtime',
    description: 'Leave with a validation checklist for preview, runtime, and handoff.',
    buildPrompt: (mission?: string | null) =>
      mission
        ? `${mission}\n\nPrepare a runtime, preview, and final validation checklist for this mission.`
        : 'Prepare a runtime, preview, and final validation checklist for the current task.',
  },
] as const

type AIChatSessionBannerProps = {
  mission: string | null
  source: string | null
  projectId?: string
  focusClass: string
  onIntent: (prompt: string) => void
}

export default function AIChatSessionBanner({
  mission,
  source,
  projectId,
  focusClass,
  onIntent,
}: AIChatSessionBannerProps) {
  const intents = useMemo(() => IDE_CHAT_INTENTS, [])

  return (
    <div className="mx-3 mt-3 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),color-mix(in_srgb,var(--aethel-info)_10%,transparent),rgba(15,23,42,0.78))] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
          Work session
        </span>
        {source ? (
          <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
            source {source}
          </span>
        ) : null}
        {projectId ? (
          <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
            project {projectId}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-sm font-medium text-[var(--aethel-text-primary)]">
        {mission || 'Continue from the studio context without losing the current handoff.'}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick intents">
        {intents.map((intent) => (
          <button
            key={intent.id}
            type="button"
            onClick={() => onIntent(intent.buildPrompt(mission))}
            title={intent.description}
            className={`rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-3 py-1.5 text-left text-xs font-semibold text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] hover:text-[var(--aethel-text-primary)] ${focusClass}`}
            aria-label={`Run shortcut ${intent.label}`}
          >
            {intent.label}
          </button>
        ))}
      </div>
    </div>
  )
}
