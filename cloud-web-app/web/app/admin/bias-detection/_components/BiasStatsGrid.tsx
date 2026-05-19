import type { BiasStats } from './bias-types'

const STAT_CARDS = [
  { key: 'total', label: 'Total audits', className: 'text-[var(--aethel-primary)]' },
  { key: 'highBias', label: 'High bias', className: 'text-[var(--aethel-error)]' },
  { key: 'mediumBias', label: 'Medium bias', className: 'text-[var(--aethel-warning)]' },
  { key: 'lowBias', label: 'Low bias', className: 'text-[var(--aethel-success)]' },
  { key: 'pending', label: 'Pending', className: 'text-[var(--aethel-text-secondary)]' },
] as const

export function BiasStatsGrid({ stats }: { stats: BiasStats }) {
  return (
    <div className="mb-6 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
      <h2 className="mb-4 text-lg font-semibold">Ethics reports</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="text-center">
            <h3 className="text-sm font-semibold">{card.label}</h3>
            <p className={`text-2xl font-bold ${card.className}`}>{stats[card.key]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
