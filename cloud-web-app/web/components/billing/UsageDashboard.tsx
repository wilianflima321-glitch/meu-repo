'use client'

/**
 * Block 6C.6 — Usage dashboard (Cursor-class).
 * Dual Fast/Premium bars + educational $ eq + wallet + PAYG panel.
 * Source: GET /api/quotas + GET/POST /api/billing/payg — never invent pool numbers.
 */

import React, { useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { AlertTriangle, Coins, Sparkles, Wallet } from 'lucide-react'
import { PaygSettingsPanel } from '@/components/billing/PaygSettingsPanel'
import { UsageReceiptList } from '@/components/billing/UsageReceiptList'
import { StudioOrgPoolPanel } from '@/components/billing/StudioOrgPoolPanel'
import {
  PREMIUM_WEIGHT_FOR_METER,
  apiEquivalentUsdRemaining,
  formatApiEqUsd,
  formatTokenCount,
  isPoolAtWarnThreshold,
  poolUsagePercent,
} from '@/lib/billing/usage-meter-math'

type QuotasResponse = {
  success?: boolean
  plan?: string
  period?: string
  wallet?: { balance: number; currency: string }
  paygEnabled?: boolean
  payg?: {
    enabled: boolean
    spendCapUsdCents: number | null
    accruedUsdCents: number
    remainingCapUsdCents: number | null
  } | null
  dualPool?: {
    fast: { used: number; limit: number; remaining: number }
    premium: { used: number; limit: number; remaining: number }
  }
  creativeWallet?: {
    balance: number
    unlimited?: boolean
    includedPerMonth?: number
    separateFromLlmPools?: boolean
    currency?: string
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function PoolBar({
  label,
  used,
  limit,
  remaining,
  weight,
  hint,
}: {
  label: string
  used: number
  limit: number
  remaining: number
  weight: number
  hint: string
}) {
  const pct = poolUsagePercent(used, limit)
  const warn = isPoolAtWarnThreshold(used, limit)
  const critical = limit > 0 && pct >= 95
  const usd = apiEquivalentUsdRemaining({ remaining, weight })

  return (
    <div
      className={`rounded-xl border p-4 ${
        critical
          ? 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]'
          : warn
            ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]'
            : 'border-[var(--aethel-border-primary)]'
      } bg-[var(--aethel-surface-secondary)]`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
            {label}
          </p>
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">{hint}</p>
        </div>
        {warn && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              critical
                ? 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]'
                : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]'
            }`}
          >
            {critical ? 'Critical' : '80%+'}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">
        {formatTokenCount(used)}
        <span className="text-sm font-normal text-[var(--aethel-text-tertiary)]">
          {' '}
          / {formatTokenCount(limit)}
        </span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--aethel-surface-tertiary)]">
        <div
          className={`h-full rounded-full transition-all ${
            critical
              ? 'bg-[var(--aethel-error)]'
              : warn
                ? 'bg-[var(--aethel-warning)]'
                : 'bg-[var(--aethel-info)]'
          }`}
          style={{ width: `${limit < 0 ? 0 : pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--aethel-text-tertiary)]">
        <span>
          {pct.toFixed(0)}% used · {formatTokenCount(remaining)} left
        </span>
        <span className="text-[var(--aethel-text-secondary)]">{formatApiEqUsd(usd)}</span>
      </div>
    </div>
  )
}

export function UsageDashboard() {
  const { data, error, isLoading, mutate } = useSWR<QuotasResponse>('/api/quotas', fetcher, {
    refreshInterval: 30_000,
  })

  const dual = data?.dualPool
  const walletBalance = data?.wallet?.balance ?? 0

  const warnCopy = useMemo(() => {
    if (!dual) return null
    const fastWarn = isPoolAtWarnThreshold(dual.fast.used, dual.fast.limit)
    const premWarn = isPoolAtWarnThreshold(dual.premium.used, dual.premium.limit)
    if (!fastWarn && !premWarn) return null
    return 'A pool is at 80%+. Buy credits or enable PAYG with a spend cap — the IDE stays unlocked.'
  }, [dual])

  if (isLoading && !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-[var(--aethel-surface-tertiary)]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-36 rounded-xl bg-[var(--aethel-surface-tertiary)]" />
          <div className="h-36 rounded-xl bg-[var(--aethel-surface-tertiary)]" />
        </div>
      </div>
    )
  }

  if (error || !data?.success || !dual) {
    return (
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-[var(--aethel-error)]" />
        <p className="font-semibold text-[var(--aethel-text-primary)]">Could not load AI usage</p>
        <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">
          Sign in and retry. Quotas stay fail-closed — no invented numbers.
        </p>
        <button
          type="button"
          onClick={() => void mutate()}
          className="mt-4 rounded-lg bg-[var(--aethel-surface-tertiary)] px-4 py-2 text-sm text-[var(--aethel-text-primary)]"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--aethel-text-primary)]">AI usage</h2>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">
            Plan{' '}
            <span className="font-medium text-[var(--aethel-info-light)]">{data.plan || 'free'}</span>
            {data.period ? ` · Period ${data.period}` : ''}
          </p>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            $ figures are educational API-equivalent — not a charge estimate for included pools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/billing?tab=credits"
            className="rounded-lg border border-[var(--aethel-border-primary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
          >
            Buy credits
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg bg-[var(--aethel-info)] px-3 py-2 text-sm font-medium text-[var(--aethel-text-primary)]"
          >
            Upgrade
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PoolBar
          label="Fast AI"
          used={dual.fast.used}
          limit={dual.fast.limit}
          remaining={dual.fast.remaining}
          weight={1}
          hint="1× models — chat, drafts, fast agents"
        />
        <PoolBar
          label="Premium AI"
          used={dual.premium.used}
          limit={dual.premium.limit}
          remaining={dual.premium.remaining}
          weight={PREMIUM_WEIGHT_FOR_METER}
          hint="40× models — deep coding & reasoning"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
          <Wallet className="h-8 w-8 text-[var(--aethel-warning-light)]" />
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
              Credit wallet
            </p>
            <p className="text-xl font-bold text-[var(--aethel-text-primary)]">
              {walletBalance.toLocaleString()}{' '}
              <span className="text-sm font-normal text-[var(--aethel-text-tertiary)]">credits</span>
            </p>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              Used after subscription pools empty
            </p>
          </div>
          <Link
            href="/billing?tab=credits"
            className="ml-auto text-sm text-[var(--aethel-info-light)] underline"
          >
            Top up
          </Link>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
          <Coins className="h-8 w-8 text-[var(--aethel-text-tertiary)]" />
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
              PAYG status
            </p>
            <p className="text-xl font-bold text-[var(--aethel-text-primary)]">
              {data.paygEnabled ? 'Enabled' : 'Off'}
            </p>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {data.payg?.spendCapUsdCents != null
                ? `Cap $${(data.payg.spendCapUsdCents / 100).toFixed(0)} · accrued $${((data.payg.accruedUsdCents || 0) / 100).toFixed(2)}`
                : 'Enable below with a mandatory spend cap'}
            </p>
          </div>
          <Sparkles className="ml-auto h-5 w-5 text-[var(--aethel-info-light)]" />
        </div>
      </div>

      {warnCopy && (
        <div className="flex gap-3 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--aethel-warning-light)]" />
          <p className="text-sm text-[var(--aethel-warning-light)]">{warnCopy}</p>
        </div>
      )}

      <PaygSettingsPanel />

      <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-info-light)]">
              Creative wallet · Block 6F
            </p>
            <h3 className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">Creative usage</h3>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
              Image / 3D / video / music / voice debit this wallet only — never Fast or Premium LLM pools.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">
              {data.creativeWallet?.unlimited
                ? '∞'
                : (data.creativeWallet?.balance ?? 0).toLocaleString()}
              <span className="ml-1 text-sm font-normal text-[var(--aethel-text-tertiary)]">
                credits
              </span>
            </p>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              Included / mo:{' '}
              {data.creativeWallet?.includedPerMonth != null && data.creativeWallet.includedPerMonth < 0
                ? 'Unlimited'
                : (data.creativeWallet?.includedPerMonth ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
          Example: min video job ≈ 80 creative credits · Fast/Premium bars above stay unchanged (B6-ACC-06).
        </p>
      </div>

      <UsageReceiptList />
      <StudioOrgPoolPanel />
    </div>
  )
}

export default UsageDashboard
