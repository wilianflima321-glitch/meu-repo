'use client'

/**
 * Block 6H.2 — IDE status chip: Fast % · Prem % · Extra $
 */

import Link from 'next/link'
import useSWR from 'swr'
import { poolUsagePercent } from '@/lib/billing/usage-meter-math'
import { WALLET_CUSTOM_TOPUP } from '@/lib/billing/wallet-credit-packs'

type QuotasResponse = {
  success?: boolean
  dualPool?: {
    fast: { used: number; limit: number; remaining: number }
    premium: { used: number; limit: number; remaining: number }
  }
  wallet?: { balance: number; currency: string }
  payg?: { accruedUsdCents?: number } | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (res.status === 401) return null
  return res.json()
}

function creditsToUsd(credits: number): number {
  return credits / WALLET_CUSTOM_TOPUP.creditsPerUsd
}

export function formatAiUsageStatusChip(input: {
  fastPct: number
  premPct: number
  extraUsd: number
}): string {
  const extra =
    input.extraUsd < 0.01 && input.extraUsd > 0
      ? '<$0.01'
      : `$${input.extraUsd.toFixed(2)}`
  return `Fast ${Math.round(input.fastPct)}% · Prem ${Math.round(input.premPct)}% · Extra ${extra}`
}

export function AiUsageStatusChip() {
  const { data, isLoading } = useSWR<QuotasResponse | null>('/api/quotas', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  if (data === null) return null

  if (isLoading && !data) {
    return (
      <div
        className="h-7 w-44 animate-pulse rounded-full bg-[var(--aethel-surface-tertiary)]"
        aria-hidden
      />
    )
  }

  if (!data?.success || !data.dualPool) return null

  const fastPct = poolUsagePercent(data.dualPool.fast.used, data.dualPool.fast.limit)
  const premPct = poolUsagePercent(data.dualPool.premium.used, data.dualPool.premium.limit)
  const walletUsd = creditsToUsd(data.wallet?.balance ?? 0)
  const paygAccrued = (data.payg?.accruedUsdCents ?? 0) / 100
  const extraUsd = walletUsd + paygAccrued
  const label = formatAiUsageStatusChip({ fastPct, premPct, extraUsd })

  return (
    <Link
      href="/billing?tab=usage"
      title="Open AI usage"
      className="inline-flex max-w-[min(100%,280px)] items-center truncate rounded-full border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-1 font-mono text-[10px] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-info)] hover:text-[var(--aethel-text-primary)]"
    >
      {label}
    </Link>
  )
}

export default AiUsageStatusChip
