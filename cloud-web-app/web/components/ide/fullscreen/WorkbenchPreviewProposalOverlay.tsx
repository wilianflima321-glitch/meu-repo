'use client'

import { Eye, Sparkles, Wand2, X } from 'lucide-react'

import type { ChatDiffFile } from '@/lib/ai/ai-apply-bridge'

type WorkbenchPreviewProposalOverlayProps = {
  pendingDiff: ChatDiffFile
  canPreviewArtifact: boolean
  isPreviewingProposal: boolean
  onOpenReview: () => void
  onTogglePreview: () => void
  onApply: () => void
  onReject: () => void
}

function getChangedLineCount(pendingDiff: ChatDiffFile): number {
  return pendingDiff.lines.filter((line) => line.type === 'added' || line.type === 'removed').length
}

function getShortPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length > 0 ? segments[segments.length - 1] : path
}

export function WorkbenchPreviewProposalOverlay({
  pendingDiff,
  canPreviewArtifact,
  isPreviewingProposal,
  onOpenReview,
  onTogglePreview,
  onApply,
  onReject,
}: WorkbenchPreviewProposalOverlayProps) {
  const changedLineCount = getChangedLineCount(pendingDiff)
  const fileLabel = getShortPath(pendingDiff.path)

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 flex w-full max-w-[340px] justify-end">
      <section className="pointer-events-auto overflow-hidden rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-primary)_18%,var(--aethel-border-primary))] bg-[linear-gradient(180deg,rgba(8,11,18,0.96),rgba(8,11,18,0.9))] shadow-[0_28px_84px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <div className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_82%,transparent)] px-4 py-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
            <Sparkles className="h-3.5 w-3.5" />
            AI proposal preview
          </div>
          <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
            {fileLabel}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
            {changedLineCount} changed lines are ready to review before they touch the live artifact.
          </p>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-2.5 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
            {canPreviewArtifact
              ? isPreviewingProposal
                ? 'The viewport is showing the proposed artifact state. Compare it against the live runtime before promoting the patch.'
                : 'Switch the viewport into proposal mode to inspect the pending artifact before it touches the live runtime.'
              : 'Open the matching file in the preview lane to inspect this proposal as an artifact before promoting it.'}
          </div>

          <div className="flex flex-wrap gap-2">
            {canPreviewArtifact ? (
              <button
                type="button"
                onClick={onTogglePreview}
                className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)]"
              >
                <Eye className="h-3.5 w-3.5" />
                {isPreviewingProposal ? 'Back to live' : 'View proposal'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenReview}
              className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]"
            >
              <Eye className="h-3.5 w-3.5" />
              Open review
            </button>
            <button
              type="button"
              onClick={onApply}
              className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-success-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)]"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Apply proposal
            </button>
            <button
              type="button"
              onClick={onReject}
              className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)]"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default WorkbenchPreviewProposalOverlay
