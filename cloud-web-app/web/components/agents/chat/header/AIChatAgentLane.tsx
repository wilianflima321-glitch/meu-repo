'use client'

import type { AIChatAgentLaneProps } from './AIChatHeader.types'

export function AIChatAgentLane({
  showAdvancedControls,
  selectedModel,
}: AIChatAgentLaneProps) {
  if (!showAdvancedControls) return null

  return (
    <details
      className="border-t border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_44%,transparent)] text-[10px] text-[var(--aethel-text-tertiary)]"
      aria-label="Agent lane status"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-1.5">
        <span className="font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
          Agent lane
        </span>
        <span className="text-[var(--aethel-text-quaternary)]">
          Tools - {selectedModel.supportsVoice ? 'audio ready' : 'audio held'}
        </span>
      </summary>
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--aethel-border-secondary)] px-3 py-1.5">
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          Tool use
        </span>
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          {selectedModel.supportsVoice ? 'Audio ready' : 'Audio held'}
        </span>
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          Barge-in via Stop
        </span>
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          {selectedModel.supportsVoice ? 'Transcript' : 'Transcript fallback'}
        </span>
      </div>
    </details>
  )
}
