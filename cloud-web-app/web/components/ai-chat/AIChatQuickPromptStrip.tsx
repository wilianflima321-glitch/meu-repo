'use client'

import type { QuickPromptDefinition } from './presets'

interface AIChatQuickPromptStripProps {
  onQuickPrompt: (prompt: string) => void
  prompts: QuickPromptDefinition[]
}

export function AIChatQuickPromptStrip({ onQuickPrompt, prompts }: AIChatQuickPromptStripProps) {
  return (
    <div className="border-t border-[var(--aethel-border-secondary)] px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {prompts.map(({ icon: Icon, label, prompt }) => (
          <button
            type="button"
            aria-label={`Usar prompt rapido ${label}`}
            key={label}
            onClick={() => onQuickPrompt(prompt)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] px-2.5 py-1 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
