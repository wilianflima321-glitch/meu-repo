/**
 * Block 2A.5 — Wire IDE Ctrl+Z to abort open CreativeFusionTransaction + optional Y.UndoManager.
 */

import {
  abortCreativeFusionTransaction,
  findOpenCreativeFusionTransactionForProject,
  type FusionScopeStore,
  type FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('fusion-undo-bridge')

export type FusionUndoBridgeResult =
  | { ok: true; action: 'aborted'; transactionId: string }
  | { ok: true; action: 'yjs_undo' }
  | { ok: false; reason: string }

/**
 * Prefer aborting an open fusion tx for the project/scope; else call yjsUndo().
 */
export async function handleFusionUndoShortcut(input: {
  projectId: string
  yDocScope: FusionYDocScope
  store: FusionScopeStore
  /** Optional Y.UndoManager.undo() */
  yjsUndo?: () => void
}): Promise<FusionUndoBridgeResult> {
  const open = findOpenCreativeFusionTransactionForProject(input.projectId, input.yDocScope)
  if (open && open.status === 'open') {
    await abortCreativeFusionTransaction(open.id, input.store)
    log.info('fusion_undo_aborted_tx', { transactionId: open.id, projectId: input.projectId })
    return { ok: true, action: 'aborted', transactionId: open.id }
  }

  if (input.yjsUndo) {
    input.yjsUndo()
    return { ok: true, action: 'yjs_undo' }
  }

  return { ok: false, reason: 'No open fusion transaction and no Yjs undo handler.' }
}
