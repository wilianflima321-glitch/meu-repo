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
    <section className="aethel-m-4 aethel-rounded-lg border border-blue-500/30 bg-blue-500/10 aethel-p-4 md:aethel-m-6">
      <div className="aethel-flex aethel-flex-col aethel-gap-4 md:aethel-flex-row md:aethel-items-center md:aethel-justify-between">
        <div className="aethel-flex-1">
          <h3 className="aethel-text-sm aethel-font-semibold aethel-text-blue-200">Primeiro valor em menos de 2 minutos</h3>
          <p className="aethel-mt-1 aethel-text-xs aethel-text-slate-300">
            Crie um projeto, configure o provider de IA e abra o preview da IDE com um starter pronto para iteracao.
          </p>
          <div className="aethel-mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-800/70">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round(completionRatio * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-300">
              Progresso: {completedSteps}/{totalSteps} ({Math.round(completionRatio * 100)}%)
              {estimatedRemainingMinutes > 0 ? ` - ~${estimatedRemainingMinutes} min restantes` : ' - concluido'}
            </p>
          </div>
          <ul className="aethel-mt-2 aethel-space-y-1 text-[11px] text-slate-300">
            <li>{firstProjectCreated ? '[OK]' : '[ ]'} Primeiro projeto criado ({formatDuration(milestoneDurations.firstProjectCreatedMs)})</li>
            <li>{firstAiSuccess ? '[OK]' : '[ ]'} Primeira resposta de IA recebida ({formatDuration(milestoneDurations.firstAiSuccessMs)})</li>
            <li>{firstIdeOpened ? '[OK]' : '[ ]'} IDE live preview aberta ({formatDuration(milestoneDurations.firstIdeOpenedMs)})</li>
          </ul>

          <div className="aethel-mt-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium text-slate-200">First value session</p>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
                {sessionStatusLabel}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded border border-white/10 bg-slate-900/50 p-2">
                <p className="text-[10px] text-slate-500">Started</p>
                <p className="mt-1 text-[11px] text-slate-200">
                  {sessionSummary.startedAt ? new Date(sessionSummary.startedAt).toLocaleTimeString() : '--'}
                </p>
              </div>
              <div className="rounded border border-white/10 bg-slate-900/50 p-2">
                <p className="text-[10px] text-slate-500">Duration</p>
                <p className="mt-1 text-[11px] text-slate-200">{formatDuration(sessionSummary.durationMs)}</p>
              </div>
              <div className="rounded border border-white/10 bg-slate-900/50 p-2">
                <p className="text-[10px] text-slate-500">Target</p>
                <p className="mt-1 text-[11px] text-slate-200">{formatDuration(sessionSummary.targetMs)}</p>
              </div>
            </div>
          </div>

          <div className="aethel-mt-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium text-slate-200">Preview readiness</p>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
                {previewReadiness?.strategy || 'unknown'}
              </span>
              {previewReadiness?.managedProvider && (
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
                  {previewReadiness.managedProviderLabel || previewReadiness.managedProvider}
                </span>
              )}
              {previewReadiness?.status && (
                <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
                  {previewReadiness.status}
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-300">{previewStatusLabel}</p>
            {previewReadiness?.instructions && previewReadiness.instructions.length > 0 && (
              <ul className="mt-2 space-y-1 text-[10px] text-slate-400">
                {previewReadiness.instructions.slice(0, 2).map((instruction) => (
                  <li key={instruction}>- {instruction}</li>
                ))}
              </ul>
            )}
            {previewReadiness?.blockers && previewReadiness.blockers.length > 0 && (
              <p className="mt-2 text-[10px] text-amber-300">
                Blockers: {previewReadiness.blockers.join(', ')}
              </p>
            )}
            {previewReadiness?.managedSetupEnv && previewReadiness.managedSetupEnv.length > 0 && (
              <p className="mt-2 text-[10px] text-slate-400">
                Setup env: {previewReadiness.managedSetupEnv.join(', ')}
              </p>
            )}
            {previewReadiness?.recommendedCommands && previewReadiness.recommendedCommands.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {previewReadiness.recommendedCommands.slice(0, 2).map((command) => (
                  <code
                    key={command}
                    className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-cyan-300"
                  >
                    {command}
                  </code>
                ))}
              </div>
            )}
          </div>

          <div className="aethel-mt-4">
            <p className="text-[11px] font-medium text-slate-200">Starters recomendados</p>
            <div className="mt-2 grid gap-2 md:[grid-template-columns:repeat(3,minmax(0,1fr))]">
              {STARTER_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onStartTemplate(template.id)}
                  className="rounded-lg border border-white/10 bg-slate-950/40 p-3 text-left transition-colors hover:border-blue-400/40 hover:bg-slate-900/70"
                >
                  <div className="text-xs font-semibold text-white">{template.label}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="aethel-flex aethel-flex-col aethel-gap-2 sm:aethel-flex-row sm:aethel-flex-wrap">
          <button type="button" onClick={onCreateProject} className="aethel-button aethel-button-primary aethel-text-xs">
            Criar projeto
          </button>
          <button type="button" onClick={onConfigureAI} className="aethel-button aethel-button-secondary aethel-text-xs">
            Configurar IA
          </button>
          <button type="button" onClick={onOpenAIChat} className="aethel-button aethel-button-secondary aethel-text-xs">
            Abrir Chat IA
          </button>
          <button type="button" onClick={onOpenIdePreview} className="aethel-button aethel-button-secondary aethel-text-xs">
            {previewActionLabel}
          </button>
          <button type="button" onClick={onDismiss} className="aethel-button aethel-button-ghost aethel-text-xs">
            Dispensar
          </button>
        </div>
      </div>
    </section>
  )
}
