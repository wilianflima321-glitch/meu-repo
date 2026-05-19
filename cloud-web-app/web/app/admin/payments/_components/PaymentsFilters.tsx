import { PAYMENT_STATUS_LABELS } from './use-payments-page-state'
import type { PaymentStatusFilter } from './payments-types'

export function PaymentsFilters({
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: {
  search: string
  statusFilter: PaymentStatusFilter
  onSearchChange: (value: string) => void
  onStatusChange: (value: PaymentStatusFilter) => void
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow md:flex-row md:items-center md:justify-between">
      <input type="text" placeholder="Search by email or ID" value={search} onChange={(event) => onSearchChange(event.target.value)} className="w-full rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] p-2 text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] md:max-w-sm" />
      <div className="flex items-center gap-2">
        {(['all', 'succeeded', 'pending', 'failed'] as const).map((status) => (
          <button type="button" key={status} onClick={() => onStatusChange(status)} className={`rounded px-3 py-1 text-xs font-semibold ${statusFilter === status ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'}`}>
            {status === 'all' ? 'All' : PAYMENT_STATUS_LABELS[status] ?? status}
          </button>
        ))}
      </div>
    </div>
  )
}
