'use client'

import { ArrowRight, Sparkles } from 'lucide-react'

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
  return (
    <div className="overflow-hidden rounded-[32px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.92)_46%,rgba(14,165,233,0.08)_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
      <div className="grid gap-5 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
              Studio Home
            </span>
            {projectTypeLabel ? (
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
                {projectTypeLabel}
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-[2.55rem] sm:leading-[1.06]">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)]">{primaryObjective}</p>
          <p className="mt-2 hidden max-w-2xl text-sm leading-7 text-[var(--aethel-text-tertiary)] sm:block">{aiActivity}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {missionSignals.map((signal) => (
              <span key={signal.label} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses[signal.tone]}`}>
                {signal.label}: {signal.value}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenIde}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.96),rgba(14,165,233,0.9))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition hover:brightness-110"
            >
              Expand Studio
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

        <div className="hidden rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-4 xl:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Embedded Studio</p>
              <p className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">You are already inside the Studio shell.</p>
            </div>
            <Sparkles className="h-4.5 w-4.5 text-[var(--aethel-info-light)]" />
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--aethel-text-secondary)]">Preview + review</span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[pendingApprovals > 0 ? 'warning' : 'positive']}`}>
                  {pendingApprovals > 0 ? `${pendingApprovals} pending` : 'clear'}
                </span>
              </div>
            </div>
            <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--aethel-text-secondary)]">Operator + evidence</span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[aiProviderConfigured ? 'neutral' : 'warning']}`}>
                  {aiProviderConfigured ? 'ready' : 'setup'}
                </span>
              </div>
            </div>
            <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--aethel-text-secondary)]">Deploy + trust</span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[backendOnline ? 'positive' : 'danger']}`}>
                  {backendOnline ? 'live' : 'blocked'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenIde}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)]"
          >
            Expand Studio
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardMissionHero
