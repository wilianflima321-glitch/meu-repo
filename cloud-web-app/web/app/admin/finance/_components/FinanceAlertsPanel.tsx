import { AlertTriangle } from 'lucide-react'

import type { FinanceMetrics } from './finance-types'

function alertTone(type: FinanceMetrics['alerts'][number]['type']) {
  if (type === 'critical') return 'bg-[var(--aethel-error)]/10 border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[var(--aethel-error)]'
  if (type === 'info') return 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] text-[var(--aethel-info)]'
  return 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] text-[var(--aethel-warning)]'
}

export function FinanceAlertsPanel({ alerts }: { alerts: FinanceMetrics['alerts'] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
          <AlertTriangle className="h-4 w-4" />
          Financial alerts
        </h3>
        <p className="py-4 text-center text-sm text-[var(--aethel-text-tertiary)]">No alerts right now.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
        <AlertTriangle className="h-4 w-4" />
        Financial alerts ({alerts.length})
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, index) => (
          <div key={`${alert.type}-${index}`} className={`rounded-lg border p-3 ${alertTone(alert.type)}`}>
            <p className="text-sm">{alert.message}</p>
            {(alert.metric || alert.value !== undefined || alert.threshold !== undefined) ? (
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                {alert.metric ?? 'value'}: {alert.value ?? '-'}
                {alert.threshold !== undefined ? ` (limit: ${alert.threshold})` : ''}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
