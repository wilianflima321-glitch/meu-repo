'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FirstValueSessionSummary } from './useFirstValueTracking'

type FirstValueGuideProps = {
  firstProjectCreated: boolean
  firstAiSuccess: boolean
  firstIdeOpened: boolean
  sessionSummary: FirstValueSessionSummary
  onStartTemplate: (templateId: string) => void
  onCreateProject: () => void
  onConfigureAI: () => void
  onOpenAIChat: () => void
  onOpenIdePreview: () => void
  onDismiss: () => void
}

const STARTER_TEMPLATES = [
  { id: 'saas-starter', label: 'App SaaS', description: 'Auth, billing, dashboard e deploy' },
  { id: 'research-starter', label: 'Research Flow', description: 'Pesquisa, plano e handoff para o IDE' },
  { id: 'game-prototype', label: 'Game Prototype', description: 'Loop inicial com preview e logica basica' },
]

type PreviewRuntimeReadiness = {
  status?: 'ready' | 'partial' | string
  strategy?: 'managed' | 'local' | 'inline' | string
  recommendedAction?: 'provision' | 'discover' | 'inline' | string
  managedProvider?: string | null
  managedProviderLabel?: string | null
  managedProviderMode?: 'route-managed' | 'browser-side' | 'unknown' | string
  managedSetupEnv?: string[]
  blockers?: string[]
  instructions?: string[]
  recommendedCommands?: string[]
}

