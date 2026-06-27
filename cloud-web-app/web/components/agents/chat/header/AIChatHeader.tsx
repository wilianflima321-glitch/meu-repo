'use client'

import { History, Minimize2 } from 'lucide-react'
import { AIChatAgentLane } from './AIChatAgentLane'
import { AIChatHeaderActions } from './AIChatHeaderActions'
import { AIChatModeMenu } from './AIChatModeMenu'
import { AIChatModelPicker } from './AIChatModelPicker'
import { ActiveContextBadge } from '@/components/ide/ActiveContextBadge'
import type { AIChatHeaderProps } from './AIChatHeader.types'

export function AIChatHeader({
  consoleMode,
  onConsoleModeChange,
  hasHistory,
  showHistorySidebar,
  onToggleHistorySidebar,
  selectedModel,
  currentModel,
  models,
  showModelSelector,
  onToggleModelSelector,
  onCloseModelSelector,
  onModelChange,
  showAdvancedControls,
  modelTierLabel,
  agentCount,
  onAgentCountChange,
  isLiveMode,
  onToggleLiveMode,
  isSpeaking,
  onToggleSpeaking,
  onClearChat,
  onToggleAdvancedControls,
  activeContextItems = [],
  calmMode,
  onToggleCalmMode,
}: AIChatHeaderProps) {
  return (
    <div
      data-ai-copilot-header="calm"
      className="flex flex-col border-b border-[rgba(148,163,184,.14)]"
      style={{
        background: 'rgba(10,14,24,0.82)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        boxShadow: 'inset 0 -1px 0 rgba(148,163,184,.10)',
      }}
    >
      {/* Neon top accent line */}
      <div
        className="pointer-events-none h-px w-full shrink-0"
        style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--aethel-primary) 35%, transparent), transparent)' }}
        aria-hidden
      />

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <AIChatModeMenu
            consoleMode={consoleMode}
            onConsoleModeChange={onConsoleModeChange}
          />
          <AIChatModelPicker
            selectedModel={selectedModel}
            currentModel={currentModel}
            models={models}
            showModelSelector={showModelSelector}
            onToggleModelSelector={onToggleModelSelector}
            onCloseModelSelector={onCloseModelSelector}
            onModelChange={onModelChange}
            showAdvancedControls={showAdvancedControls}
            modelTierLabel={modelTierLabel}
            agentCount={agentCount}
          />
        </div>

        <div className="flex items-center gap-1">
          {/* Calm mode toggle — hide/show telemetry panels */}
          {onToggleCalmMode && (
            <button
              type="button"
              aria-label={calmMode ? 'Show Ops panels' : 'Enable Calm mode'}
              aria-pressed={calmMode}
              onClick={onToggleCalmMode}
              title={calmMode ? 'Calm — click to show Ops panels (telemetry, ledger)' : 'Ops — click to enable Calm mode'}
              className={[
                'min-h-[32px] min-w-[32px] rounded p-1.5 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]',
                calmMode
                  ? 'bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] text-[var(--aethel-success)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]',
              ].join(' ')}
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          )}

          {hasHistory && (
            <button
              type="button"
              aria-label="Toggle chat history"
              onClick={onToggleHistorySidebar}
              className={[
                'min-h-[32px] min-w-[32px] rounded p-1.5 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]',
                showHistorySidebar
                  ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)] text-[var(--aethel-info)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]',
              ].join(' ')}
              title="Chat history"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <AIChatHeaderActions
            selectedModel={selectedModel}
            showAdvancedControls={showAdvancedControls}
            agentCount={agentCount}
            onAgentCountChange={onAgentCountChange}
            isLiveMode={isLiveMode}
            onToggleLiveMode={onToggleLiveMode}
            isSpeaking={isSpeaking}
            onToggleSpeaking={onToggleSpeaking}
            onClearChat={onClearChat}
            onToggleAdvancedControls={onToggleAdvancedControls}
          />
        </div>
      </div>

      {/* ActiveContextBadge — always visible in header so context is shown even when panel is small */}
      {activeContextItems.length > 0 && (
        <ActiveContextBadge
          items={activeContextItems}
          compact
          className="border-t border-[rgba(148,163,184,.08)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]"
        />
      )}

      <AIChatAgentLane
        showAdvancedControls={showAdvancedControls}
        selectedModel={selectedModel}
      />
    </div>
  )
}
