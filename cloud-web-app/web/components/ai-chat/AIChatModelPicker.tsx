'use client'

import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { formatCost } from './chat-utils'
import type { AIChatModelPickerProps } from './AIChatHeader.types'

export function AIChatModelPicker({
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
}: AIChatModelPickerProps) {
  const inputCostLabel =
    selectedModel.inputCost !== undefined
      ? formatCost(selectedModel.inputCost)
      : null
  const outputCostLabel =
    selectedModel.outputCost !== undefined
      ? formatCost(selectedModel.outputCost)
      : null

  return (
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
            <div
              className="fixed inset-0 z-40"
              onClick={onCloseModelSelector}
            />
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
                    {model.inputCost !== undefined &&
                      model.outputCost !== undefined && (
                        <span className="text-[11px] text-[var(--aethel-text-quaternary)]">
                          {formatCost(model.inputCost)}/
                          {formatCost(model.outputCost)} per 1M
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
            <span>
              {inputCostLabel}/{outputCostLabel} per 1M
            </span>
          )}
          {agentCount > 1 && (
            <span className="text-[var(--aethel-text-quaternary)]">
              x{agentCount} agents
            </span>
          )}
        </div>
      ) : (
        <div className="mt-0.5 text-[11px] text-[var(--aethel-text-quaternary)]">
          Essentials
        </div>
      )}
    </div>
  )
}
