'use client'

/**
 * ProjectModelSettings — per-project AI model selector.
 *
 * Fetches the live model catalogue (with pricing) from /api/ai/models/registry
 * and lets the user pick a primary + fallback model for the project.
 * Saves to Project.settings.aiModel / aiModelFallback via PATCH /api/projects/:id/settings.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, ChevronDown, Cpu, Loader2, Save, Zap } from 'lucide-react'
import { authHeaders } from '@/lib/auth'
import type { ModelRegistryEntry } from '@/app/api/ai/models/registry/route'

interface ProjectModelSettingsProps {
  projectId: string
  initialPrimaryModel?: string
  initialFallbackModel?: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const PROVIDER_GROUPS: Record<string, string> = {
  'gpt-': 'OpenAI',
  'o1': 'OpenAI',
  'o3': 'OpenAI',
  'claude-': 'Anthropic',
  'gemini-': 'Google',
  'llama-': 'Meta / Groq',
  'mixtral-': 'Mistral / Groq',
  'anthropic/': 'Anthropic',
  'openai/': 'OpenAI',
  'google/': 'Google',
}

function inferProvider(modelId: string): string {
  const lower = modelId.toLowerCase()
  for (const [prefix, label] of Object.entries(PROVIDER_GROUPS)) {
    if (lower.startsWith(prefix)) return label
  }
  const slash = modelId.indexOf('/')
  if (slash > 0) return modelId.slice(0, slash)
  return 'Other'
}

function formatCost(per1m: number): string {
  if (per1m === 0) return 'free'
  if (per1m < 1) return `$${per1m.toFixed(3)}/M`
  return `$${per1m.toFixed(2)}/M`
}

function CostBadge({ inputCost, outputCost }: { inputCost: number; outputCost: number }) {
  const tier =
    outputCost >= 15 ? 'premium'
      : outputCost >= 3 ? 'standard'
      : 'budget'
  const colors = {
    premium: 'bg-[color-mix(in_srgb,var(--aethel-neon-amber)_12%,transparent)] text-[var(--aethel-neon-amber)]',
    standard: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
    budget: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]',
  }
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${colors[tier]}`}>
      {formatCost(inputCost)} in · {formatCost(outputCost)} out
    </span>
  )
}

function ModelSelect({
  label,
  value,
  onChange,
  models,
  placeholder,
  excludeId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  models: ModelRegistryEntry[]
  placeholder: string
  excludeId?: string
}) {
  const grouped = useMemo(() => {
    const groups: Record<string, ModelRegistryEntry[]> = {}
    for (const m of models) {
      if (m.id === excludeId) continue
      const g = inferProvider(m.id)
      if (!groups[g]) groups[g] = []
      groups[g].push(m)
    }
    return groups
  }, [models, excludeId])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--aethel-text-secondary)]">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 pr-8 text-xs text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)] focus:ring-1 focus:ring-[var(--aethel-primary)]"
          aria-label={label}
        >
          <option value="">{placeholder}</option>
          {Object.entries(grouped).map(([group, groupModels]) => (
            <optgroup key={group} label={group}>
              {groupModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {formatCost(m.outputCostPer1M)} out
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
      </div>

      {/* Show pricing detail for selected model */}
      {value && (() => {
        const m = models.find((x) => x.id === value)
        if (!m) return null
        return (
          <div className="flex items-center gap-2 pt-0.5">
            <CostBadge inputCost={m.inputCostPer1M} outputCost={m.outputCostPer1M} />
            <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{(m.contextWindow / 1000).toFixed(0)}K ctx</span>
          </div>
        )
      })()}
    </div>
  )
}

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<{ models: ModelRegistryEntry[] }>

export function ProjectModelSettings({
  projectId,
  initialPrimaryModel = '',
  initialFallbackModel = '',
}: ProjectModelSettingsProps) {
  const { data, isLoading: registryLoading } = useSWR('/api/ai/models/registry', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const [primary, setPrimary] = useState(initialPrimaryModel)
  const [fallback, setFallback] = useState(initialFallbackModel)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setPrimary(initialPrimaryModel)
    setFallback(initialFallbackModel)
  }, [initialPrimaryModel, initialFallbackModel])

  const isDirty = primary !== initialPrimaryModel || fallback !== initialFallbackModel

  const handleSave = useCallback(async () => {
    setSaveState('saving')
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ aiModel: primary || null, aiModelFallback: fallback || null }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (err) {
      setSaveState('error')
      setErrorMsg(`Failed to save: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [projectId, primary, fallback])

  const models = data?.models ?? []

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)]">
          <Cpu className="h-4.5 w-4.5 text-[var(--aethel-primary)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">AI Model Preferences</h3>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Choose which models power this project</p>
        </div>
      </div>

      {registryLoading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading model catalogue…
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ModelSelect
            label="Primary model"
            value={primary}
            onChange={setPrimary}
            models={models}
            placeholder="Use Aethel Fusion (auto-select)"
          />
          <ModelSelect
            label="Fallback model (when primary is unavailable)"
            value={fallback}
            onChange={setFallback}
            models={models}
            placeholder="Same-family auto-fallback"
            excludeId={primary}
          />

          {/* BYOK warning when a model is from a provider the user may not have a key for */}
          {primary && (
            <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_srgb,var(--aethel-neon-amber)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-amber)_6%,transparent)] px-3 py-2">
              <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--aethel-neon-amber)]" />
              <p className="text-[11px] text-[var(--aethel-text-secondary)] leading-relaxed">
                Make sure your BYOK key for <strong className="text-[var(--aethel-text-primary)]">{inferProvider(primary)}</strong> is configured in Settings → BYOK Vault, or the request will fall back to your first available provider.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-[var(--aethel-error)]">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {saveState === 'saved' && (
              <span className="text-xs text-[var(--aethel-success)]">Saved successfully</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saveState === 'saving'}
              className={[
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]',
                isDirty && saveState !== 'saving'
                  ? 'bg-[var(--aethel-primary)] text-white hover:bg-[color-mix(in_srgb,var(--aethel-primary)_85%,white)]'
                  : 'cursor-not-allowed bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]',
              ].join(' ')}
            >
              {saveState === 'saving' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save preferences
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
