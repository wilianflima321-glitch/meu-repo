'use client'

import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

export type DashboardMissionSignalTone = 'positive' | 'warning' | 'danger' | 'neutral'

export type DashboardMissionSignal = {
  label: string
  value: string
  tone: DashboardMissionSignalTone
}

type DashboardMissionHeroProps = {
  title: string
  projectTypeLabel?: string | null
  primaryObjective: string
  aiActivity: string
  missionSignals: DashboardMissionSignal[]
  pendingApprovals: number
  aiProviderConfigured: boolean
  backendOnline: boolean
  onOpenIde: () => void
  onOpenAiChat: () => void
  onOpenProjects: () => void
}

const toneClasses: Record<DashboardMissionSignalTone, string> = {
  positive:
    'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  warning:
    'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  danger:
    'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
  neutral:
    'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] text-[var(--aethel-text-secondary)]',
}

const ghostButtonClass = `inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-1 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

export function DashboardMissionHero({
  title,
  projectTypeLabel,
  primaryObjective,
  aiActivity,
  missionSignals,
  pendingApprovals,
  aiProviderConfigured,
  backendOnline,
  onOpenIde,
  onOpenAiChat,
  onOpenProjects,
}: DashboardMissionHeroProps) {
  const visibleSignals = missionSignals.slice(0, 3)
  const runState = !backendOnline ? 'Blocked' : pendingApprovals > 0 ? 'Review ready' : 'Ready'
  const runTone: DashboardMissionSignalTone = !backendOnline ? 'danger' : pendingApprovals > 0 ? 'warning' : 'positive'

  return (
    <div
      className="overflow-hidden rounded-[32px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] shadow-[0_28px_90px_rgba(2,6,23,0.34)]"
      data-dashboard-command-card="one-glance"
    >
      <div className="grid gap-5 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.18fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
              Studio Home
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses[runTone]}`}>
              {runState}
            </span>
            {projectTypeLabel ? (
              <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
                {projectTypeLabel}
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-[2.45rem] sm:leading-[1.06]">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)]">{primaryObjective}</p>
          <p className="mt-2 hidden max-w-2xl text-sm leading-7 text-[var(--aethel-text-tertiary)] sm:block">{aiActivity}</p>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Mission state">
            {visibleSignals.map((signal) => (
              <span key={signal.label} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses[signal.tone]}`}>
                {signal.label}: {signal.value}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenIde}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--aethel-text-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:bg-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
            >
              Continue workspace
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onOpenAiChat} className={ghostButtonClass}>
              Open AI Console
            </button>
            <button type="button" onClick={onOpenProjects} className={ghostButtonClass}>
              New project
            </button>
          </div>
        </div>

        <div className="hidden rounded-[26px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_44%,transparent)] p-4 xl:block" data-dashboard-run-state-panel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Now</p>
              <p className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">One action is enough.</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-[var(--aethel-success-light)]" />
          </div>

          <div className="mt-4 divide-y divide-[var(--aethel-border-subtle)]">
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--aethel-text-secondary)]">Approvals</span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[pendingApprovals > 0 ? 'warning' : 'positive']}`}>
                {pendingApprovals > 0 ? `${pendingApprovals} waiting` : 'clear'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--aethel-text-secondary)]">Agents</span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[aiProviderConfigured ? 'positive' : 'warning']}`}>
                {aiProviderConfigured ? 'ready' : 'setup'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[var(--aethel-text-secondary)]">Backend</span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[backendOnline ? 'positive' : 'danger']}`}>
                {backendOnline ? 'live' : 'blocked'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardMissionHero
