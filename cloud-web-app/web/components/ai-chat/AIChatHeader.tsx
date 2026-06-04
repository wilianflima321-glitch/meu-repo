'use client'

import { History } from 'lucide-react'
import { AIChatAgentLane } from './AIChatAgentLane'
import { AIChatHeaderActions } from './AIChatHeaderActions'
import { AIChatModeMenu } from './AIChatModeMenu'
import { AIChatModelPicker } from './AIChatModelPicker'
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
}: AIChatHeaderProps) {
  return (
    <div
      data-ai-copilot-header="calm"
      className="flex flex-col border-b border-[var(--aethel-border-secondary)]"
    >
      <div className="flex items-center justify-between gap-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-3 py-2">
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
          {hasHistory && (
            <button
              type="button"
              aria-label="Toggle chat history"
              onClick={onToggleHistorySidebar}
              className={`rounded p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
                showHistorySidebar
                  ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)] text-[var(--aethel-info)]'
                  : 'text-[var(--aethel-text-tertiary)]'
              }`}
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

      <AIChatAgentLane
        showAdvancedControls={showAdvancedControls}
        selectedModel={selectedModel}
      />
    </div>
  )
}
