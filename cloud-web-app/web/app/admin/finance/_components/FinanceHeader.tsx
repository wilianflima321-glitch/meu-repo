import { RefreshCw } from 'lucide-react'

import type { FinanceDateRange } from './finance-types'

const DATE_RANGES: FinanceDateRange[] = ['today', '7d', '30d', 'mtd']
const DATE_RANGE_LABELS: Record<FinanceDateRange, string> = {
  today: 'Today',
  '7d': '7D',
  '30d': '30D',
  mtd: 'MTD',
}

type FinanceHeaderProps = {
  dateRange: FinanceDateRange
  autoRefresh: boolean
  onDateRangeChange: (range: FinanceDateRange) => void
  onToggleAutoRefresh: () => void
}

export function FinanceHeader({ dateRange, autoRefresh, onDateRangeChange, onToggleAutoRefresh }: FinanceHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-[var(--aethel-text-primary)]">Financial health</h1>
        <p className="text-sm text-[var(--aethel-text-tertiary)]">MRR, costs, margin, and profitability signals.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-1">
          {DATE_RANGES.map((range) => (
            <button
              type="button"
              key={range}
              onClick={() => onDateRangeChange(range)}
              className={`rounded px-3 py-1 text-xs ${
                dateRange === range ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {DATE_RANGE_LABELS[range]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleAutoRefresh}
          className={`rounded-lg border p-2 ${
            autoRefresh
              ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/10 text-[var(--aethel-success)]'
              : 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-tertiary)]'
          }`}
          aria-label={autoRefresh ? 'Automatic refresh on' : 'Automatic refresh off'}
        >
          <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
