'use client'

import { AlertTriangle, Compass, RefreshCw, ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { AgentNavigationStatus, ResearchNavigationMeshSnapshot } from './types'

type AgentNavigationPanelProps = {
  mesh?: ResearchNavigationMeshSnapshot
  isLoading: boolean
  error?: unknown
  onRefresh: () => void
  focusClass: string
}

const STATUS_TONE: Record<AgentNavigationStatus, string> = {
  available: 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] text-[var(--aethel-success-light)]',
  held: 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] text-[var(--aethel-warning-light)]',
  blocked: 'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] text-[var(--aethel-error-light)]',
  'needs-review': 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] text-[var(--aethel-info-light)]',
}

function statusLabel(status: AgentNavigationStatus) {
  if (status === 'needs-review') return 'needs review'
  return status
}

export function AgentNavigationPanel({ mesh, isLoading, error, onRefresh, focusClass }: AgentNavigationPanelProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <div className="h-36 animate-pulse rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)]" />
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)]" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !mesh) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--aethel-warning-light)]">
            <AlertTriangle className="h-4 w-4" />
            Navigation mesh unavailable
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
            Agents stay read-only until the research navigation mesh can report browser lane readiness.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className={cn('mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const recommendedLane = mesh.lanes.find((lane) => lane.laneId === mesh.recommendedLane)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4" data-evidence-source="research-navigation-mesh">
      <header className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              <Compass className="h-3.5 w-3.5" />
              Research navigation mesh
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--aethel-text-primary)]">
              {recommendedLane ? recommendedLane.label : 'No browser lane ready yet'}
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--aethel-text-secondary)]">{mesh.nextAction}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]', STATUS_TONE[mesh.capabilityStatus])}>
              {statusLabel(mesh.capabilityStatus)}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              className={cn('inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-2">
        {mesh.lanes.map((lane) => (
          <article
            key={lane.laneId}
            className={cn(
              'rounded-2xl border bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-4',
              lane.laneId === mesh.recommendedLane
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_42%,transparent)]'
                : 'border-[var(--aethel-border-subtle)]',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{lane.label}</p>
                <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">{lane.laneId}</p>
              </div>
              <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', STATUS_TONE[lane.status])}>
                {statusLabel(lane.status)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {lane.bestFor.slice(0, 3).map((item) => (
                <span key={item} className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                  {item}
                </span>
              ))}
            </div>

            {lane.missingCapabilities.length > 0 ? (
              <p className="mt-3 text-xs leading-5 text-[var(--aethel-warning-light)]">
                Missing: {lane.missingCapabilities.slice(0, 3).join(', ')}
              </p>
            ) : (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--aethel-success-light)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Core evidence capture is configured.
              </p>
            )}

            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{lane.nextAction}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--aethel-border-subtle)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Market parity coverage</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
            {mesh.marketParityCoverage.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--aethel-border-subtle)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Hard limits</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
            {mesh.limitations.slice(0, 4).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
