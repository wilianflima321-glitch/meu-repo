import React from 'react'

export type DashboardEntryIntentBannerProps = {
  entryMission?: string | null
  entrySource?: string | null
  entryLaneLabel?: string
  entryLaneDescription?: string
  onResumeEntryMission?: () => void
  onDismissEntryIntent?: () => void
}

export function DashboardEntryIntentBanner({
  entryMission,
  entrySource,
  entryLaneLabel,
  entryLaneDescription,
  onResumeEntryMission,
  onDismissEntryIntent,
}: DashboardEntryIntentBannerProps) {
  if (!entryMission && !entrySource) return null

  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
      <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] px-4 py-4 shadow-[0_20px_60px_rgba(2,6,23,0.22)] md:flex-row md:items-center md:justify-between">
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
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
              Workspace
            </span>
          </div>
          <h2 className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)] sm:text-lg">
            Continue where you left off.
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {entryMission
              ? entryMission
              : entrySource && entryLaneDescription
                ? entryLaneDescription
                : 'Pick up from the latest project activity. Deep tools expand only when the task needs them.'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {onResumeEntryMission ? (
            <button
              type="button"
              onClick={onResumeEntryMission}
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-[0_14px_32px_rgba(2,6,23,0.16)] transition hover:bg-[var(--aethel-text-secondary)]"
            >
              Resume in AI Chat
            </button>
          ) : null}
          {onDismissEntryIntent ? (
            <button
              type="button"
              onClick={onDismissEntryIntent}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-primary)] hover:text-[var(--aethel-text-primary)]"
            >
              Hide context
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
