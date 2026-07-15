'use client'

/**
 * Block 6H.7 — Usage receipt list (wallet ledger — no invented rows).
 */

import useSWR from 'swr'
import { formatTokenCount } from '@/lib/billing/usage-meter-math'

type Receipt = {
  id: string
  createdAt: string
  entryType: string
  amount: number
  model: string | null
  rawTokens: number | null
  weightedTokens: number | null
  lane: string
}

type ReceiptsResponse = {
  success?: boolean
  receipts?: Receipt[]
  note?: string
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

export function UsageReceiptList() {
  const { data, error, isLoading } = useSWR<ReceiptsResponse>(
    '/api/billing/usage/receipts?limit=50',
    fetcher,
    { refreshInterval: 60_000 },
  )

  if (isLoading && !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-[var(--aethel-surface-tertiary)]" />
  }

  if (error || !data?.success) {
    return (
      <p className="text-sm text-[var(--aethel-text-tertiary)]">
        Could not load receipts. Retry from Usage after signing in.
      </p>
    )
  }

  const rows = data.receipts || []

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Receipts</h3>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            {data.note || 'Wallet ledger — model/lane when recorded on the entry.'}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--aethel-border-primary)] p-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
          No wallet ledger entries yet. Platform pool usage appears here when debit metadata is present.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--aethel-border-primary)]">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-tertiary)]">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 font-medium">Raw</th>
                <th className="px-3 py-2 font-medium">Weighted</th>
                <th className="px-3 py-2 font-medium">Lane</th>
                <th className="px-3 py-2 font-medium">Credits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--aethel-border-primary)]">
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--aethel-text-secondary)]">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--aethel-text-primary)]">
                    {row.model || '—'}
                  </td>
                  <td className="px-3 py-2 text-[var(--aethel-text-secondary)]">
                    {row.rawTokens != null ? formatTokenCount(row.rawTokens) : '—'}
                  </td>
                  <td className="px-3 py-2 text-[var(--aethel-text-secondary)]">
                    {row.weightedTokens != null ? formatTokenCount(row.weightedTokens) : '—'}
                  </td>
                  <td className="px-3 py-2 uppercase tracking-wide text-[var(--aethel-text-tertiary)]">
                    {row.lane}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--aethel-text-primary)]">
                    {row.amount > 0 ? `+${row.amount}` : row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default UsageReceiptList
