'use client'

import { Compass } from 'lucide-react'
import type { ResearchNavigationMeshSnapshot } from './EvidenceCenter.types'

export function EvidenceResearchMeshPanel({
  navigationMesh,
}: {
  navigationMesh: ResearchNavigationMeshSnapshot
}) {
  const statusLabel = navigationMesh.capabilityStatus
    .replace(/_/g, ' ')
    .toLowerCase()

  return (
    <section
      className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-5"
      data-evidence-source="research-navigation-mesh"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
            <Compass className="h-3.5 w-3.5" />
            Research trail
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {navigationMesh.recommendedLane
              ? (navigationMesh.lanes.find(
                  (lane) => lane.laneId === navigationMesh.recommendedLane,
                )?.label ?? navigationMesh.recommendedLane)
              : 'No browser route ready yet'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {navigationMesh.nextAction}
          </p>
        </div>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)]">
        {navigationMesh.lanes.slice(0, 6).map((lane) => (
          <div
            key={lane.laneId}
            className="grid gap-2 border-b border-[var(--aethel-border-subtle)] px-3 py-3 last:border-b-0 lg:grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1fr)] lg:items-center"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                {lane.label}
              </p>
              {lane.missingCapabilities.length > 0 ? (
                <p className="mt-1 text-[11px] text-[var(--aethel-warning-light)]">
                  Needs: {lane.missingCapabilities.slice(0, 2).join(', ')}
                </p>
              ) : null}
            </div>
            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
              {lane.status}
            </span>
            <p className="text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {lane.nextAction}
            </p>
          </div>
        ))}
      </div>
      <details className="mt-4 rounded-lg border border-[var(--aethel-border-subtle)] bg-[rgba(var(--aethel-overlay-ink-rgb),0.16)] p-3">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--aethel-text-secondary)]">
          Show sources and limits
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
              Market coverage
            </p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--aethel-text-secondary)]">
              {navigationMesh.marketParityCoverage.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
              Limits
            </p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--aethel-text-secondary)]">
              {navigationMesh.limitations.slice(0, 4).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </section>
  )
}
