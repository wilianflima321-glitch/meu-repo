'use client'

/**
 * AI-v1-c / Block 2A.5 — Fusion undo hint banner (Trava II visible).
 */

import { handleFusionUndoShortcut } from '@/lib/production/fusion-undo-bridge'
import { createMemoryFusionScopeStore } from '@/lib/production/creative-fusion-transaction'

interface FusionTransactionUndoBannerProps {
  transactionId?: string | null
  message?: string | null
  projectId?: string | null
  onDismiss?: () => void
}

export function FusionTransactionUndoBanner({
  transactionId,
  message,
  projectId,
  onDismiss,
}: FusionTransactionUndoBannerProps) {
  if (!transactionId) return null

  const onUndo = () => {
    if (!projectId) return
    void handleFusionUndoShortcut({
      projectId,
      yDocScope: 'manifest',
      store: createMemoryFusionScopeStore(),
    })
  }

  return (
    <div className="mx-4 mb-2 flex items-start justify-between gap-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-2">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-info-light)]">
          Creative Fusion Undo
        </div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
          {message ||
            'Ctrl+Z / Cmd+Z reverts this AI edit atomically via CreativeFusionTransaction.'}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          tx:{transactionId}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {projectId && (
          <button
            type="button"
            onClick={onUndo}
            className="text-[11px] font-medium text-[var(--aethel-info-light)] underline-offset-2 hover:underline"
          >
            Undo now
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] text-[var(--aethel-text-tertiary)] underline-offset-2 hover:text-[var(--aethel-text-secondary)] hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
