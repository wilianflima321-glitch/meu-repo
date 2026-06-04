'use client'

import { ChevronDown } from 'lucide-react'
import { CONSOLE_MODES } from './presets'
import type { AIChatModeMenuProps } from './AIChatHeader.types'

export function AIChatModeMenu({
  consoleMode,
  onConsoleModeChange,
}: AIChatModeMenuProps) {
  const activeConsoleMode =
    CONSOLE_MODES.find((mode) => mode.id === consoleMode) ?? CONSOLE_MODES[0]
  const ActiveConsoleIcon = activeConsoleMode.icon

  return (
    <details className="relative" data-ai-copilot-mode-menu="progressive">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition-colors hover:border-[var(--aethel-border-secondary)] [&::-webkit-details-marker]:hidden">
        <ActiveConsoleIcon className="h-3.5 w-3.5" />
        <span>{activeConsoleMode.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
      </summary>
      <div className="absolute left-0 top-9 z-50 grid min-w-40 gap-1 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-1 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
        {CONSOLE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onConsoleModeChange(mode.id)}
            className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
              consoleMode === mode.id
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]'
            }`}
            title={mode.description}
            aria-label={`Mode ${mode.label}: ${mode.description}`}
            aria-pressed={consoleMode === mode.id}
          >
            <mode.icon className="h-3.5 w-3.5" />
            <span>{mode.label}</span>
          </button>
        ))}
      </div>
    </details>
  )
}
