'use client'

import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'
import type { CreatorEarningsSummary } from '@/lib/marketplace/payouts'
import {
  BalanceCard,
  OverviewCard,
  SalesChart,
  TransactionsHistoryTable,
} from './parts'

const fetcher = async (url: string) => {
  const token = localStorage.getItem('aethel-token')
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to fetch')
  }
  return response.json()
}

export default function CreatorEarningsPage() {
  const { data, error, isLoading, mutate } = useSWR<CreatorEarningsSummary>(
    '/api/marketplace/creator/earnings',
    fetcher
  )

  const maxTxnValue = data?.transactions?.length
    ? Math.max(...data.transactions.map((t) => t.creatorCents))
    : 100

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Marketplace
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Creator Earnings</h1>
            <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
              Fiat Stripe Connect ledger (70/30 store lane). Aethel Coins and in-app Treasury payouts remain
              [HELD].
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => void mutate()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] disabled:cursor-wait"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] p-6 text-sm text-[var(--aethel-text-secondary)]">
            <h3 className="font-semibold text-[var(--aethel-text-primary)]">Failed to load earnings metrics</h3>
            <p className="mt-2">Please ensure you are logged in as a registered marketplace creator.</p>
            <Link
              href="/marketplace/creator/onboarding"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
            >
              Go to Creator Onboarding
            </Link>
          </div>
        ) : null}

        {data ? (
          <div className="grid gap-6 md:grid-cols-3">
            <BalanceCard
              availableCents={data.availableBalanceCents}
              pendingCents={data.pendingBalanceCents}
              currency={data.currency}
              payoutsEnabled={data.payoutsEnabled}
              stripeAccountId={data.stripeAccountId}
            />

            <OverviewCard
              lifetimeEarningsCents={data.lifetimeEarningsCents}
              lifetimeSalesCount={data.lifetimeSalesCount}
              currency={data.currency}
            />

            <SalesChart
              transactions={data.transactions}
              currency={data.currency}
              maxTxnValue={maxTxnValue}
            />

            <TransactionsHistoryTable
              transactions={data.transactions}
              currency={data.currency}
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[var(--aethel-text-tertiary)]" />
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
