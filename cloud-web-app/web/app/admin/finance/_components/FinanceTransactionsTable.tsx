import { CreditCard, Download } from 'lucide-react'

import type { FinanceMetrics } from './finance-types'

const typeColors: Record<FinanceMetrics['recentTransactions'][number]['type'], string> = {
  revenue: 'text-[var(--aethel-success)]',
  cost: 'text-[var(--aethel-warning)]',
  refund: 'text-[var(--aethel-error)]',
}

const typeLabels: Record<FinanceMetrics['recentTransactions'][number]['type'], string> = {
  revenue: 'Revenue',
  cost: 'Cost',
  refund: 'Refund',
}

export function FinanceTransactionsTable({ transactions }: { transactions: FinanceMetrics['recentTransactions'] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-secondary)] p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
          <CreditCard className="h-4 w-4" />
          Recent transactions
        </h3>
        <button type="button" className="flex items-center gap-1 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
          <Download className="h-3 w-3" />
          Export
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--aethel-border-secondary)]">
              <th className="px-4 py-2 text-left text-xs font-normal text-[var(--aethel-text-tertiary)]">Type</th>
              <th className="px-4 py-2 text-left text-xs font-normal text-[var(--aethel-text-tertiary)]">User</th>
              <th className="px-4 py-2 text-left text-xs font-normal text-[var(--aethel-text-tertiary)]">Description</th>
              <th className="px-4 py-2 text-right text-xs font-normal text-[var(--aethel-text-tertiary)]">Amount</th>
              <th className="px-4 py-2 text-right text-xs font-normal text-[var(--aethel-text-tertiary)]">Time</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]/50">
                <td className="px-4 py-2"><span className={typeColors[transaction.type]}>{typeLabels[transaction.type]}</span></td>
                <td className="px-4 py-2"><span className="text-[var(--aethel-text-secondary)]">{transaction.userEmail ?? 'system'}</span></td>
                <td className="px-4 py-2"><span className="text-[var(--aethel-text-tertiary)]">{transaction.description}</span></td>
                <td className="px-4 py-2 text-right">
                  <span className={transaction.type === 'cost' || transaction.type === 'refund' ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-success)]'}>
                    {transaction.type === 'cost' || transaction.type === 'refund' ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-[var(--aethel-text-tertiary)]">{new Date(transaction.createdAt ?? transaction.timestamp).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
