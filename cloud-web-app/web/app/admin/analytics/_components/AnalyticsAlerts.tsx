import type { PerformanceBaselineResponse } from './analytics-types'

type AnalyticsAlertsProps = {
  error: string | null
  baseline: PerformanceBaselineResponse | null
}

export function AnalyticsAlerts({ error, baseline }: AnalyticsAlertsProps) {
  return (
    <>
      {error && (
        <div role="alert" aria-live="polite" className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-4 text-[var(--aethel-error-light)]">
          {error}
        </div>
      )}
      {baseline?.dataQuality?.hasAnyMissingSamples && (
        <div role="status" aria-live="polite" className="mb-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-secondary)]">
          Partial baseline: missing samples for {baseline.dataQuality.missingSamples.join(', ')}.
        </div>
      )}
    </>
  )
}
