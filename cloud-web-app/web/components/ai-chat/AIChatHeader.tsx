'use client'

import {
  Check,
  ChevronDown,
  History,
  Radio,
  Settings,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { ModelOption } from '@/components/ide/AIChatPanelPro.types'
import { CONSOLE_MODES, type AIChatConsoleMode } from './presets'
import { formatCost } from './chat-utils'

interface AIChatHeaderProps {
  consoleMode: AIChatConsoleMode
  onConsoleModeChange: (mode: AIChatConsoleMode) => void
  hasHistory: boolean
  showHistorySidebar: boolean
  onToggleHistorySidebar: () => void
  selectedModel: ModelOption
  currentModel: string
  models: ModelOption[]
  showModelSelector: boolean
  onToggleModelSelector: () => void
  onCloseModelSelector: () => void
  onModelChange?: (model: string) => void
  showAdvancedControls: boolean
  modelTierLabel: string
  agentCount: number
  onAgentCountChange: (count: number) => void
  isLiveMode: boolean
  onToggleLiveMode?: () => void
  isSpeaking: boolean
  onToggleSpeaking: () => void
  onClearChat?: () => void
  onToggleAdvancedControls: () => void
}

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
  const inputCostLabel =
    selectedModel.inputCost !== undefined ? formatCost(selectedModel.inputCost) : null
  const outputCostLabel =
    selectedModel.outputCost !== undefined ? formatCost(selectedModel.outputCost) : null

  return (
    <div
      data-ai-copilot-header="calm"
      className="flex flex-col border-b border-[var(--aethel-border-secondary)]"
    >
      <div className="flex items-center gap-1 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-3 py-1">
        {CONSOLE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onConsoleModeChange(mode.id)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              consoleMode === mode.id
                ? 'border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]'
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

      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open AI model selector"
                  onClick={onToggleModelSelector}
                  aria-expanded={showModelSelector}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  <Sparkles className="h-4 w-4 text-[var(--aethel-info-light)]" />
                  <span>{selectedModel.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
                </button>

                {showModelSelector && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={onCloseModelSelector} />
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-72 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] py-1 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
                      {models.map((model) => (
                        <button
                          type="button"
                          aria-label={`Select model ${model.name}`}
                          key={model.id}
                          onClick={() => {
                            onModelChange?.(model.id)
                            onCloseModelSelector()
                          }}
                          className={`flex w-full items-start gap-3 px-3 py-2 text-left ${
                            model.id === currentModel
                              ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)]'
                              : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)]'
                          }`}
                        >
                          <Sparkles
                            className={`mt-0.5 h-4 w-4 ${
                              model.id === currentModel
                                ? 'text-[var(--aethel-info)]'
                                : 'text-[var(--aethel-text-quaternary)]'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
                                {model.name}
                              </span>
                              <span className="text-xs text-[var(--aethel-text-quaternary)]">
                                {model.provider}
                              </span>
                              {model.tier && (
                                <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_68%,transparent)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--aethel-text-secondary)]">
                                  {model.tier}
                                </span>
                              )}
                              {model.supportsVision && (
                                <span className="rounded bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-info-light)]">
                                  Vision
                                </span>
                              )}
                              {model.supportsVoice && (
                                <span className="rounded bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success)]">
                                  Voice
                                </span>
                              )}
                            </div>
                            {model.description && (
                              <span className="text-xs text-[var(--aethel-text-tertiary)]">
                                {model.description}
                              </span>
                            )}
                            {model.inputCost !== undefined && model.outputCost !== undefined && (
                              <span className="text-[11px] text-[var(--aethel-text-quaternary)]">
                                {formatCost(model.inputCost)}/{formatCost(model.outputCost)} per 1M
                              </span>
                            )}
                          </div>
                          {model.id === currentModel && (
                            <Check className="h-4 w-4 text-[var(--aethel-info-light)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {showAdvancedControls ? (
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--aethel-text-tertiary)]">
                  <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-1.5 py-0.5 uppercase tracking-wide text-[var(--aethel-text-secondary)]">
                    {modelTierLabel}
                  </span>
                  {inputCostLabel && outputCostLabel && (
                    <span>{inputCostLabel}/{outputCostLabel} per 1M</span>
                  )}
                  {agentCount > 1 && (
                    <span className="text-[var(--aethel-text-quaternary)]">x{agentCount} agents</span>
                  )}
                </div>
              ) : (
                <div className="mt-0.5 text-[11px] text-[var(--aethel-text-quaternary)]">
                  Basic mode
                </div>
              )}
            </div>

            {showAdvancedControls && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[var(--aethel-text-quaternary)]">Agents</span>
                {[1, 2, 3].map((count) => (
                  <button
                    type="button"
                    aria-label={`Set agent count: ${count}`}
                    key={count}
                    onClick={() => onAgentCountChange(count)}
                    className={`rounded border px-2 py-0.5 text-[11px] ${
                      agentCount === count
                        ? 'border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)]'
                        : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)] hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {showAdvancedControls && (
            <>
              {selectedModel.supportsVoice && onToggleLiveMode && (
                <button
                  type="button"
                  aria-label={isLiveMode ? 'Exit live mode' : 'Enter live mode'}
                  onClick={onToggleLiveMode}
                  className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
                    isLiveMode
                      ? 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-info-light)]'
                      : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'
                  }`}
                  title={isLiveMode ? 'Exit live mode' : 'Enter live mode'}
                >
                  <Radio className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                aria-label={isSpeaking ? 'Stop reading' : 'Read latest response'}
                onClick={onToggleSpeaking}
                className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
                  isSpeaking
                    ? 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-success)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'
                }`}
                title={isSpeaking ? 'Stop reading' : 'Read latest response'}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </>
          )}

          <button
            type="button"
            aria-label="Clear chat"
            onClick={onClearChat}
            className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label={showAdvancedControls ? 'Hide advanced controls' : 'Show advanced controls'}
            onClick={onToggleAdvancedControls}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
              showAdvancedControls
                ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'
            }`}
            title={showAdvancedControls ? 'Hide advanced controls' : 'Show advanced controls'}
            aria-pressed={showAdvancedControls}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showAdvancedControls ? (
        <div
          className="flex flex-wrap items-center gap-2 border-t border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_44%,transparent)] px-3 py-1.5 text-[10px] text-[var(--aethel-text-tertiary)]"
          aria-label="Conversation lane readiness"
        >
          <span className="font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">Conversation lane</span>
          <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">Tool use governed</span>
          <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
            {selectedModel.supportsVoice ? 'Native audio ready' : 'Native audio held'}
          </span>
          <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">Barge-in via Stop</span>
          <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
            {selectedModel.supportsVoice ? 'Transcript ready' : 'Transcript via mic fallback'}
          </span>
        </div>
      ) : null}
    </div>
  )
}
