'use client'

export function WorkbenchContextBanner({
  show,
  message,
  onDismiss,
}: {
  show: boolean
  message: string | null
  onDismiss: () => void
}) {
  if (!show || !message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-2 border-b border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-100"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded border border-cyan-500/30 px-2 py-0.5 text-[10px] text-cyan-100 hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Dismiss handoff context banner"
      >
        Dismiss
      </button>
    </div>
  )
}
