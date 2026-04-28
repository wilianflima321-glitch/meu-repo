'use client'

import { Sparkles } from 'lucide-react'

import { MonacoChatDiffPanel } from '@/components/ide/MonacoChatDiffPanel'
import type { ChatDiffFile } from '@/lib/ai/ai-apply-bridge'

interface AIChatProposalPreviewProps {
  pendingDiff: ChatDiffFile
  onAcceptDiff: (finalModified: string) => void
  onRejectDiff: () => void
}

function getChangedLineCount(pendingDiff: ChatDiffFile): number {
  return pendingDiff.lines.filter((line) => line.type === 'added' || line.type === 'removed').length
}

function getShortPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length > 0 ? segments[segments.length - 1] : path
}

export function AIChatProposalPreview({
  pendingDiff,
  onAcceptDiff,
  onRejectDiff,
}: AIChatProposalPreviewProps) {
  const changedLineCount = getChangedLineCount(pendingDiff)

  return (
    <section className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_94%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_100%,transparent))]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
            <Sparkles className="h-3.5 w-3.5" />
            AI proposal preview
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--aethel-text-primary)]">
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_74%,transparent)] px-2.5 py-1 font-medium">
              {getShortPath(pendingDiff.path)}
            </span>
            <span className="text-[var(--aethel-text-secondary)]">
              {changedLineCount} changed lines ready before apply
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--aethel-text-tertiary)]">
            Review the exact patch in the same AI lane before promoting it into the editor. This keeps the
            proposal loop closer to the artifact and closer to the benchmark we want.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-hidden rounded-[20px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] shadow-[0_18px_56px_rgba(2,6,23,0.24)]">
          <MonacoChatDiffPanel
            filePath={pendingDiff.path}
            original={pendingDiff.oldContent}
            modified={pendingDiff.newContent}
            onAcceptAll={onAcceptDiff}
            onReject={onRejectDiff}
          />
        </div>
      </div>
    </section>
  )
}
