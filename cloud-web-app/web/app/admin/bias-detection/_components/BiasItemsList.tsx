import type { BiasFilter, BiasItem, StatusFilter } from './bias-types'
import { getBiasColor, getBiasLabel, statusLabels } from './bias-utils'

type BiasItemsListProps = {
  items: BiasItem[]
  loading: boolean
  search: string
  statusFilter: StatusFilter
  biasFilter: BiasFilter
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: StatusFilter) => void
  onBiasFilterChange: (value: BiasFilter) => void
  onModerationAction: (id: string, action: 'approve' | 'reject') => void
}

export function BiasItemsList(props: BiasItemsListProps) {
  return (
    <div className="rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
      <h2 className="mb-4 text-lg font-semibold">Audited outputs</h2>
      <BiasFilters {...props} />
      {props.loading ? <BiasLoadingRows /> : props.items.length === 0 ? <p className="text-sm text-[var(--aethel-text-tertiary)]">No audit records yet.</p> : <BiasRows items={props.items} onModerationAction={props.onModerationAction} />}
    </div>
  )
}

function BiasFilters(props: BiasItemsListProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <input type="text" placeholder="Search by content" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} className="w-full rounded border p-2 md:max-w-sm" />
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'resolved'] as const).map((status) => <FilterButton key={status} active={props.statusFilter === status} onClick={() => props.onStatusFilterChange(status)}>{status === 'all' ? 'All' : status}</FilterButton>)}
        {(['all', 'high', 'medium', 'low', 'none'] as const).map((bias) => <FilterButton key={bias} active={props.biasFilter === bias} onClick={() => props.onBiasFilterChange(bias)}>{bias === 'all' ? 'All scores' : bias === 'none' ? 'No score' : bias}</FilterButton>)}
      </div>
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded px-3 py-1 text-xs font-semibold ${active ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'}`}>{children}</button>
}

function BiasLoadingRows() {
  return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]" />)}</div>
}

function BiasRows({ items, onModerationAction }: { items: BiasItem[]; onModerationAction: (id: string, action: 'approve' | 'reject') => void }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="border-b p-4">
          <p className="mb-2 text-sm text-[var(--aethel-text-secondary)]">{item.text}</p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-sm text-[var(--aethel-text-secondary)]">
              <span>Bias score: {item.autoScore === null || item.autoScore === undefined ? 'N/A' : `${(item.autoScore * 100).toFixed(1)}%`}</span>
              <span>Status: {statusLabels[item.status] ?? item.status}</span>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-semibold ${getBiasColor(item.autoScore)}`}>{getBiasLabel(item.autoScore)}</span>
          </div>
          {item.autoFlags?.length ? <div className="mt-2 flex flex-wrap gap-2">{item.autoFlags.map((flag) => <span key={flag} className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">{flag}</span>)}</div> : null}
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => onModerationAction(item.id, 'approve')} className="rounded bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] px-3 py-1 text-xs text-[var(--aethel-success)]">Approve</button>
            <button type="button" onClick={() => onModerationAction(item.id, 'reject')} className="rounded bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] px-3 py-1 text-xs text-[var(--aethel-error)]">Reject</button>
          </div>
        </li>
      ))}
    </ul>
  )
}
