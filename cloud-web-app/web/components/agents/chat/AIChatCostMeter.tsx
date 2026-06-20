'use client'

import { Activity, AlertTriangle, CreditCard, DollarSign, Gauge } from 'lucide-react'
import useSWR from 'swr'

import { AethelAPIClient, type StudioCostLive } from '@/lib/api'

interface AIChatCostMeterProps {
  projectId?: string
  currentRunEstimate?: number
  selectedModelName: string
  isAIWorking: boolean
  isBYOK?: boolean // Wave 12.0: Sinalizador de VIP
  onOpenEconomics: () => void
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 3 : 2,
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value)
}

function formatCredits(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function toneFor(status?: StudioCostLive['budget']['monthly']['status'] | StudioCostLive['status']) {
  switch (status) {
    case 'blocked':
    case 'critical':
      return {
        border: 'border-[color-mix(in_srgb,var(--aethel-error)_36%,transparent)]',
        bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_9%,transparent)]',
        text: 'text-[var(--aethel-error-light)]',
        bar: 'bg-[var(--aethel-error)]',
      }
    case 'attention':
    case 'warning':
      return {
        border: 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)]',
        bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_9%,transparent)]',
        text: 'text-[var(--aethel-warning-light)]',
        bar: 'bg-[var(--aethel-warning)]',
      }
    default:
      return {
        border: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]',
        bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)]',
        text: 'text-[var(--aethel-success-light)]',
        bar: 'bg-[var(--aethel-success)]',
      }
  }
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(4, Math.round(value)))
}

export function AIChatCostMeter({
  projectId,
  selectedModelName,
  isAIWorking,
  isBYOK = false,
  onOpenEconomics,
}: AIChatCostMeterProps) {
  const { data, error, isLoading } = useSWR(
    ['studio-cost-live-meter', projectId ?? 'default'],
    () => AethelAPIClient.getStudioCostLive(projectId),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
    }
  )

  if (isLoading) {
    return (
      <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-4 py-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          <span className="inline-flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            Cost syncing
          </span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--aethel-surface-tertiary)]" />
        </div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-4 py-2">
        <button
          type="button"
          onClick={onOpenEconomics}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_9%,transparent)] px-3 py-2 text-left text-[11px] text-[var(--aethel-warning-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-warning)_13%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          aria-label="Open economics details because live cost is unavailable"
        >
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Cost unavailable
          </span>
          <span className="text-[var(--aethel-text-tertiary)]">Review budget</span>
        </button>
      </section>
    )
  }

  const monthlyPercent = clampPercent(data.budget.monthly.percent)
  const runEstimate = data.metrics.avgCostPerRequestUsd
  const tone = toneFor(data.status === 'ready' ? data.budget.monthly.status : data.status)

  return (
    <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-4 py-2">
      <button
        type="button"
        onClick={onOpenEconomics}
        className={`grid w-full gap-3 rounded-2xl border ${tone.border} ${tone.bg} px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] md:grid-cols-[minmax(0,1fr)_auto]`}
        aria-label="Open live economics and budget details"
      >
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] ${tone.text}`}>
              <DollarSign className="h-3.5 w-3.5" />
              Live cost
            </span>
            <span className="truncate text-[var(--aethel-text-tertiary)]">{selectedModelName}</span>
            <span className="inline-flex items-center gap-1 text-[var(--aethel-text-quaternary)]">
              <Activity className={`h-3.5 w-3.5 ${isAIWorking ? 'animate-pulse text-[var(--aethel-success)]' : ''}`} />
              {isAIWorking ? 'running' : 'ready'}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)]">
            {isBYOK ? (
               <div
                 className={`h-full rounded-full transition-[width] bg-[#39ff14] shadow-[0_0_8px_#39ff14]`}
                 style={{ width: `100%` }}
               />
            ) : (
               <div
                 className={`h-full rounded-full transition-[width] ${tone.bar}`}
                 style={{ width: `${monthlyPercent}%` }}
               />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] sm:min-w-[300px]">
          <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] px-2.5 py-1.5">
            <span className="flex items-center gap-1 text-[var(--aethel-text-quaternary)]">
              <Gauge className="h-3.5 w-3.5" />
              Run
            </span>
            <strong className="mt-0.5 block text-[var(--aethel-text-primary)]">
              {isBYOK ? 'Bypass' : formatUsd(runEstimate)}
            </strong>
          </span>
          <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] px-2.5 py-1.5">
            <span className="flex items-center gap-1 text-[var(--aethel-text-quaternary)]">
              <CreditCard className="h-3.5 w-3.5" />
              Wallet
            </span>
            <strong className="mt-0.5 block text-[var(--aethel-text-primary)]">
              {formatCredits(data.wallet.balance)}
            </strong>
          </span>
          <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] px-2.5 py-1.5">
            <span className="text-[var(--aethel-text-quaternary)]">Month</span>
            <strong className={`mt-0.5 block ${tone.text}`}>{data.budget.monthly.percent}%</strong>
          </span>
        </div>
      </button>
    </section>
  )
}

export default AIChatCostMeter
