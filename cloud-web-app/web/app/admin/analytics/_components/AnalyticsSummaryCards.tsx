import type { AdminAnalyticsMetrics } from './analytics-types'

type AnalyticsSummaryCardsProps = {
  loading: boolean
  metrics: AdminAnalyticsMetrics | null
}

export function AnalyticsSummaryCards({ loading, metrics }: AnalyticsSummaryCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3" aria-busy={loading}>
      <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)]">Active users (1h)</h3>
        <p className="mt-2 text-2xl font-semibold">{loading ? '--' : metrics?.activeUsers || 0}</p>
        <p className="text-xs text-[var(--aethel-text-tertiary)]">Req/min: {loading ? '--' : metrics?.requestsPerMinute || 0}</p>
      </div>
      <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)]">Daily revenue</h3>
        <p className="mt-2 text-2xl font-semibold">${loading ? '--' : (metrics?.dailyRevenue || 0).toFixed(2)}</p>
        <p className="text-xs text-[var(--aethel-text-tertiary)]">AI cost today: ${loading ? '--' : (metrics?.aiCostToday || 0).toFixed(2)}</p>
      </div>
      <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)]">AI tokens (24h)</h3>
        <p className="mt-2 text-2xl font-semibold">{loading ? '--' : (metrics?.aiTokens || 0).toLocaleString()}</p>
        <p className="text-xs text-[var(--aethel-text-tertiary)]">Source: /api/admin/ai/metrics</p>
      </div>
    </div>
  )
}
