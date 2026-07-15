'use client'

import { MoreHorizontal, Radio, Settings, Trash2, Volume2, VolumeX } from 'lucide-react'
import type { AIChatHeaderActionsProps } from './AIChatHeader.types'

export function AIChatHeaderActions({
  selectedModel,
  showAdvancedControls,
  agentCount,
  onAgentCountChange,
  isLiveMode,
  onToggleLiveMode,
  isSpeaking,
  onToggleSpeaking,
  onClearChat,
  onToggleAdvancedControls,
}: AIChatHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <details className="relative" data-ai-copilot-actions-menu="progressive">
        <summary
          className="flex cursor-pointer list-none items-center rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] [&::-webkit-details-marker]:hidden"
          aria-label="Open conversation actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 top-8 z-50 grid min-w-44 gap-1 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-1 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
          <button
            type="button"
            aria-label={
              showAdvancedControls
                ? 'Hide advanced controls'
                : 'Show advanced controls'
            }
            aria-pressed={showAdvancedControls}
            onClick={onToggleAdvancedControls}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
          >
            <Settings className="h-4 w-4" />
            {showAdvancedControls ? 'Hide controls' : 'Show controls'}
          </button>
          {showAdvancedControls && (
            <div className="grid gap-1 border-b border-[var(--aethel-border-secondary)] px-2 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Agents
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((count) => (
                  <button
                    type="button"
                    aria-label={`Set agent count: ${count}`}
                    key={count}
                    onClick={() => onAgentCountChange(count)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      agentCount === count
                        ? 'border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)]'
                        : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)] hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showAdvancedControls &&
            selectedModel.supportsVoice &&
            onToggleLiveMode && (
              <button
                type="button"
                aria-label={isLiveMode ? 'Exit live mode' : 'Enter live mode'}
                onClick={onToggleLiveMode}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                <Radio className="h-4 w-4" />
                {isLiveMode ? 'Exit live mode' : 'Enter live mode'}
              </button>
            )}
          {showAdvancedControls && (
            <button
              type="button"
              aria-label={isSpeaking ? 'Stop reading' : 'Read latest response'}
              onClick={onToggleSpeaking}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              {isSpeaking ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {isSpeaking ? 'Stop reading' : 'Read latest response'}
            </button>
          )}
          <button
            type="button"
            aria-label="Clear chat"
            onClick={onClearChat}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
          >
            <Trash2 className="h-4 w-4" />
            Clear chat
          </button>
        </div>
      </details>
    </div>
  )
}
