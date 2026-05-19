import { Badge } from '@/components/ui/Badge'
import type { AnalyticsWindowDays, BaselineMetricSummary, PerformanceBaselineResponse } from './analytics-types'
import { formatValue, statusBadgeMeta } from './analytics-utils'

type BaselineRow = {
  name: string
  label: string
  data: BaselineMetricSummary
}

type AnalyticsPerformanceBaselineProps = {
  baseline: PerformanceBaselineResponse | null
  baselineRows: BaselineRow[]
  windowDays: AnalyticsWindowDays
}

export function AnalyticsPerformanceBaseline({ baseline, baselineRows, windowDays }: AnalyticsPerformanceBaselineProps) {
  return (
    <div className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--aethel-text-secondary)]">Performance baseline ({windowDays}d)</h2>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          {baseline?.window?.startAt && baseline?.window?.endAt
            ? `${new Date(baseline.window.startAt).toLocaleDateString()} - ${new Date(baseline.window.endAt).toLocaleDateString()}`
            : 'No loaded window'}
        </span>
      </div>
      <div className="overflow-x-auto" role="region" aria-label="Performance baseline table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] text-[var(--aethel-text-secondary)]">
              <th className="p-2 text-left">Metric</th>
              <th className="p-2 text-left">P50</th>
              <th className="p-2 text-left">P95</th>
              <th className="p-2 text-left">Target</th>
              <th className="p-2 text-left">Samples</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {baselineRows.map((row) => (
              <tr key={row.name} className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_60%,transparent)]">
                <td className="p-2 text-[var(--aethel-text-secondary)]">{row.label}</td>
                <td className="p-2 text-[var(--aethel-text-secondary)]">{formatValue(row.data.p50, row.data.unit)}</td>
                <td className="p-2 text-[var(--aethel-text-secondary)]">{formatValue(row.data.p95, row.data.unit)}</td>
                <td className="p-2 text-[var(--aethel-text-secondary)]">{formatValue(row.data.target, row.data.unit)}</td>
                <td className="p-2 text-[var(--aethel-text-secondary)]">{row.data.count}</td>
                <td className="p-2">
                  <Badge variant={statusBadgeMeta(row.data.status).variant} size="sm">
                    {statusBadgeMeta(row.data.status).label}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {baseline?.firstValue ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FirstValueCard label="First value median" value={baseline.firstValue.medianMs === null ? '--' : `${Math.round(baseline.firstValue.medianMs)} ms`} />
          <FirstValueCard label="First value p95" value={baseline.firstValue.p95Ms === null ? '--' : `${Math.round(baseline.firstValue.p95Ms)} ms`} />
          <FirstValueCard label="First value samples" value={baseline.firstValue.samples} />
        </div>
      ) : null}
    </div>
  )
}

function FirstValueCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
      <p className="text-xs text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{value}</p>
    </div>
  )
}
