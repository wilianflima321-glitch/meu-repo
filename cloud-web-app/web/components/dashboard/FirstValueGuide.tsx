'use client'

import { useEffect, useMemo, useState } from 'react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
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
  { id: 'saas-starter', label: 'SaaS App', description: 'Auth, billing, dashboard, and deploy' },
  { id: 'research-starter', label: 'Research Flow', description: 'Research, plan, and IDE handoff' },
  { id: 'game-prototype', label: 'Game Prototype', description: 'Initial loop with preview and basic logic' },
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
  const primaryButtonClass = `inline-flex min-h-10 items-center justify-center rounded-2xl bg-[var(--aethel-text-primary)] px-4 py-2 text-xs font-semibold text-[var(--aethel-surface-primary)] shadow-[0_14px_32px_rgba(2,6,23,0.16)] hover:bg-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const secondaryButtonClass = `inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-4 py-2 text-xs font-medium text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const ghostButtonClass = `inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

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
    if (!previewReadiness?.strategy) return 'Unknown preview path'
    if (previewReadiness.strategy === 'managed') {
      return previewReadiness.status === 'ready' ? 'Managed preview available' : 'Managed preview has blockers'
    }
    if (previewReadiness.strategy === 'local') return 'Local preview detected'
    return 'Active inline preview fallback'
  }, [previewReadiness])

  const previewActionLabel = useMemo(() => {
    if (previewReadiness?.recommendedAction === 'provision') return 'Open IDE + provision preview'
    if (previewReadiness?.recommendedAction === 'discover') return 'Open IDE + detect preview'
    return 'Open IDE + preview'
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
        ? 'Target reached'
        : 'Completed above target'
      : 'Session in progress'

  return (
    <section className="m-4 rounded-2xl border border-[var(--aethel-primary)]/24 bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] p-3 md:m-6" data-first-value-strip="true">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-primary-light)]">
              First value
            </span>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] text-[var(--aethel-text-secondary)]">
              {completedSteps}/{totalSteps} complete
            </span>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] text-[var(--aethel-text-secondary)]">
              {estimatedRemainingMinutes > 0 ? `~${estimatedRemainingMinutes} min left` : 'Ready'}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]">
            <div
              className="h-1.5 rounded-full bg-[var(--aethel-primary)] transition-all duration-300"
              style={{ width: `${Math.round(completionRatio * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCreateProject} className={primaryButtonClass} aria-label="Create the first project">
            Create project
          </button>
          <button type="button" onClick={onDismiss} className={ghostButtonClass} aria-label="Dismiss first-value guide">
            Dismiss
          </button>
        </div>
      </div>

      <details className="mt-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--aethel-text-secondary)]">
          Setup details
        </summary>
        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium text-[var(--aethel-text-primary)]">Session</p>
              <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                {sessionStatusLabel}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-[var(--aethel-text-secondary)]">
              <li>{firstProjectCreated ? '[OK]' : '[ ]'} Project ({formatDuration(milestoneDurations.firstProjectCreatedMs)})</li>
              <li>{firstAiSuccess ? '[OK]' : '[ ]'} AI response ({formatDuration(milestoneDurations.firstAiSuccessMs)})</li>
              <li>{firstIdeOpened ? '[OK]' : '[ ]'} IDE preview ({formatDuration(milestoneDurations.firstIdeOpenedMs)})</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium text-[var(--aethel-text-primary)]">Preview status</p>
              <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                {previewReadiness?.strategy || 'unknown'}
              </span>
              {previewReadiness?.status && (
                <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                  {previewReadiness.status}
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[var(--aethel-text-secondary)]">{previewStatusLabel}</p>
            <button type="button" onClick={onOpenIdePreview} className={`${secondaryButtonClass} mt-3`} aria-label={previewActionLabel}>
              {previewActionLabel}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onConfigureAI} className={secondaryButtonClass} aria-label="Configure artificial intelligence provider">
            Configure AI
          </button>
          <button type="button" onClick={onOpenAIChat} className={secondaryButtonClass} aria-label="Open the AI chat">
            Open AI chat
          </button>
          {STARTER_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onStartTemplate(template.id)}
              title={template.description}
              className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] hover:border-[color-mix(in_srgb,var(--aethel-primary-light)_40%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              {template.label}
            </button>
          ))}
        </div>
      </details>
    </section>
  )
}
