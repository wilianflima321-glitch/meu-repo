type IdeSettingsHeaderProps = {
  lastUpdated: Date | null
  onRefresh: () => void
  onExport: () => void
}

export function IdeSettingsHeader({ lastUpdated, onRefresh, onExport }: IdeSettingsHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Global IDE settings</h1>
        <p className="text-sm text-[var(--aethel-text-tertiary)]">Control themes, AI, extensions, and policies for the whole platform.</p>
        {lastUpdated ? <p className="text-xs text-[var(--aethel-text-tertiary)]">Updated at {lastUpdated.toLocaleString()}</p> : null}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
        >
          Refresh
        </button>
        <button type="button" onClick={onExport} className="rounded bg-[var(--aethel-surface-primary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)]">
          Export JSON
        </button>
      </div>
    </div>
  )
}
