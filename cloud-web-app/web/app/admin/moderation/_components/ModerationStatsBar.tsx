import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

import type { ModerationStats } from './moderation-types'

export function ModerationStatsBar({ stats }: { stats: ModerationStats }) {
  return (
    <div className="mb-6 grid grid-cols-4 gap-4">
      <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Pending</span>
          <Clock className="h-4 w-4 text-[var(--aethel-warning)]" />
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--aethel-text-primary)]">{stats.pending}</p>
      </div>

      <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Urgent</span>
          <AlertTriangle className="h-4 w-4 text-[var(--aethel-error)]" />
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--aethel-error)]">{stats.urgent}</p>
      </div>

      <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Processed today</span>
          <CheckCircle className="h-4 w-4 text-[var(--aethel-success)]" />
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--aethel-text-primary)]">{stats.todayProcessed}</p>
      </div>

      <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Average time</span>
          <Clock className="h-4 w-4 text-[var(--aethel-primary-light)]" />
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--aethel-text-primary)]">{stats.avgResponseTime}m</p>
      </div>
    </div>
  )
}