export function FirstValueGuide({
  firstProjectCreated,
  firstAiSuccess,
  firstIdeOpened,
  sessionSummary,
  onStartTemplate,
  onCreateProject,
  onConfigureAI,
  onOpenAIChat,
  onOpenIdePreview,
  onDismiss,
}: FirstValueGuideProps) {
  const totalSteps = 3
  const completedSteps = Number(firstProjectCreated) + Number(firstAiSuccess) + Number(firstIdeOpened)
  const completionRatio = Math.max(0, Math.min(1, completedSteps / totalSteps))
  const estimatedRemainingMinutes = Math.max(0, (totalSteps - completedSteps) * 1)
  const [previewReadiness, setPreviewReadiness] = useState<PreviewRuntimeReadiness | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadPreviewReadiness = async () => {
      try {
        const response = await fetch('/api/preview/runtime-readiness', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        if (response.ok && payload) {
          setPreviewReadiness(payload)
          return
        }
        setPreviewReadiness(null)
      } catch {
        if (!cancelled) setPreviewReadiness(null)
      }
    }

    void loadPreviewReadiness()
    return () => {
      cancelled = true
    }
  }, [])

  const previewStatusLabel = useMemo(() => {
    if (!previewReadiness?.strategy) return 'Preview path unknown'
    if (previewReadiness.strategy === 'managed') {
      return previewReadiness.status === 'ready' ? 'Managed preview available' : 'Managed preview configured with blockers'
    }
    if (previewReadiness.strategy === 'local') return 'Local dev preview detected'
    return 'Inline preview fallback active'
  }, [previewReadiness])

  const previewActionLabel = useMemo(() => {
    if (previewReadiness?.recommendedAction === 'provision') return 'Abrir IDE + Provisionar Preview'
    if (previewReadiness?.recommendedAction === 'discover') return 'Abrir IDE + Detectar Preview'
    return 'Abrir IDE + Preview'
  }, [previewReadiness])

  const formatDuration = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '--'
    if (value >= 60_000) return `${(value / 60_000).toFixed(1)} min`
    if (value >= 1000) return `${(value / 1000).toFixed(1)} s`
    return `${Math.round(value)} ms`
  }

  const milestoneDurations = useMemo(() => {
    const startedAtMs = sessionSummary.startedAt ? Date.parse(sessionSummary.startedAt) : NaN
    const getDelta = (value: string | null) =>
      Number.isFinite(startedAtMs) && value ? Math.max(0, Date.parse(value) - startedAtMs) : null
    return {
      firstProjectCreatedMs: getDelta(sessionSummary.milestones.firstProjectCreatedAt),
      firstAiSuccessMs: getDelta(sessionSummary.milestones.firstAiSuccessAt),
      firstIdeOpenedMs: getDelta(sessionSummary.milestones.firstIdeOpenedAt),
    }
  }, [sessionSummary])

  const sessionStatusLabel =
    sessionSummary.status === 'completed'
      ? sessionSummary.durationMs !== null && sessionSummary.durationMs <= sessionSummary.targetMs
        ? 'Target met'
        : 'Completed above target'
      : 'Session in progress'

  return (
    <section className="aethel-m-4 aethel-rounded-lg border border-[var(--aethel-primary)]/30 bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] aethel-p-4 md:aethel-m-6">
      <div className="aethel-flex aethel-flex-col aethel-gap-4 md:flex-row md:aethel-items-center md:aethel-justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--aethel-primary-light)]">Primeiro valor em menos de 2 minutos</h3>
          <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
            Crie um projeto, configure o provider de IA e abra o preview da IDE com um starter pronto para iteracao.
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info-light)] transition-all duration-300"
                style={{ width: `${Math.round(completionRatio * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--aethel-text-secondary)]">
              Progresso: {completedSteps}/{totalSteps} ({Math.round(completionRatio * 100)}%)
              {estimatedRemainingMinutes > 0 ? ` - ~${estimatedRemainingMinutes} min restantes` : ' - concluido'}
            </p>
          </div>
          <ul className="mt-2 space-y-1 text-[11px] text-[var(--aethel-text-secondary)]">
            <li>{firstProjectCreated ? '[OK]' : '[ ]'} Primeiro projeto criado ({formatDuration(milestoneDurations.firstProjectCreatedMs)})</li>
            <li>{firstAiSuccess ? '[OK]' : '[ ]'} Primeira resposta de IA recebida ({formatDuration(milestoneDurations.firstAiSuccessMs)})</li>
            <li>{firstIdeOpened ? '[OK]' : '[ ]'} IDE live preview aberta ({formatDuration(milestoneDurations.firstIdeOpenedMs)})</li>
          </ul>

          <div className="mt-4 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium text-[var(--aethel-text-primary)]">First value session</p>
              <span className="rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                {sessionStatusLabel}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Started</p>
                <p className="mt-1 text-[11px] text-[var(--aethel-text-primary)]">
                  {sessionSummary.startedAt ? new Date(sessionSummary.startedAt).toLocaleTimeString() : '--'}
                </p>
              </div>
              <div className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Duration</p>
                <p className="mt-1 text-[11px] text-[var(--aethel-text-primary)]">{formatDuration(sessionSummary.durationMs)}</p>
              </div>
              <div className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
                <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Target</p>
                <p className="mt-1 text-[11px] text-[var(--aethel-text-primary)]">{formatDuration(sessionSummary.targetMs)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium text-[var(--aethel-text-primary)]">Preview readiness</p>
              <span className="rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                {previewReadiness?.strategy || 'unknown'}
              </span>
              {previewReadiness?.managedProvider && (
              <span className="rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                  {previewReadiness.managedProviderLabel || previewReadiness.managedProvider}
                </span>
              )}
              {previewReadiness?.status && (
                <span className="rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                  {previewReadiness.status}
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[var(--aethel-text-secondary)]">{previewStatusLabel}</p>
            {previewReadiness?.instructions && previewReadiness.instructions.length > 0 && (
              <ul className="mt-2 space-y-1 text-[10px] text-[var(--aethel-text-secondary)]">
                {previewReadiness.instructions.slice(0, 2).map((instruction) => (
                  <li key={instruction}>- {instruction}</li>
                ))}
              </ul>
            )}
            {previewReadiness?.blockers && previewReadiness.blockers.length > 0 && (
              <p className="mt-2 text-[10px] text-[var(--aethel-warning)]">
                Blockers: {previewReadiness.blockers.join(', ')}
              </p>
            )}
            {previewReadiness?.managedSetupEnv && previewReadiness.managedSetupEnv.length > 0 && (
              <p className="mt-2 text-[10px] text-[var(--aethel-text-secondary)]">
                Setup env: {previewReadiness.managedSetupEnv.join(', ')}
              </p>
            )}
            {previewReadiness?.recommendedCommands && previewReadiness.recommendedCommands.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {previewReadiness.recommendedCommands.slice(0, 2).map((command) => (
                  <code
                    key={command}
                    className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-1 text-[10px] text-[var(--aethel-info)]"
                  >
                    {command}
                  </code>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium text-[var(--aethel-text-primary)]">Starters recomendados</p>
            <div className="mt-2 grid gap-2 md:[grid-template-columns:repeat(3,minmax(0,1fr))]">
              {STARTER_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onStartTemplate(template.id)}
                  className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] p-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--aethel-primary-light)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
                >
                  <div className="text-xs font-semibold text-[var(--aethel-text-primary)]">{template.label}</div>
                  <div className="mt-1 text-[11px] text-[var(--aethel-text-secondary)]">{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="aethel-flex aethel-flex-col aethel-gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onCreateProject} className="aethel-button aethel-button-primary text-xs">
            Criar projeto
          </button>
          <button type="button" onClick={onConfigureAI} className="aethel-button aethel-button-secondary text-xs">
            Configurar IA
          </button>
          <button type="button" onClick={onOpenAIChat} className="aethel-button aethel-button-secondary text-xs">
            Abrir Chat IA
          </button>
          <button type="button" onClick={onOpenIdePreview} className="aethel-button aethel-button-secondary text-xs">
            {previewActionLabel}
          </button>
          <button type="button" onClick={onDismiss} className="aethel-button aethel-button-ghost text-xs">
            Dispensar
          </button>
        </div>
      </div>
    </section>
  )
}
