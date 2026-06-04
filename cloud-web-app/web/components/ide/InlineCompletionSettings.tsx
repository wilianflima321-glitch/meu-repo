'use client'

import { Sparkles } from 'lucide-react'
import { OPENROUTER_BUDGET_OPTIONS } from '@/lib/ai/openrouter-models'

// ============= Completion Status Bar =============

export interface CompletionStatusProps {
  enabled: boolean
  onToggle: () => void
  currentModel: string
  suggestions: number
  acceptRate: number
}

export function CompletionStatusBar({
  enabled,
  onToggle,
  currentModel,
  suggestions,
  acceptRate,
}: CompletionStatusProps) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <button type="button" aria-label={enabled ? 'Disable inline completion' : 'Enable inline completion'}
        onClick={onToggle}
        className={`flex items-center gap-1 px-2 py-1 rounded ${
          enabled
            ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info)]'
            : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]'
        }`}
      >
        <Sparkles className="w-3 h-3" />
        <span>Copilot {enabled ? 'ON' : 'OFF'}</span>
      </button>

      {enabled && (
        <>
          <span className="text-[var(--aethel-text-tertiary)]">|</span>
          <span className="text-[var(--aethel-text-tertiary)]">{currentModel}</span>
          <span className="text-[var(--aethel-text-tertiary)]">|</span>
          <span className="text-[var(--aethel-text-tertiary)]">{suggestions} suggestions</span>
          <span className="text-[var(--aethel-text-tertiary)]">|</span>
          <span className="text-[var(--aethel-success)]">{(acceptRate * 100).toFixed(0)}% accepted</span>
        </>
      )}
    </div>
  )
}

// ============= Completion Settings Panel =============

export interface CompletionSettingsProps {
  settings: {
    enabled: boolean
    debounceMs: number
    model: string
    maxTokens: number
    temperature: number
  }
  onSettingsChange: (settings: CompletionSettingsProps['settings']) => void
}

export function CompletionSettings({ settings, onSettingsChange }: CompletionSettingsProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">AI completion settings</h3>

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-[var(--aethel-text-tertiary)]">Enable inline completion</label>
        <button type="button" aria-label={settings.enabled ? 'Disable inline completion' : 'Enable inline completion'}
          onClick={() => onSettingsChange({ ...settings, enabled: !settings.enabled })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.enabled ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-surface-quaternary)]'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-[var(--aethel-surface-secondary)] transition-transform ${
            settings.enabled ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Model selector */}
      <div>
        <label className="text-sm text-[var(--aethel-text-tertiary)] block mb-1">Model</label>
        <select
          value={settings.model}
          onChange={(e) => onSettingsChange({ ...settings, model: e.target.value })}
          className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)]"
        >
          {OPENROUTER_BUDGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Debounce */}
      <div>
        <label className="text-sm text-[var(--aethel-text-tertiary)] block mb-1">
          Delay: {settings.debounceMs}ms
        </label>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={settings.debounceMs}
          onChange={(e) => onSettingsChange({ ...settings, debounceMs: parseInt(e.target.value) })}
          className="w-full accent-[var(--aethel-info)]"
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="text-sm text-[var(--aethel-text-tertiary)] block mb-1">
          Creativity: {settings.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={settings.temperature}
          onChange={(e) => onSettingsChange({ ...settings, temperature: parseFloat(e.target.value) })}
          className="w-full accent-[var(--aethel-info)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>
    </div>
  )
}
