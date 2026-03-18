import type { ElementType } from 'react'
import { cn } from '@/lib/utils'
import { AdminMetricCard } from './AdminMetricCard'

type SummaryItem = {
  icon: ElementType
  label: string
  value: string | number
  valuePrefix?: string
  valueSuffix?: string
  subValue?: string
  tone?: 'default' | 'success' | 'warning' | 'error' | 'info'
  alert?: boolean
}

interface AdminSummaryGridProps {
  items: SummaryItem[]
  columns?: 2 | 3 | 4 | 5
  className?: string
}

const GRID_COLUMNS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
}

export function AdminSummaryGrid({ items, columns = 4, className }: AdminSummaryGridProps) {
  return (
    <div className={cn('grid gap-4', GRID_COLUMNS[columns] || GRID_COLUMNS[4], className)}>
      {items.map((item, index) => (
        <AdminMetricCard
          key={`${item.label}-${index}`}
          icon={item.icon}
          label={item.label}
          value={item.value}
          valuePrefix={item.valuePrefix}
          valueSuffix={item.valueSuffix}
          subValue={item.subValue}
          tone={item.tone}
          alert={item.alert}
        />
      ))}
    </div>
  )
}
