import { PAYMENT_STATUS_LABELS } from './use-payments-page-state'
import type { PaymentItem } from './payments-types'

export function PaymentsTable({ items, loading }: { items: PaymentItem[]; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] shadow">
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-sm">
            <th className="p-2">ID</th>
            <th className="p-2">User</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Status</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="p-2 text-sm text-[var(--aethel-text-tertiary)]" colSpan={5}>Loading payments...</td></tr>
          ) : items.length === 0 ? (
            <tr><td className="p-2 text-sm text-[var(--aethel-text-tertiary)]" colSpan={5}>No payments found.</td></tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2 text-xs text-[var(--aethel-text-tertiary)]">{item.id.slice(-6)}</td>
                <td className="p-2">{item.userEmail || '-'}</td>
                <td className="p-2">{item.currency.toUpperCase()} {item.amount.toFixed(2)}</td>
                <td className="p-2"><PaymentStatusPill status={item.status} /></td>
                <td className="p-2">{new Date(item.createdAt).toLocaleDateString('en-US')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function PaymentStatusPill({ status }: { status: string }) {
  const tone = status === 'succeeded' ? 'success' : status === 'pending' ? 'warning' : 'error'
  const classes = {
    success: 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]',
    warning: 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]',
    error: 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]',
  }[tone]
  return <span className={`rounded px-2 py-1 text-xs ${classes}`}>{PAYMENT_STATUS_LABELS[status] ?? status}</span>
}
