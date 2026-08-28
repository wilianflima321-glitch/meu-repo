export default function HubLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--aethel-surface-primary)]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--aethel-border-subtle)] border-t-[var(--aethel-primary)]"
          role="status"
          aria-label="Loading Creative Studio Hub…"
        />
        <p className="text-sm text-[var(--aethel-text-secondary)]">Loading Creative Studio Hub…</p>
      </div>
    </div>
  )
}
