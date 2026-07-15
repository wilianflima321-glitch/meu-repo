import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'

import {
  INCIDENT_GRAMMAR,
  STATUS_LIMITS,
  STATUS_REFRESH_INTERVAL_MS,
  STATUS_TRUTHS,
  SURFACE_CHECKS,
  TRUST_EXPLAINERS,
} from '../status.content'
import { stateLabel, stateStyles } from '../status.logic'
import type {
  SurfaceResult,
  SurfaceState,
  StatusCoverageCard,
  StatusTimelineEntry,
} from '../status.types'

type StateCounts = {
  healthy: number
  partial: number
  unhealthy: number
}

type CoverageSummary = {
  customerImpact: string
  cards: StatusCoverageCard[]
}

export function StatusHero() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-success-light)]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Public status
      </div>
      <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-[var(--aethel-text-primary)] sm:text-5xl">
        Operational truth.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)]">
        Public checks are translated into customer impact, cadence, and the next
        operational action.
      </p>
      <details className="mt-6 max-w-2xl rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
          Trust grammar
        </summary>
        <div className="mt-4 flex flex-wrap gap-3">
          {TRUST_EXPLAINERS.slice(0, 2).map((explainer) => (
            <div
              key={explainer.title}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/30 px-3.5 py-2 text-xs font-medium text-[var(--aethel-text-secondary)]"
            >
              <span className="text-[var(--aethel-text-primary)]">
                {explainer.title}
              </span>
              <span className="opacity-45">/</span>
              <span>{explainer.detail}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

export function StatusOverviewCard({
  overall,
  overallTitle,
  overallDescription,
  coverageSummary,
  isLoading,
  lastUpdated,
}: {
  overall: SurfaceState
  overallTitle: string
  overallDescription: string
  coverageSummary: CoverageSummary
  isLoading: boolean
  lastUpdated: string | null
}) {
  return (
    <div className={`rounded-[30px] border p-6 ${stateStyles(overall)}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
            Overview
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{overallTitle}</h2>
        </div>
        {overall === 'healthy' ? (
          <CheckCircle2 className="h-6 w-6" />
        ) : (
          <AlertTriangle className="h-6 w-6" />
        )}
      </div>
      <p className="mt-3 text-sm leading-6 opacity-85">{overallDescription}</p>
      <dl className="mt-5 grid gap-4 border-t border-current/15 pt-4 text-sm leading-6 opacity-90 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
            Customer reading
          </dt>
          <dd className="mt-1">{coverageSummary.customerImpact}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
            Cadence
          </dt>
          <dd className="mt-1">
            {isLoading
              ? 'Updating initial checks...'
              : `Checks refresh every ${STATUS_REFRESH_INTERVAL_MS / 1000}s. Last update: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-US') : 'now'}.`}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function StatusCountsStrip({ counts }: { counts: StateCounts }) {
  const metrics: Array<[string, number, string]> = [
    ['Total checks', SURFACE_CHECKS.length, 'text-[var(--aethel-text-primary)]'],
    ['Operational', counts.healthy, 'text-[var(--aethel-success-light)]'],
    ['Partial', counts.partial, 'text-[var(--aethel-warning-light)]'],
    ['Blocked', counts.unhealthy, 'text-[var(--aethel-error-light)]'],
  ]

  return (
    <section className="rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] p-5">
      <div className="grid gap-5 text-sm sm:grid-cols-4">
        {metrics.map(([label, value, tone]) => (
          <div key={label} className={tone}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
              {label}
            </p>
            <p className="mt-1 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function StatusPostureDetails({
  statusTimeline,
  coverageSummary,
}: {
  statusTimeline: StatusTimelineEntry[]
  coverageSummary: CoverageSummary
}) {
  return (
    <details className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
        Current posture
      </summary>
      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.75fr)]">
        <div className="space-y-3">
          {statusTimeline.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-[24px] border p-4 ${stateStyles(entry.tone)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-base font-semibold">{entry.title}</p>
                </div>
                <span className="rounded-full border border-current/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]">
                  {entry.timestampLabel}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 opacity-90">{entry.detail}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
            Coverage on this page
          </p>
          {coverageSummary.cards.map((card) => (
            <div
              key={card.title}
              className="border-b border-[var(--aethel-border-subtle)] py-3 last:border-b-0"
            >
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                {card.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

export function StatusPublicChecks({ surfaces }: { surfaces: SurfaceResult[] }) {
  return (
    <details className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
        Public checks
      </summary>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)]">
        {SURFACE_CHECKS.map((check) => {
          const result = surfaces.find((surface) => surface.id === check.id)
          const state = result?.state ?? 'unknown'
          return (
            <div
              key={check.id}
              className="grid gap-2 border-b border-[var(--aethel-border-subtle)] px-4 py-3 last:border-b-0 lg:grid-cols-[minmax(0,0.75fr)_auto_minmax(0,1.2fr)_auto] lg:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                  {check.name}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                  {check.required ? 'Mandatory' : 'Optional'}
                </p>
              </div>
              <span
                className={`w-fit rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${stateStyles(state)}`}
              >
                {stateLabel(state)}
              </span>
              <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">
                {result?.detail ?? 'Waiting for endpoint response.'}
              </p>
              <p className="inline-flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
                {typeof result?.latency === 'number' ? (
                  <>
                    <Clock3 className="h-3.5 w-3.5" />
                    {result.latency}ms
                  </>
                ) : (
                  'pending'
                )}
              </p>
            </div>
          )
        })}
      </div>
    </details>
  )
}

export function StatusNotesDetails({
  nextActions,
  blockingSurfaces,
  partialSurfaces,
}: {
  nextActions: string[]
  blockingSurfaces: SurfaceResult[]
  partialSurfaces: SurfaceResult[]
}) {
  return (
    <details className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-6">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
        Notes and next actions
      </summary>
      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
            Next best action
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {nextActions.map((action) => (
              <li key={action}>- {action}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--aethel-error-light)]" />
            Public blockers
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {blockingSurfaces.length > 0 ? (
              blockingSurfaces.map((surface) => (
                <li key={surface.id}>
                  {surface.name}: {surface.detail}
                </li>
              ))
            ) : (
              <li>No active blocker in mandatory checks.</li>
            )}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
            <Clock3 className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />
            Still partial
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {partialSurfaces.length > 0 ? (
              partialSurfaces.map((surface) => (
                <li key={surface.id}>
                  {surface.name}: {surface.detail}
                </li>
              ))
            ) : (
              <li>No optional check is marked partial right now.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-6 grid gap-5 border-t border-[var(--aethel-border-subtle)] pt-5 lg:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            How to read it
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {STATUS_TRUTHS.map((truth) => (
              <li key={truth}>- {truth}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-warning-light)]">
            Limits
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {STATUS_LIMITS.map((limit) => (
              <li key={limit}>- {limit}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Incident grammar
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {INCIDENT_GRAMMAR.map((item) => (
              <li key={item.title}>
                <span className="font-semibold text-[var(--aethel-text-primary)]">
                  {item.eyebrow}
                </span>{' '}
                - {item.title}: {item.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  )
}
