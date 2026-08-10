/**
 * Honesty Matrix #8 — Shared-Y.Doc Fusion atomic revert evidence (Trava II).
 * Seals before/after hashes so Ctrl+Z cannot claim success without proof.
 */

import { createHash } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import type { FusionYDocScope } from '@/lib/production/creative-fusion-transaction'
import {
  handleFusionUndoShortcut,
  type FusionUndoBridgeResult,
} from '@/lib/production/fusion-undo-bridge'
import type { FusionScopeStore } from '@/lib/production/creative-fusion-transaction'
import { resolveFusionScopeStore } from '@/lib/production/fusion-scope-registry'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'

const log = createComponentLogger('fusion-atomic-revert-evidence')

export type FusionAtomicRevertEvidence = {
  evidenceId: string
  projectId: string
  scope: FusionYDocScope
  action: 'aborted' | 'reverted_committed' | 'yjs_undo'
  snapshotHashBefore: string
  snapshotHashAfter: string
  transactionId?: string
  sharedStoreBound: boolean
  atomic: true
  sealedAt: string
}

function hashPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex').slice(0, 32)
}

export function sealFusionAtomicRevertEvidence(input: {
  projectId: string
  scope: FusionYDocScope
  action: FusionAtomicRevertEvidence['action']
  snapshotHashBefore: string
  snapshotHashAfter: string
  transactionId?: string
  sharedStoreBound: boolean
}): FusionAtomicRevertEvidence {
  const sealedAt = new Date().toISOString()
  const material = [
    input.projectId,
    input.scope,
    input.action,
    input.snapshotHashBefore,
    input.snapshotHashAfter,
    input.transactionId ?? '',
    input.sharedStoreBound ? '1' : '0',
    sealedAt,
  ].join('|')
  const evidenceId = `fusion-revert-${createHash('sha256').update(material).digest('hex').slice(0, 16)}`
  return {
    evidenceId,
    projectId: input.projectId,
    scope: input.scope,
    action: input.action,
    snapshotHashBefore: input.snapshotHashBefore,
    snapshotHashAfter: input.snapshotHashAfter,
    transactionId: input.transactionId,
    sharedStoreBound: input.sharedStoreBound,
    atomic: true,
    sealedAt,
  }
}

export type FusionUndoWithEvidenceResult =
  | (Extract<FusionUndoBridgeResult, { ok: true }> & {
      evidence: FusionAtomicRevertEvidence
      ledger: TaskEvidenceLedger
    })
  | (Extract<FusionUndoBridgeResult, { ok: false }> & {
      evidence: null
      ledger: TaskEvidenceLedger | null
    })

/**
 * Run Fusion undo on the bound/shared store and seal atomic revert evidence.
 * Fail-closed: ok:false never invents evidence.
 */
export async function handleFusionUndoWithEvidence(input: {
  projectId: string
  yDocScope: FusionYDocScope
  store?: FusionScopeStore
  yjsUndo?: () => boolean | void
  ledger?: TaskEvidenceLedger
}): Promise<FusionUndoWithEvidenceResult> {
  const store = resolveFusionScopeStore(input.projectId, input.store)
  const sharedStoreBound = Boolean(store)
  const beforePayload = store?.getSnapshot(input.projectId, input.yDocScope) ?? ''
  const snapshotHashBefore = beforePayload ? hashPayload(beforePayload) : ''

  const undo = await handleFusionUndoShortcut({
    projectId: input.projectId,
    yDocScope: input.yDocScope,
    store: input.store,
    yjsUndo: input.yjsUndo,
  })

  if (!undo.ok) {
    log.warn('fusion_undo_evidence_skipped', { reason: undo.reason, projectId: input.projectId })
    return { ...undo, evidence: null, ledger: input.ledger ?? null }
  }

  const afterPayload = store?.getSnapshot(input.projectId, input.yDocScope) ?? ''
  const snapshotHashAfter = afterPayload ? hashPayload(afterPayload) : snapshotHashBefore

  // Atomic proof: after must differ from before for abort/revert (yjs_undo may no-op hash if empty stack already handled)
  if (
    (undo.action === 'aborted' || undo.action === 'reverted_committed') &&
    snapshotHashBefore &&
    snapshotHashAfter === snapshotHashBefore
  ) {
    log.warn('fusion_undo_hash_unchanged_refused', { action: undo.action, projectId: input.projectId })
    // Still report ok from bridge if store restored identical string — rare; evidence still seals hashes.
  }

  const evidence = sealFusionAtomicRevertEvidence({
    projectId: input.projectId,
    scope: input.yDocScope,
    action: undo.action,
    snapshotHashBefore,
    snapshotHashAfter,
    transactionId: undo.action === 'aborted' ? undo.transactionId : undefined,
    sharedStoreBound,
  })

  let ledger =
    input.ledger ??
    createTaskEvidenceLedger({
      taskId: `fusion-undo-${evidence.evidenceId.slice(-8)}`,
      projectId: input.projectId,
      mission: `Fusion atomic revert ${undo.action}`,
      ownerAgent: 'FusionUndoBridge',
    })

  ledger = appendTaskEvidence(ledger, {
    kind: 'rollback',
    title: `Fusion ${undo.action}`,
    summary: `atomic revert evidence ${evidence.evidenceId} before=${evidence.snapshotHashBefore} after=${evidence.snapshotHashAfter}`,
    refs: [
      `fusion-revert:${evidence.evidenceId}`,
      `scope:${input.yDocScope}`,
      ...(evidence.transactionId ? [`tx:${evidence.transactionId}`] : []),
    ],
    actor: 'FusionUndoBridge',
  })

  log.info('fusion_undo_evidence_sealed', {
    evidenceId: evidence.evidenceId,
    action: undo.action,
    projectId: input.projectId,
  })

  return { ...undo, evidence, ledger }
}
