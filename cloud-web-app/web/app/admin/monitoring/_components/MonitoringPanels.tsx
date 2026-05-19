import { AlertTriangle, Shield } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'

import { STATUS_LABELS } from './monitoring-constants'
import type { HealthCheckResult } from './monitoring-types'
import { StatusDot } from './monitoring-utils'

type MonitoringAttentionPanelProps = {
  blockedChecks: HealthCheckResult[]
  degradedChecks: HealthCheckResult[]
}

export function MonitoringAttentionPanel({ blockedChecks, degradedChecks }: MonitoringAttentionPanelProps) {
  const checks = [...blockedChecks, ...degradedChecks]

  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
      <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[var(--aethel-warning)]" /><h2 className="text-base font-semibold">Checks needing attention</h2></div>
      <div className="mt-4 space-y-3">
        {checks.length > 0 ? checks.map((check) => (
          <div key={check.endpoint} className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><StatusDot status={check.status} /><p className="text-sm font-medium">{check.endpoint}</p></div>
              <Badge variant={check.status === 'down' ? 'error' : 'warning'} size="sm">{STATUS_LABELS[check.status]}</Badge>
            </div>
            <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">Observed latency: {check.latencyMs}ms</p>
          </div>
        )) : (
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-secondary)]">
            No health check on this surface is degraded right now.
          </div>
        )}
      </div>
    </div>
  )
}

export function MonitoringInterpretationPanel() {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
      <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-[var(--aethel-success)]" /><h2 className="text-base font-semibold">How to read this page</h2></div>
      <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
        <p>This surface measures technical availability and latency for core services.</p>
        <p>It does not replace L4 evidence: preview, billing, rollback, and workspace coverage still need dedicated operational proof.</p>
        <p>When this page is green, the technical base is more stable. It does not automatically mean the full product experience is complete.</p>
      </div>
    </div>
  )
}
