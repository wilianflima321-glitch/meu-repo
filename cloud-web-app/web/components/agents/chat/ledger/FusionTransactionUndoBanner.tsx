'use client'

/**
 * AI-v1-c / Block 2A.5 / P2f #3 — Fusion undo hint banner (Trava II visible).
 * Undo uses the project-bound FusionScopeStore — never a fresh empty Map.
 * Optional fusionHandoffJson arms server→client revert on mount (Trava II).
 */

import { useEffect, useState } from 'react'
import { handleFusionUndoShortcut } from '@/lib/production/fusion-undo-bridge'
import {
  ensureProjectFusionYjsStore,
  getBoundFusionScopeStore,
} from '@/lib/production/fusion-scope-registry'
import {
  applyFusionTxClientHandoff,
  parseFusionTxClientHandoff,
} from '@/lib/production/fusion-tx-client-handoff'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('FusionTransactionUndoBanner')

interface FusionTransactionUndoBannerProps {
  transactionId?: string | null
  message?: string | null
  projectId?: string | null
  yDocScope?: 'scene' | 'visual-script' | 'sound-cue' | 'quest' | 'behavior-tree' | 'manifest'
  /** Serialized FusionTxClientHandoff from server Apex mission commit. */
  fusionHandoffJson?: string | null
  onDismiss?: () => void
  onUndone?: () => void
}

export function FusionTransactionUndoBanner({
  transactionId,
  message,
  projectId,
  yDocScope = 'manifest',
  fusionHandoffJson,
  onDismiss,
  onUndone,
}: FusionTransactionUndoBannerProps) {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'unavailable'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [handoffArmed, setHandoffArmed] = useState(false)

  useEffect(() => {
    if (!projectId || !fusionHandoffJson || handoffArmed) return
    try {
      const handoff = parseFusionTxClientHandoff(fusionHandoffJson)
      const store = ensureProjectFusionYjsStore(projectId)
      const applied = applyFusionTxClientHandoff(handoff, store)
      if (applied.ok) {
        setHandoffArmed(true)
        log.info('fusion_banner_handoff_armed', {
          transactionId: applied.transactionId,
          projectId,
        })
        // J.9: auto-attach viewport WebM/PNG after FusionTx client handoff (honest HELD if unavailable).
        void import('@/lib/production/visual-evidence-auto-attach').then(({ autoAttachViewportVisualEvidenceAfterApply }) =>
          autoAttachViewportVisualEvidenceAfterApply({
            label: applied.transactionId,
            afterPatch: handoff.afterPayload,
          }).then((attach) => {
            log.info('fusion_banner_visual_evidence', {
              status: attach.visual.status,
              kind: attach.visual.kind,
              webmHeld: attach.visual.webmHeld,
              attachedImplemented: attach.attachedImplemented,
            })
          }),
        )
      } else {
        log.warn('fusion_banner_handoff_arm_fail', { reason: applied.reason, projectId })
      }
    } catch (err) {
      log.warn('fusion_banner_handoff_parse_fail', {
        err: err instanceof Error ? err.message : String(err),
        projectId,
      })
    }
  }, [projectId, fusionHandoffJson, handoffArmed])

  if (!transactionId) return null

  const storeBound = Boolean(projectId && getBoundFusionScopeStore(projectId))
  const canAttemptUndo = Boolean(projectId) && storeBound && status !== 'done'

  const onUndo = () => {
    if (!projectId || !storeBound || status === 'working' || status === 'done') return
    setStatus('working')
    setError(null)
    void handleFusionUndoShortcut({
      projectId,
      yDocScope,
    }).then((result) => {
      if (result.ok) {
        setStatus('done')
        onUndone?.()
        log.info('fusion_banner_undo_ok', { action: result.action, transactionId })
        return
      }
      setStatus('unavailable')
      setError(
        result.reason === 'no_store'
          ? 'Undo unavailable — fusion scope is not bound to a Yjs store for this project.'
          : result.reason === 'no_reversible_fusion_state'
            ? 'Nothing left to revert for this fusion transaction.'
            : `Undo failed: ${result.reason}`,
      )
      log.warn('fusion_banner_undo_fail', { reason: result.reason, transactionId })
    })
  }

  const honestyMessage =
    !projectId
      ? 'Fusion tx recorded. Undo requires a project-bound Yjs fusion store (not wired for this surface).'
      : !storeBound
        ? 'Fusion tx recorded. Ctrl+Z is held until a Yjs fusion scope is bound for this project — will not fake a successful undo.'
        : message ||
          'Ctrl+Z / Cmd+Z reverts this AI edit atomically via CreativeFusionTransaction on the bound Yjs scope.'

  return (
    <div className="mx-4 mb-2 flex items-start justify-between gap-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-2">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-info-light)]">
          Creative Fusion Undo
        </div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
          {status === 'done' ? 'Reverted atomically on the bound fusion scope.' : honestyMessage}
        </p>
        {error && (
          <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-error)]" role="alert">
            {error}
          </p>
        )}
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          tx:{transactionId}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {canAttemptUndo && (
          <button
            type="button"
            onClick={onUndo}
            disabled={status === 'working'}
            className="text-[11px] font-medium text-[var(--aethel-info-light)] underline-offset-2 hover:underline disabled:opacity-50"
          >
            {status === 'working' ? 'Undoing…' : 'Undo now'}
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
