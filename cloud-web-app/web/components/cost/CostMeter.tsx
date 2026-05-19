'use client'

import { Activity, AlertTriangle, DollarSign } from 'lucide-react'
import useSWR from 'swr'

import { AethelAPIClient, type StudioCostLive } from '@/lib/api'

type CostMeterProps = {
  projectId?: string
  className?: string
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 3 : 2,
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value)
}

function toneFor(status?: StudioCostLive['status'] | StudioCostLive['budget']['monthly']['status']) {
  if (status === 'blocked' || status === 'critical') {
    return {
      shell: 'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] text-[var(--aethel-error-light)]',
      bar: 'bg-[var(--aethel-error)]',
    }
  }
  if (status === 'attention' || status === 'warning') {
    return {
      shell: 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] text-[var(--aethel-warning-light)]',
      bar: 'bg-[var(--aethel-warning)]',
    }
  }
  return {
    shell: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] text-[var(--aethel-success-light)]',
    bar: 'bg-[var(--aethel-success)]',
  }
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(4, Math.round(value)))
}

export function CostMeter({ projectId, className = '' }: CostMeterProps) {
  const { data, error, isLoading } = useSWR(
    ['studio-cost-live-compact-meter', projectId ?? 'default'],
    () => AethelAPIClient.getStudioCostLive(projectId),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
    },
  )

  if (isLoading) {
    return (
      <div className={`hidden min-h-9 items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] px-3 text-xs text-[var(--aethel-text-tertiary)] sm:inline-flex ${className}`}>
        <Activity className="h-3.5 w-3.5 animate-pulse" />
        Cost sync
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`hidden min-h-9 items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-3 text-xs text-[var(--aethel-warning-light)] sm:inline-flex ${className}`}>
        <AlertTriangle className="h-3.5 w-3.5" />
        Cost unavailable
      </div>
    )
  }

  const monthlyPercent = clampPercent(data.budget.monthly.percent)
  const tone = toneFor(data.status === 'ready' ? data.budget.monthly.status : data.status)

  return (
    <div
      className={`hidden min-h-9 items-center gap-2 rounded-xl border px-3 text-xs ${tone.shell} sm:inline-flex ${className}`}
      title={data.guidance[0] ?? 'Live agent cost and monthly budget'}
    >
      <DollarSign className="h-3.5 w-3.5" />
      <span className="font-semibold">{formatUsd(data.metrics.avgCostPerRequestUsd)}</span>
      <span className="text-[var(--aethel-text-tertiary)]">avg</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)]">
        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${monthlyPercent}%` }} />
      </span>
      <span className="font-mono text-[10px]">{data.budget.monthly.percent}%</span>
    </div>
  )
}

export default CostMeter
