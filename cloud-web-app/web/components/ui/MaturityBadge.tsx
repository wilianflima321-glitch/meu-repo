import { resolveMaturityBadge, resolveMaturityBadgeForPath } from '@/lib/routes/maturity-badge-resolver'
import type { MaturityLevel } from '@/lib/routes/route-maturity-registry'

type MaturityBadgeProps = {
  path?: string
  maturity?: MaturityLevel
  compact?: boolean
}

/**
 * Block 7B.4 — maturity / [HELD] chrome for ASPIRATIONAL + incomplete routes.
 */
export function MaturityBadge({ path, maturity, compact = false }: MaturityBadgeProps) {
  const badge = maturity
    ? resolveMaturityBadge(maturity)
    : path
      ? resolveMaturityBadgeForPath(path)
      : null

  if (!badge) return null

  return (
    <span
      className={`${badge.className} inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]`}
      title={badge.title}
    >
      {compact ? badge.compactLabel : badge.label}
    </span>
  )
}

export default MaturityBadge
