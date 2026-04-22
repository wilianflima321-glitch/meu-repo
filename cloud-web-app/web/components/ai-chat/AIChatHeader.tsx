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
    <div className="flex flex-col border-b border-[var(--aethel-border-secondary)]">
      <div className="flex items-center gap-1 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-1.5">
        {CONSOLE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onConsoleModeChange(mode.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              consoleMode === mode.id
                ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] shadow-sm'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]'
            }`}
            title={mode.description}
            aria-label={`Modo ${mode.label}: ${mode.description}`}
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
              aria-label="Alternar historico do chat"
              onClick={onToggleHistorySidebar}
              className={`rounded p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
                showHistorySidebar
                  ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)] text-[var(--aethel-info)]'
                  : 'text-[var(--aethel-text-tertiary)]'
              }`}
              title="Historico do chat"
            >
              <History className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Abrir seletor de modelo de IA"
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
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-72 rounded-lg border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,22,34,0.98),rgba(10,14,24,0.94))] py-1 shadow-[0_24px_80px_rgba(2,6,23,0.48)]">
                      {models.map((model) => (
                        <button
                          type="button"
                          aria-label={`Selecionar modelo ${model.name}`}
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
                                  Visao
                                </span>
                              )}
                              {model.supportsVoice && (
                                <span className="rounded bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success)]">
                                  Voz
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
                                {formatCost(model.inputCost)}/{formatCost(model.outputCost)} por 1M
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
                    <span>{inputCostLabel}/{outputCostLabel} por 1M</span>
                  )}
                  {agentCount > 1 && (
                    <span className="text-[var(--aethel-text-quaternary)]">x{agentCount} agentes</span>
                  )}
                </div>
              ) : (
                <div className="mt-0.5 text-[11px] text-[var(--aethel-text-quaternary)]">
                  Modo basico
                </div>
              )}
            </div>

            {showAdvancedControls && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[var(--aethel-text-quaternary)]">Agentes</span>
                {[1, 2, 3].map((count) => (
                  <button
                    type="button"
                    aria-label={`Definir quantidade de agentes: ${count}`}
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
                  aria-label={isLiveMode ? 'Sair do modo ao vivo' : 'Entrar no modo ao vivo'}
                  onClick={onToggleLiveMode}
                  className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
                    isLiveMode
                      ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                      : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'
                  }`}
                  title={isLiveMode ? 'Sair do modo ao vivo' : 'Entrar no modo ao vivo'}
                >
                  <Radio className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                aria-label={isSpeaking ? 'Parar leitura' : 'Ler ultima resposta'}
                onClick={onToggleSpeaking}
                className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
                  isSpeaking
                    ? 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'
                }`}
                title={isSpeaking ? 'Parar leitura' : 'Ler ultima resposta'}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </>
          )}

          <button
            type="button"
            aria-label="Limpar chat"
            onClick={onClearChat}
            className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Limpar chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label={showAdvancedControls ? 'Ocultar avancado' : 'Mostrar avancado'}
            onClick={onToggleAdvancedControls}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
              showAdvancedControls
                ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'
            }`}
            title={showAdvancedControls ? 'Ocultar avancado' : 'Mostrar avancado'}
            aria-pressed={showAdvancedControls}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
