'use client'

import { Bot, Brain, Loader2, Radio, Target } from 'lucide-react'
import { CONSOLE_MODES, type AIChatConsoleMode, type AIChatModePreset } from './presets'

interface AIChatContextStripProps {
  agentCount: number
  consoleMode: AIChatConsoleMode
  isAIWorking: boolean
  lastUserGoal?: string
  modePreset: AIChatModePreset
  selectedModelName: string
}

const MODE_TONE_CLASSES: Record<AIChatConsoleMode, string> = {
  ask: 'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
  plan: 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]',
  execute: 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]',
  review: 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)]',
  live: 'border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
}

function summarizeGoal(goal?: string) {
  if (!goal) return ''
  const normalized = goal.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 140) return normalized
  return `${normalized.slice(0, 137)}...`
}

export function AIChatContextStrip({
  agentCount,
  consoleMode,
  isAIWorking,
  lastUserGoal,
  modePreset,
  selectedModelName,
}: AIChatContextStripProps) {
  const modeDefinition = CONSOLE_MODES.find((mode) => mode.id === consoleMode)
  const summarizedGoal = summarizeGoal(lastUserGoal)

  return (
    <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${MODE_TONE_CLASSES[consoleMode]}`}
        >
          {modeDefinition?.icon ? <modeDefinition.icon className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
          Modo {modeDefinition?.label ?? consoleMode}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]">
          <Bot className="h-3.5 w-3.5" />
          {selectedModelName}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]">
          <Brain className="h-3.5 w-3.5" />
          {agentCount} {agentCount === 1 ? 'agente' : 'agentes'}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]">
          {isAIWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
          {isAIWorking ? 'IA trabalhando' : 'Pronto para responder'}
        </span>
      </div>

      <div className="mt-2 flex items-start gap-2 text-xs text-[var(--aethel-text-tertiary)]">
        <Target className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--aethel-text-quaternary)]" />
        <div className="min-w-0">
          <div className="font-medium text-[var(--aethel-text-secondary)]">Contexto atual</div>
          <div className="mt-1 leading-5" title={lastUserGoal || modePreset.helper}>
            {summarizedGoal || modePreset.helper}
          </div>
        </div>
      </div>
    </section>
  )
}
