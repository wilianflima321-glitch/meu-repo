import { DollarSign, ShieldCheck, Wallet, ArrowUpRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { SaleTransaction } from '@/lib/marketplace/payouts'

export const formatCents = (cents: number, currency = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function BalanceCard({
  availableCents,
  pendingCents,
  currency,
  payoutsEnabled,
  stripeAccountId,
  requestingPayout,
  onRequestPayout
}: {
  availableCents: number
  pendingCents: number
  currency: string
  payoutsEnabled: boolean
  stripeAccountId: string | null
  requestingPayout: boolean
  onRequestPayout: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-8 shadow-2xl md:col-span-2">
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[var(--aethel-success)] opacity-5 blur-[80px]" />
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-secondary)] px-2.5 py-0.5 text-xs text-[var(--aethel-text-tertiary)]">
            <Wallet className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
            Available Balance
          </div>
          <div className="mt-4 text-4xl font-bold md:text-5xl">
            {formatCents(availableCents, currency)}
          </div>
          <div className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
            Pending clearance: {formatCents(pendingCents, currency)}
          </div>
        </div>

        <button
          type="button"
          onClick={onRequestPayout}
          disabled={requestingPayout || availableCents <= 0 || !payoutsEnabled}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-success)] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestingPayout ? 'Processing...' : 'Request Payout'}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-8 border-t border-[var(--aethel-border-secondary)] pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--aethel-success)]" />
            <div>
              <p className="text-sm font-semibold">Stripe Express Account</p>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">
                {stripeAccountId ? `Connected (${stripeAccountId})` : 'Not Connected'}
              </p>
            </div>
          </div>

          <Link
            href="/marketplace/creator/onboarding"
            className="text-xs font-semibold text-[var(--aethel-primary-light)] hover:underline"
          >
            Manage Connect Setup
          </Link>
        </div>
      </div>
    </div>
  )
}

export function OverviewCard({
  lifetimeEarningsCents,
  lifetimeSalesCount,
  currency
}: {
  lifetimeEarningsCents: number
  lifetimeSalesCount: number
  currency: string
}) {
  return (
    <div className="rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-6 flex flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Overview</span>
          <TrendingUp className="h-5 w-5 text-[var(--aethel-primary-light)]" />
        </div>

        <div className="space-y-4">
          <div>
            <dt className="text-xs text-[var(--aethel-text-tertiary)]">Lifetime Earnings</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {formatCents(lifetimeEarningsCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--aethel-text-tertiary)]">Total Units Sold</dt>
            <dd className="mt-1 text-2xl font-semibold">{lifetimeSalesCount} units</dd>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[var(--aethel-border-secondary)] p-3 text-xs text-[var(--aethel-text-tertiary)]">
        Aethel splits revenue 70% to creator and 30% to platform on all asset sales.
      </div>
    </div>
  )
}

export function SalesChart({
  transactions,
  currency,
  maxTxnValue
}: {
  transactions: SaleTransaction[]
  currency: string
  maxTxnValue: number
}) {
  return (
    <div className="rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-6 md:col-span-3">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-[var(--aethel-success)]" />
        Sales Distribution
      </h2>
      {transactions.length > 0 ? (
        <div className="flex h-40 items-end gap-3 pt-6 border-b border-[var(--aethel-border-secondary)] px-4">
          {transactions.slice(0, 10).reverse().map((txn) => {
            const heightPercent = Math.max(10, (txn.creatorCents / maxTxnValue) * 100)
            return (
              <div key={txn.id} className="group relative flex flex-1 flex-col items-center">
                <div className="absolute bottom-full mb-2 hidden rounded bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] font-mono group-hover:block whitespace-nowrap z-10">
                  {formatCents(txn.creatorCents, currency)}
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-[var(--aethel-primary)] to-[var(--aethel-primary-light)] opacity-85 transition hover:opacity-100 shadow-[0_0_15px_rgba(var(--aethel-primary-rgb),0.3)]"
                />
                <span className="mt-2 text-[8px] text-[var(--aethel-text-tertiary)] truncate w-full text-center">
                  {new Date(txn.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--aethel-text-tertiary)]">
          No sales transactions yet.
        </div>
      )}
    </div>
  )
}

export function TransactionsHistoryTable({
  transactions,
  currency
}: {
  transactions: SaleTransaction[]
  currency: string
}) {
  return (
    <div className="rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-6 md:col-span-3">
      <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--aethel-border-secondary)] text-xs text-[var(--aethel-text-tertiary)] uppercase tracking-wider">
              <th className="pb-3 pr-4 font-semibold">Item</th>
              <th className="pb-3 pr-4 font-semibold">Buyer</th>
              <th className="pb-3 pr-4 font-semibold text-right">Price</th>
              <th className="pb-3 pr-4 font-semibold text-right">Your Share (70%)</th>
              <th className="pb-3 pr-4 font-semibold text-right">Platform Fee (30%)</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--aethel-border-secondary)]">
            {transactions.length > 0 ? (
              transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]">
                  <td className="py-3 pr-4 font-medium max-w-xs truncate">{txn.itemTitle}</td>
                  <td className="py-3 pr-4 text-[var(--aethel-text-secondary)]">{txn.buyerEmail}</td>
                  <td className="py-3 pr-4 text-right">{formatCents(txn.amountCents, currency)}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-[var(--aethel-success)]">
                    {formatCents(txn.creatorCents, currency)}
                  </td>
                  <td className="py-3 pr-4 text-right text-[var(--aethel-text-tertiary)]">
                    {formatCents(txn.platformCents, currency)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        txn.status === 'cleared'
                          ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]'
                          : 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
                      }`}
                    >
                      {txn.status}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--aethel-text-tertiary)] whitespace-nowrap">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
