'use client'

import { ShieldCheck } from 'lucide-react'
import type {
  ReleaseEvidencePackageManifest,
  ReleaseEvidencePackageManifestVerification,
  ReleaseEvidenceReadinessSnapshot,
  ReleaseReviewAction,
  ReleaseReviewState,
} from './EvidenceCenter.types'

type EvidenceReleaseReceiptsPanelProps = {
  releaseReadiness: ReleaseEvidenceReadinessSnapshot
  releaseManifest: ReleaseEvidencePackageManifest | null
  releaseManifestVerification: ReleaseEvidencePackageManifestVerification | null
  releaseReviewState: ReleaseReviewState
  releaseReviewMessage: string | null
  releaseDecisionNote: string
  onDecisionNoteChange: (value: string) => void
  onSubmitReviewAction: (action: ReleaseReviewAction) => void
  onExportManifest: () => void
}

export function EvidenceReleaseReceiptsPanel({
  releaseReadiness,
  releaseManifest,
  releaseManifestVerification,
  releaseReviewState,
  releaseReviewMessage,
  releaseDecisionNote,
  onDecisionNoteChange,
  onSubmitReviewAction,
  onExportManifest,
}: EvidenceReleaseReceiptsPanelProps) {
  const canDecide =
    releaseReadiness.canRequestHumanReview &&
    releaseReadiness.status !== 'blocked'
  const isBusy =
    releaseReviewState === 'requesting' || releaseReviewState === 'deciding'

  return (
    <section
      className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-5"
      data-evidence-source="release-evidence-readiness"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Review package
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {releaseReadiness.scorePercent}% ready for review
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {releaseReadiness.nextAction}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            {releaseReadiness.status}
          </span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            held for review
          </span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            owner approval
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="border-b border-[var(--aethel-border-subtle)] pb-3 lg:border-b-0 lg:pb-0">
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
            Owner review
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
            {releaseReadiness.canRequestHumanReview
              ? 'Request owner review. Release stays held until explicit approval exists.'
              : 'Review is held until every required check is covered.'}
          </p>
          {releaseReviewMessage ? (
            <p className="mt-2 text-[11px] leading-5 text-[var(--aethel-warning-light)]">
              {releaseReviewMessage}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={releaseDecisionNote}
            onChange={(event) =>
              onDecisionNoteChange(event.currentTarget.value)
            }
            placeholder="Optional owner note"
            className="min-h-10 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-3 text-xs text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:ring-2 focus:ring-[var(--aethel-focus-ring)]"
          />
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => onSubmitReviewAction('request-human-review')}
              disabled={!releaseReadiness.canRequestHumanReview || isBusy}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-info-light)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {releaseReviewState === 'requesting'
                ? 'Requesting...'
                : 'Request review'}
            </button>
            <button
              type="button"
              onClick={() => onSubmitReviewAction('record-human-approval')}
              disabled={!canDecide || isBusy}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-success-light)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Record approval
            </button>
            <button
              type="button"
              onClick={() => onSubmitReviewAction('reject-human-review')}
              disabled={!canDecide || isBusy}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject package
            </button>
          </div>
        </div>
      </div>

      {releaseManifest ? (
        <div
          className="mt-3 flex flex-col gap-3 rounded-lg border border-[var(--aethel-border-subtle)] bg-[rgba(var(--aethel-overlay-ink-rgb),0.18)] p-3 lg:flex-row lg:items-center lg:justify-between"
          data-evidence-source="release-evidence-package-manifest"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              Exportable receipt manifest
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--aethel-text-tertiary)]">
              {releaseManifest.integrityHash}
            </p>
            {releaseManifestVerification ? (
              <p className="mt-1 text-[11px] font-semibold text-[var(--aethel-success-light)]">
                {releaseManifestVerification.valid
                  ? 'Integrity verified'
                  : `Integrity warning: ${releaseManifestVerification.errors[0] ?? 'manifest mismatch'}`}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onExportManifest}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
          >
            Export manifest
          </button>
        </div>
      ) : null}

      <details className="mt-4 rounded-lg border border-[var(--aethel-border-subtle)] bg-[rgba(var(--aethel-overlay-ink-rgb),0.16)] p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-[var(--aethel-text-secondary)]">
          <span>Show review checks</span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
            {releaseReadiness.coveredRequiredLanes}/
            {releaseReadiness.totalRequiredLanes} covered
          </span>
        </summary>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)]">
          {releaseReadiness.lanes.map((lane) => (
            <div
              key={lane.id}
              className="grid gap-2 border-b border-[var(--aethel-border-subtle)] px-3 py-3 last:border-b-0 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1fr)] lg:items-center"
            >
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                {lane.label}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                {lane.status}
              </span>
              <p className="text-xs leading-5 text-[var(--aethel-text-secondary)]">
                {lane.nextAction}
              </p>
            </div>
          ))}
        </div>
      </details>
      <p className="mt-4 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
        This package is for review only. It never auto-publishes or marks a game, film, app, or runtime job as final.
      </p>
    </section>
  )
}
