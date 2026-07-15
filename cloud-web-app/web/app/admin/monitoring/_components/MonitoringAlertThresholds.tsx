import type { MonitoringMetrics } from './monitoring-types'

export function MonitoringAlertThresholds({ metrics }: { metrics: MonitoringMetrics | null }) {
  const alerts = [
    { label: 'Error rate', threshold: '> 1%', current: metrics ? `${metrics.errorRate.toFixed(1)}%` : '...' },
    { label: 'P95 latency', threshold: '> 2000ms', current: metrics ? `${metrics.p95Latency}ms` : '...' },
    { label: 'Health-check failures', threshold: 'Any critical', current: metrics ? `${metrics.healthChecks.filter((check) => check.status === 'down').length} unavailable` : '...' },
  ]

  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
      <h2 className="mb-4 text-lg font-semibold">Alert thresholds</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <div key={alert.label} className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-3">
            <div className="text-xs text-[var(--aethel-text-tertiary)]">{alert.label}</div>
            <div className="mt-1 text-sm font-medium">{alert.current}</div>
            <div className="mt-0.5 text-xs text-[var(--aethel-text-quaternary)]">Threshold: {alert.threshold}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
