/**
 * Block 2A.5 / P2f #3 — Wire IDE Ctrl+Z to real FusionTx abort / post-commit revert.
 * Never report ok:true for a throwaway empty store (theater undo).
 */

import {
  abortCreativeFusionTransaction,
  findOpenCreativeFusionTransactionForProject,
  type FusionScopeStore,
  type FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'
import { resolveFusionScopeStore } from '@/lib/production/fusion-scope-registry'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('fusion-undo-bridge')

export type FusionUndoBridgeResult =
  | { ok: true; action: 'aborted'; transactionId: string }
  | { ok: true; action: 'reverted_committed' }
  | { ok: true; action: 'yjs_undo' }
  | {
      ok: false
      reason:
        | 'no_store'
        | 'no_reversible_fusion_state'
        | 'yjs_undo_empty'
        | string
    }

/**
 * Prefer aborting an open fusion tx for the project/scope; else revert last
 * committed FusionTx on the bound store; else optional Y.UndoManager.undo().
 * Fail-closed when no reversible state exists — never invent success.
 */
export async function handleFusionUndoShortcut(input: {
  projectId: string
  yDocScope: FusionYDocScope
  store?: FusionScopeStore
  /** Optional Y.UndoManager.undo() — only called when it can actually undo */
  yjsUndo?: () => boolean | void
}): Promise<FusionUndoBridgeResult> {
  const store = resolveFusionScopeStore(input.projectId, input.store)
  if (!store) {
    log.warn('fusion_undo_no_store', { projectId: input.projectId, scope: input.yDocScope })
    return { ok: false, reason: 'no_store' }
  }

  const open = findOpenCreativeFusionTransactionForProject(input.projectId, input.yDocScope)
  if (open && open.status === 'open') {
    await abortCreativeFusionTransaction(open.id, store)
    log.info('fusion_undo_aborted_tx', { transactionId: open.id, projectId: input.projectId })
    return { ok: true, action: 'aborted', transactionId: open.id }
  }

  if (store.revertLastCommit?.(input.projectId, input.yDocScope)) {
    log.info('fusion_undo_reverted_committed', {
      projectId: input.projectId,
      scope: input.yDocScope,
    })
    return { ok: true, action: 'reverted_committed' }
  }

  if (input.yjsUndo) {
    const did = input.yjsUndo()
    if (did === false) {
      return { ok: false, reason: 'yjs_undo_empty' }
    }
    return { ok: true, action: 'yjs_undo' }
  }

  // Yjs store may expose its own UndoManager without a callback from the UI.
  const yjsCapable = store as FusionScopeStore & {
    canYjsUndo?: () => boolean
    yjsUndo?: () => boolean
  }
  if (typeof yjsCapable.yjsUndo === 'function') {
    if (yjsCapable.canYjsUndo?.() === false) {
      return { ok: false, reason: 'no_reversible_fusion_state' }
    }
    if (yjsCapable.yjsUndo()) {
      return { ok: true, action: 'yjs_undo' }
    }
  }

  return { ok: false, reason: 'no_reversible_fusion_state' }
}
