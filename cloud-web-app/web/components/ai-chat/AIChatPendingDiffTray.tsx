'use client'

import type { ChatDiffFile } from '@/lib/ai/ai-apply-bridge'

interface AIChatPendingDiffTrayProps {
  pendingDiff: ChatDiffFile
  onOpenDiff: () => void
  onAcceptDiff: () => void
  onRejectDiff: () => void
}

function getChangedLineCount(pendingDiff: ChatDiffFile): number {
  return pendingDiff.lines.filter((line) => line.type === 'added' || line.type === 'removed').length
}

function getShortPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length > 0 ? segments[segments.length - 1] : path
}

export function AIChatPendingDiffTray({
  pendingDiff,
  onOpenDiff,
  onAcceptDiff,
  onRejectDiff,
}: AIChatPendingDiffTrayProps) {
  const changedLineCount = getChangedLineCount(pendingDiff)
  const fileLabel = getShortPath(pendingDiff.path)

  return (
    <div className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent)] px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-text-muted)]">
            Pending edit review
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--aethel-text-primary)]">
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5 font-medium">
              {fileLabel}
            </span>
            <span className="text-[var(--aethel-text-secondary)]">{changedLineCount} changed lines ready to review</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenDiff}
            className="rounded-md border border-[var(--aethel-border-primary)] px-3 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-strong)] hover:text-[var(--aethel-text-primary)]"
          >
            Open diff
          </button>
          <button
            type="button"
            onClick={onRejectDiff}
            className="rounded-md border border-[var(--aethel-border-primary)] px-3 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-strong)] hover:text-[var(--aethel-text-primary)]"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onAcceptDiff}
            className="rounded-md bg-[var(--aethel-accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--aethel-text-on-accent)] transition-opacity hover:opacity-90"
          >
            Apply now
          </button>
        </div>
      </div>
    </div>
  )
}
