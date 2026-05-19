type BiasHeaderProps = {
  lastUpdated: Date | null
  onRefresh: () => void
}

export function BiasHeader({ lastUpdated, onRefresh }: BiasHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Bias and ethics detection</h1>
        {lastUpdated ? <p className="text-xs text-[var(--aethel-text-tertiary)]">Updated {lastUpdated.toLocaleString()}</p> : null}
      </div>
      <button type="button" onClick={onRefresh} className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]">
        Refresh
      </button>
    </div>
  )
}
