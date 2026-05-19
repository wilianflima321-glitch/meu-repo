import { getMaturityBadge, getRouteMaturityEntry, type MaturityLevel } from '@/lib/routes/route-maturity-registry'

type MaturityBadgeProps = {
  path?: string
  maturity?: MaturityLevel
  compact?: boolean
}

const fallbackLabel: Record<MaturityLevel, string> = {
  GA: '',
  BETA: 'Beta',
  ALPHA: 'Alpha',
  PROTOTYPE: 'Prototype',
  ASPIRATIONAL: 'Labs',
}

export function MaturityBadge({ path, maturity, compact = false }: MaturityBadgeProps) {
  const resolvedMaturity = maturity ?? (path ? getRouteMaturityEntry(path)?.maturity : undefined)

  if (!resolvedMaturity || resolvedMaturity === 'GA') return null

  const badge = getMaturityBadge(resolvedMaturity)
  const label = badge.label || fallbackLabel[resolvedMaturity]

  return (
    <span
      className={`${badge.color} inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]`}
      title={`${label} maturity surface`}
    >
      {compact ? label.slice(0, 1) : label}
    </span>
  )
}

export default MaturityBadge
