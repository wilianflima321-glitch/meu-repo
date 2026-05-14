'use client'

import { AlertTriangle, CheckCircle2, CreditCard, DollarSign, Gauge, ShieldAlert } from 'lucide-react'
import useSWR from 'swr'
import { AethelAPIClient, type StudioCostLive } from '@/lib/api'

interface AIChatEconomicsPanelProps {
  projectId?: string
  currentRunEstimate?: number
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
  return new Intl.NumberFormat('en-US').format(value)
}

function meterTone(status: StudioCostLive['budget']['hourly']['status']) {
  switch (status) {
    case 'critical':
      return 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
    case 'warning':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
    default:
      return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
  }
}

function progressTone(status: StudioCostLive['budget']['hourly']['status']) {
  switch (status) {
    case 'critical':
      return 'bg-[var(--aethel-error)]'
    case 'warning':
      return 'bg-[var(--aethel-warning)]'
    default:
      return 'bg-[var(--aethel-success)]'
  }
}

function MeterCard({
  label,
  meter,
}: {
  label: string
  meter: StudioCostLive['budget']['hourly']
}) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${meterTone(meter.status)}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
        <span className="text-[11px] font-medium">{meter.percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)]">
        <div
          className={`h-full rounded-full transition-[width] ${progressTone(meter.status)}`}
          style={{ width: `${Math.min(100, Math.max(4, meter.percent))}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span>{formatUsd(meter.spendUsd)}</span>
        <span className="text-[var(--aethel-text-tertiary)]">budget {formatUsd(meter.budgetUsd)}</span>
      </div>
    </div>
  )
}

export function AIChatEconomicsPanel({ projectId, currentRunEstimate }: AIChatEconomicsPanelProps) {
  const { data, error, isLoading } = useSWR(
    ['studio-cost-live', projectId ?? 'default'],
    () => AethelAPIClient.getStudioCostLive(projectId),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
    }
  )

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center p-4 text-[11px] text-[var(--aethel-text-tertiary)]">
        Loading economics plane...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 p-4 text-center text-[11px] text-[var(--aethel-text-tertiary)]">
        <AlertTriangle className="h-5 w-5 text-[var(--aethel-warning-light)]" />
        <p>Economics plane unavailable.</p>
        <p className="max-w-[240px] text-[var(--aethel-text-quaternary)]">
          Could not load live cost, wallet, and billing readiness for this surface.
        </p>
      </div>
    )
  }

  const statusTone =
    data.status === 'blocked'
      ? 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
      : data.status === 'attention'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
        : 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className={`rounded-[22px] border px-3 py-3 ${statusTone}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">Economics plane</div>
              <p className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-secondary)]">
                Wallet, budget, and readiness before releasing the next wave.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-current/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
            {data.status}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              <CreditCard className="h-3.5 w-3.5" />
              Wallet
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
              {formatCredits(data.wallet.balance)}
            </div>
            <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">
              {data.wallet.lowBalance
                ? `Low balance below ${formatCredits(data.wallet.lowBalanceThreshold)} credits.`
                : 'Healthy balance for new executions.'}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              <Gauge className="h-3.5 w-3.5" />
              Run estimate
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
              {typeof currentRunEstimate === 'number' ? formatUsd(currentRunEstimate) : '--'}
            </div>
            <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">
              Current average per request: {formatUsd(data.metrics.avgCostPerRequestUsd)}.
            </p>
          </div>
        </div>

        <MeterCard label="Hourly" meter={data.budget.hourly} />
        <MeterCard label="Daily" meter={data.budget.daily} />
        <MeterCard label="Monthly" meter={data.budget.monthly} />

        <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
            {data.billing.checkoutReady && data.billing.portalReady && data.billing.webhookReady ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" />
            )}
            Billing runtime
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)]">
              {data.billing.providerLabel}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)]">
              checkout {String(data.billing.checkoutReady)}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)]">
              webhook {String(data.billing.webhookReady)}
            </span>
          </div>
          {data.billing.blockers.length > 0 ? (
            <ul className="mt-3 space-y-1 text-[11px] text-[var(--aethel-text-secondary)]">
              {data.billing.blockers.map((blocker) => (
                <li key={blocker}>- {blocker}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
            Policy & guidance
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)]">
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
              emergency {data.policy.emergencyLevel}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
              fallback {data.policy.fallbackModel}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
              max tokens {data.policy.maxTokensPerRequest}
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-[11px] leading-5 text-[var(--aethel-text-secondary)]">
            {data.guidance.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
