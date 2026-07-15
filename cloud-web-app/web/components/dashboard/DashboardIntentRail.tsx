'use client'

/**
 * Block 7A.3 — Single dashboard intent rail (critique #17 / DEBT-UX-DASH-001).
 * Collapses entry + routing notice + auth/billing chips into one row.
 */

import { X } from 'lucide-react'

export type DashboardIntentRailProps = {
  entryMission?: string | null
  entrySource?: string | null
  entryLaneLabel?: string
  entryLaneDescription?: string
  authErrorText?: string | null
  billingErrorText?: string | null
  routingTitle?: string | null
  routingBody?: string | null
  trialDaysLeft?: number | null
  onResumeEntryMission?: () => void
  onDismissEntryIntent?: () => void
  onDismissRouting?: () => void
  onDismissTrial?: () => void
}

export function DashboardIntentRail({
  entryMission,
  entrySource,
  entryLaneLabel,
  entryLaneDescription,
  authErrorText,
  billingErrorText,
  routingTitle,
  routingBody,
  trialDaysLeft,
  onResumeEntryMission,
  onDismissEntryIntent,
  onDismissRouting,
  onDismissTrial,
}: DashboardIntentRailProps) {
  const hasEntry = Boolean(entryMission || entrySource)
  const hasErrors = Boolean(authErrorText || billingErrorText)
  const hasRouting = Boolean(routingTitle)
  const hasTrial = typeof trialDaysLeft === 'number' && trialDaysLeft >= 0

  if (!hasEntry && !hasErrors && !hasRouting && !hasTrial) return null

  const headline = hasEntry
    ? 'Continue where you left off.'
    : hasRouting
      ? routingTitle
      : hasErrors
        ? 'Attention required'
        : 'Trial active'

  const body = hasEntry
    ? entryMission
      ? entryMission
      : entrySource && entryLaneDescription
        ? entryLaneDescription
        : 'Pick up from the latest project activity. Deep tools expand only when the task needs them.'
    : routingBody ?? null

  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] px-4 py-3 shadow-[var(--aethel-shadow-lg)] md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info)]">
              Primary flow
            </span>
            {entrySource && entryLaneLabel ? (
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                {entryLaneLabel}
              </span>
            ) : null}
            {hasTrial ? (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-warning)]">
                Trial · {trialDaysLeft}d
                {onDismissTrial ? (
                  <button
                    type="button"
                    aria-label="Dismiss trial chip"
                    onClick={onDismissTrial}
                    className="ml-1 inline-flex align-middle text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            ) : null}
            {authErrorText ? (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-2.5 py-1 text-[10px] text-[var(--aethel-error-light)]">
                Auth: {authErrorText}
              </span>
            ) : null}
            {billingErrorText ? (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2.5 py-1 text-[10px] text-[var(--aethel-warning-light)]">
                Billing: {billingErrorText}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)] sm:text-lg">{headline}</h2>
          {body ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">{body}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {onResumeEntryMission && hasEntry ? (
            <button
              type="button"
              onClick={onResumeEntryMission}
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-[var(--aethel-shadow-md)] transition hover:bg-[var(--aethel-text-secondary)]"
            >
              Resume Workspace
            </button>
          ) : null}
          {onDismissEntryIntent && hasEntry ? (
            <button
              type="button"
              onClick={onDismissEntryIntent}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]"
            >
              Hide context
            </button>
          ) : null}
          {onDismissRouting && hasRouting && !hasEntry ? (
            <button
              type="button"
              onClick={onDismissRouting}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)]"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default DashboardIntentRail
