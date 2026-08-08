'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react'
import type {
  EvidenceMetric,
  EvidenceProjectSummary,
} from './EvidenceCenter.types'

type EvidenceCenterHeroProps = {
  projects: EvidenceProjectSummary[]
  selectedProjectId: string
  onSelectedProjectIdChange: (projectId: string) => void
}

const evidenceLoadingCards = [
  [
    'Coverage',
    'Checking',
    'Coverage loads before claims.',
  ],
  [
    'Receipts',
    'Syncing',
    'Receipts stay traceable.',
  ],
  [
    'Review hold',
    'Held',
    'Claims wait for approval.',
  ],
  [
    'Next action',
    'Pending',
    'The safe next step appears here.',
  ],
] as const

export function EvidenceCenterHero({
  projects,
  selectedProjectId,
  onSelectedProjectIdChange,
}: EvidenceCenterHeroProps) {
  return (
    <section className="rounded-[34px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] p-6 shadow-[0_26px_90px_rgba(2,6,23,0.28)] lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Evidence Center
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Receipts before claims.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
            Project evidence, blockers, review status, and next action in one protected view.
          </p>
        </div>
        <div className="min-w-[260px] rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[rgba(var(--aethel-overlay-ink-rgb),0.34)] p-4">
          <label
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]"
            htmlFor="evidence-project"
          >
            Project
          </label>
          <select
            id="evidence-project"
            value={selectedProjectId}
            onChange={(event) =>
              onSelectedProjectIdChange(event.currentTarget.value)
            }
            className="mt-2 h-11 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-3 text-sm text-[var(--aethel-text-primary)] outline-none focus:ring-2 focus:ring-[var(--aethel-focus-ring)]"
          >
            {projects.length === 0 ? (
              <option value="">No project selected</option>
            ) : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
            >
              Dashboard
            </Link>
            <Link
              href="/studio"
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 text-xs font-semibold text-[var(--aethel-info-light)] transition hover:brightness-110"
            >
              Studio
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function EvidenceEmptyState() {
  return (
    <div className="mt-6 rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-8 text-center">
      <p className="text-lg font-semibold">No projects yet</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
        Create or open a project to start collecting receipts.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--aethel-primary)] px-4 text-sm font-semibold text-[var(--aethel-text-primary)]"
      >
        Open dashboard <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export function EvidenceErrorState({
  errorText,
}: {
  errorText: string | null
}) {
  return (
    <div className="mt-6 rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-6">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--aethel-warning-light)]">
        <AlertTriangle className="h-4 w-4" />
        Evidence unavailable
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
        {errorText}
      </p>
    </div>
  )
}

export function EvidenceLoadingRunboard() {
  return (
    <div
      className="mt-6 rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-4"
      data-evidence-loading-runboard="true"
    >
      <div className="grid gap-4 lg:grid-cols-4">
        {evidenceLoadingCards.map(([label, value, text]) => (
          <div
            key={label}
            className="min-h-24 border-b border-[var(--aethel-border-subtle)] pb-4 last:border-b-0 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4 lg:last:border-r-0"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              {label}
            </p>
            <p className="mt-3 text-xl font-semibold text-[var(--aethel-text-primary)]">
              {value}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EvidenceReadinessSummary({
  stats,
}: {
  stats: EvidenceMetric[]
}) {
  return (
    <section className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <div
            key={String(label)}
            className="border-b border-[var(--aethel-border-subtle)] pb-4 last:border-b-0 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4 xl:last:border-r-0"
          >
            <Icon className="h-4 w-4 text-[var(--aethel-info-light)]" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
