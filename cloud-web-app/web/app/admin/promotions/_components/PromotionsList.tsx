import { formatDiscount } from './promotions-utils'
import type { Promotion, PromotionStatusFilter } from './promotions-types'

export function PromotionsList({
  error,
  loading,
  promotions,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onToggle,
}: {
  error: string | null
  loading: boolean
  promotions: Promotion[]
  search: string
  statusFilter: PromotionStatusFilter
  onSearchChange: (value: string) => void
  onStatusChange: (value: PromotionStatusFilter) => void
  onToggle: (promotion: Promotion) => void
}) {
  return (
    <div className="rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
      <h2 className="mb-4 text-lg font-semibold">Promotions</h2>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input type="text" placeholder="Search by name or code" value={search} onChange={(event) => onSearchChange(event.target.value)} className="w-full rounded border p-2 md:max-w-sm" />
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button type="button" key={status} onClick={() => onStatusChange(status)} className={`rounded px-3 py-1 text-xs font-semibold ${statusFilter === status ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'}`}>
              {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>
      <PromotionsListBody error={error} loading={loading} promotions={promotions} onToggle={onToggle} />
    </div>
  )
}

function PromotionsListBody({ error, loading, promotions, onToggle }: { error: string | null; loading: boolean; promotions: Promotion[]; onToggle: (promotion: Promotion) => void }) {
  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]" />)}</div>
  if (error) return <p className="text-sm text-[var(--aethel-error)]">{error}</p>
  if (promotions.length === 0) return <p className="text-sm text-[var(--aethel-text-tertiary)]">No promotion found in Stripe.</p>
  return (
    <ul>
      {promotions.map((promotion) => (
        <li key={promotion.id} className="flex flex-col border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold">{promotion.name}</h3>
            <p className="text-sm text-[var(--aethel-text-secondary)]">Code: {promotion.code || 'N/A'} | Discount: {formatDiscount(promotion)}</p>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Redemptions: {promotion.timesRedeemed || 0} | Expires: {promotion.expiresAt ? new Date(promotion.expiresAt).toLocaleDateString('en-US') : 'No expiration'}</p>
          </div>
          <div className="mt-2 flex items-center gap-2 md:mt-0">
            <span className={`rounded px-2 py-1 text-xs font-semibold ${promotion.active ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'}`}>
              {promotion.active ? 'Active' : 'Inactive'}
            </span>
            <button type="button" onClick={() => onToggle(promotion)} className="rounded bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] px-3 py-1 text-xs text-[var(--aethel-warning-light)]">
              {promotion.active ? 'Deactivate' : 'Activate'}
            </button>
            {promotion.code && <button type="button" onClick={() => navigator.clipboard.writeText(promotion.code || '')} className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">Copy code</button>}
          </div>
        </li>
      ))}
    </ul>
  )
}
