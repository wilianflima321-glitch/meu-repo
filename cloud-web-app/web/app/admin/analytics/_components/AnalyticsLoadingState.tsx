export function AnalyticsLoadingState({ loading }: { loading: boolean }) {
  if (!loading) return null

  return (
    <div className="mb-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-secondary)]">
      <p className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">Loading operational baseline...</p>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
      </div>
    </div>
  )
}
