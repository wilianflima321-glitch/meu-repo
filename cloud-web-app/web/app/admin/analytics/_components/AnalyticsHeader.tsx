import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import type { AnalyticsWindowDays, PerformanceBaselineResponse } from './analytics-types'

type AnalyticsHeaderProps = {
  baseline: PerformanceBaselineResponse | null
  lastUpdated: Date | null
  windowDays: AnalyticsWindowDays
  onWindowChange: (value: AnalyticsWindowDays) => void
  onExport: () => void
}

export function AnalyticsHeader({ baseline, lastUpdated, windowDays, onWindowChange, onExport }: AnalyticsHeaderProps) {
  return (
    <AdminPageHeader
      className="mb-6"
      title="Analytics baseline"
      subtitle="Operational view of performance, funnel, and cost for a configurable window."
      meta={(
        <>
          {lastUpdated ? <>Updated {lastUpdated.toLocaleString()}</> : null}
          {baseline?.capability ? (
            <span className="ml-2">capability: {baseline.capability} | status: {baseline.capabilityStatus ?? 'UNKNOWN'}</span>
          ) : null}
        </>
      )}
      actions={(
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="analytics-window-days">
            Window in days
          </label>
          <select
            id="analytics-window-days"
            value={windowDays}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (next === 7 || next === 14 || next === 30) onWindowChange(next)
            }}
            className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <button
            type="button"
            onClick={onExport}
            className="rounded border border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[var(--aethel-primary)]/20 px-4 py-2 text-sm text-[var(--aethel-primary-light)] hover:bg-[var(--aethel-primary)]/30"
          >
            Export JSON
          </button>
        </div>
      )}
    />
  )
}
