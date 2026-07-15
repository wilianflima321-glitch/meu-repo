import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'warning' | 'error' | 'info'
type TrendTone = 'positive' | 'negative'

export interface AdminMetricCardProps {
  icon: ElementType
  label: string
  value: string | number
  valuePrefix?: string
  valueSuffix?: string
  subValue?: string
  delta?: number
  trend?: 'up' | 'down'
  trendTone?: TrendTone
  tone?: Tone
  alert?: boolean
  className?: string
}

const toneStyles: Record<Tone, { bg: string; border: string; value: string; icon: string }> = {
  default: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]',
    border: 'border-[var(--aethel-border-secondary)]',
    value: 'text-[var(--aethel-text-primary)]',
    icon: 'text-[var(--aethel-text-secondary)]',
  },
  success: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]',
    value: 'text-[var(--aethel-success)]',
    icon: 'text-[var(--aethel-success-light)]',
  },
  warning: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]',
    value: 'text-[var(--aethel-warning)]',
    icon: 'text-[var(--aethel-warning-light)]',
  },
  error: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
    value: 'text-[var(--aethel-error)]',
    icon: 'text-[var(--aethel-error-light)]',
  },
  info: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
    value: 'text-[var(--aethel-info)]',
    icon: 'text-[var(--aethel-info-light)]',
  },
}

function formatValue(value: string | number): string | number {
  if (typeof value !== 'number') return value
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function trendColor(trend: 'up' | 'down', tone: TrendTone) {
  if (tone === 'negative') {
    return trend === 'up' ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-success)]'
  }
  return trend === 'up' ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]'
}

export function AdminMetricCard({
  icon: Icon,
  label,
  value,
  valuePrefix = '',
  valueSuffix = '',
  subValue,
  delta,
  trend,
  trendTone = 'positive',
  tone = 'default',
  alert = false,
  className,
}: AdminMetricCardProps) {
  const resolvedTone: Tone = alert ? 'error' : tone
  const styles = toneStyles[resolvedTone]
  const displayValue = formatValue(value)

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        styles.bg,
        styles.border,
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--aethel-text-tertiary)] uppercase tracking-wider">{label}</span>
        <Icon className={cn('w-4 h-4', styles.icon)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold', styles.value)}>
          {valuePrefix}
          {displayValue}
          {valueSuffix}
        </span>
        {delta !== undefined && (
          <span className={cn('text-xs flex items-center gap-1', trend ? trendColor(trend, trendTone) : 'text-[var(--aethel-text-tertiary)]')}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {trend && delta === undefined && (
          <span className={cn('text-xs', trendColor(trend, trendTone))}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      {subValue && <p className="text-xs text-[var(--aethel-text-tertiary)] mt-1">{subValue}</p>}
    </div>
  )
}
