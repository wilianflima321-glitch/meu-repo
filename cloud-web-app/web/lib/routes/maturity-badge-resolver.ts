/**
 * Block 7B.4 — Maturity / [HELD] badge resolver for ASPIRATIONAL + incomplete routes.
 * Token classes only (no Tailwind palette hex / blue-500).
 */

import {
  getRouteMaturityEntry,
  type MaturityLevel,
  type RouteEntry,
} from '@/lib/routes/route-maturity-registry'

export type ResolvedMaturityBadge = {
  maturity: MaturityLevel
  label: string
  /** Short chip for compact chrome */
  compactLabel: string
  /** Token-based class string */
  className: string
  /** True when surface must show honest [HELD] / Labs chrome */
  held: boolean
  title: string
}

const TOKEN_CLASSES: Record<Exclude<MaturityLevel, 'GA'>, string> = {
  BETA: 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info)]',
  ALPHA:
    'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]',
  PROTOTYPE:
    'border-[color-mix(in_srgb,var(--aethel-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-accent)_12%,transparent)] text-[var(--aethel-accent)]',
  ASPIRATIONAL:
    'border-[color-mix(in_srgb,var(--aethel-text-tertiary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)] text-[var(--aethel-text-secondary)]',
}

export function resolveMaturityBadge(
  maturity: MaturityLevel,
  notes?: string,
): ResolvedMaturityBadge | null {
  if (maturity === 'GA') return null

  const held = maturity === 'ASPIRATIONAL' || maturity === 'PROTOTYPE'
  const baseLabel =
    maturity === 'ASPIRATIONAL'
      ? '[HELD]'
      : maturity === 'PROTOTYPE'
        ? 'Prototype'
        : maturity === 'ALPHA'
          ? 'Alpha'
          : 'Beta'

  const label = held && maturity === 'ASPIRATIONAL' ? '[HELD]' : baseLabel
  const compactLabel = maturity === 'ASPIRATIONAL' ? 'H' : label.slice(0, 1)

  return {
    maturity,
    label,
    compactLabel,
    className: TOKEN_CLASSES[maturity],
    held,
    title: notes?.trim()
      ? `${label} — ${notes.trim()}`
      : held
        ? `${label} maturity surface — not production-complete`
        : `${label} maturity surface`,
  }
}

export function resolveMaturityBadgeForPath(path: string): ResolvedMaturityBadge | null {
  const entry: RouteEntry | undefined = getRouteMaturityEntry(path)
  if (!entry) return null
  return resolveMaturityBadge(entry.maturity, entry.notes)
}
