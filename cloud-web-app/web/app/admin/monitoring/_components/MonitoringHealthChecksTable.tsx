import { Badge } from '@/components/ui/Badge'

import { STATUS_LABELS } from './monitoring-constants'
import type { MonitoringMetrics } from './monitoring-types'
import { StatusDot } from './monitoring-utils'

type MonitoringHealthChecksTableProps = {
  metrics: MonitoringMetrics | null
  loading: boolean
}

export function MonitoringHealthChecksTable({ metrics, loading }: MonitoringHealthChecksTableProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)]">
      <div className="border-b border-[var(--aethel-border-subtle)] px-6 py-4"><h2 className="text-lg font-semibold">Service health checks</h2></div>
      <div className="divide-y divide-[color-mix(in_srgb,var(--aethel-border-subtle)_70%,transparent)]">
        {metrics?.healthChecks.map((check) => (
          <div key={check.endpoint} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)]">
            <div className="flex items-center gap-3"><StatusDot status={check.status} /><span className="font-medium">{check.endpoint}</span></div>
            <div className="flex items-center gap-4"><span className="text-sm text-[var(--aethel-text-secondary)]">{check.latencyMs}ms</span><Badge variant={check.status === 'healthy' ? 'success' : check.status === 'degraded' ? 'warning' : 'error'} size="sm">{STATUS_LABELS[check.status]}</Badge></div>
          </div>
        ))}
        {loading && !metrics ? <div className="px-6 py-12 text-center text-[var(--aethel-text-tertiary)]">Running health checks...</div> : null}
      </div>
    </div>
  )
}
