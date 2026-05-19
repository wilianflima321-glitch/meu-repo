import { RefreshCw, Server } from 'lucide-react'

import type { ServiceHealth } from './infrastructure-types'
import { InfrastructureStatusBadge } from './InfrastructureStatusBadge'

type InfrastructureHeaderProps = {
  status: ServiceHealth['status']
  autoRefresh: boolean
  lastUpdated: Date | null
  onToggleAutoRefresh: () => void
}

export function InfrastructureHeader({ status, autoRefresh, lastUpdated, onToggleAutoRefresh }: InfrastructureHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--aethel-text-primary)]">
          <Server className="h-6 w-6" />
          Infrastructure
          <InfrastructureStatusBadge status={status} />
        </h1>
        <p className="text-sm text-[var(--aethel-text-tertiary)]">System health and resource utilization.</p>
        {lastUpdated ? <p className="text-xs text-[var(--aethel-text-tertiary)]">Updated at {lastUpdated.toLocaleString()}</p> : null}
      </div>

      <button
        type="button"
        onClick={onToggleAutoRefresh}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
          autoRefresh
            ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/10 text-[var(--aethel-success)]'
            : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)]'
        }`}
      >
        <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
        {autoRefresh ? 'Live' : 'Paused'}
      </button>
    </div>
  )
}
