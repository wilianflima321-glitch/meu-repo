export function getBiasLabel(score?: number | null) {
  if (score === null || score === undefined) return 'No score'
  if (score >= 0.7) return 'High bias'
  if (score >= 0.4) return 'Medium bias'
  return 'Low bias'
}

export function getBiasColor(score?: number | null) {
  if (score === null || score === undefined) return 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)]'
  if (score >= 0.7) return 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]'
  if (score >= 0.4) return 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
  return 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]'
}

export const statusLabels: Record<string, string> = {
  pending: 'pending',
  resolved: 'resolved',
}
