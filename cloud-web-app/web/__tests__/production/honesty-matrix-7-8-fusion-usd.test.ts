/**
 * Honesty Matrix #8 — Shared-Y.Doc Fusion atomic revert evidence + CW6 creative apply receipt.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import * as Y from 'yjs'

import {
  __resetCreativeFusionTransactionsForTests,
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  recordFusionMutation,
} from '@/lib/production/creative-fusion-transaction'
import {
  handleFusionUndoWithEvidence,
  sealFusionAtomicRevertEvidence,
} from '@/lib/production/fusion-atomic-revert-evidence'
import {
  __resetFusionScopeRegistryForTests,
  ensureProjectFusionYjsStore,
  registerSharedWorkspaceYDoc,
} from '@/lib/production/fusion-scope-registry'
import { sealCreativeApplyFusionReceipt } from '@/lib/production/creative-apply-fusion-receipt'
import type { FileValidationStatusEntry } from '@/lib/production/agent-apply-validation-gate'

describe('Fusion atomic revert evidence (Honesty #8)', () => {
  beforeEach(() => {
    __resetCreativeFusionTransactionsForTests()
    __resetFusionScopeRegistryForTests()
  })

  it('seals evidence id from before/after hashes', () => {
    const evidence = sealFusionAtomicRevertEvidence({
      projectId: 'p1',
      scope: 'manifest',
      action: 'reverted_committed',
      snapshotHashBefore: 'a'.repeat(32),
      snapshotHashAfter: 'b'.repeat(32),
      sharedStoreBound: true,
    })
    expect(evidence.atomic).toBe(true)
    expect(evidence.evidenceId.startsWith('fusion-revert-')).toBe(true)
    expect(evidence.sharedStoreBound).toBe(true)
  })

  it('abort on shared Y.Doc seals atomic revert evidence with hash change', async () => {
    const sharedDoc = new Y.Doc()
    const store = registerSharedWorkspaceYDoc('proj-atomic', sharedDoc)
    store.applySnapshot('proj-atomic', 'scene', JSON.stringify({ entities: ['a'] }))

    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-atomic',
      yDocScope: 'scene',
      store,
    })
    recordFusionMutation(tx.id, store, JSON.stringify({ entities: ['a', 'ai'] }))

    const undo = await handleFusionUndoWithEvidence({
      projectId: 'proj-atomic',
      yDocScope: 'scene',
    })
    expect(undo.ok).toBe(true)
    if (!undo.ok) return
    expect(undo.action).toBe('aborted')
    expect(undo.evidence.atomic).toBe(true)
    expect(undo.evidence.snapshotHashBefore).not.toBe(undo.evidence.snapshotHashAfter)
    expect(undo.evidence.sharedStoreBound).toBe(true)
    expect(undo.ledger.events.some((e) => e.kind === 'rollback')).toBe(true)
    expect(JSON.parse(store.getSnapshot('proj-atomic', 'scene')).entities).toEqual(['a'])
  })

  it('post-commit revert on shared doc seals evidence', async () => {
    const sharedDoc = new Y.Doc()
    registerSharedWorkspaceYDoc('proj-commit', sharedDoc)
    const store = ensureProjectFusionYjsStore('proj-commit')
    store.applySnapshot('proj-commit', 'manifest', JSON.stringify({ entities: ['before'] }))

    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-commit',
      yDocScope: 'manifest',
      store,
    })
    recordFusionMutation(tx.id, store, JSON.stringify({ entities: ['before', 'after'] }))
    await commitCreativeFusionTransaction(tx.id, store)

    const undo = await handleFusionUndoWithEvidence({
      projectId: 'proj-commit',
      yDocScope: 'manifest',
    })
    expect(undo.ok).toBe(true)
    if (!undo.ok) return
    expect(undo.action).toBe('reverted_committed')
    expect(undo.evidence.snapshotHashBefore).not.toBe(undo.evidence.snapshotHashAfter)
    expect(JSON.parse(store.getSnapshot('proj-commit', 'manifest')).entities).toEqual(['before'])
  })

  it('fail-closes evidence when no reversible state', async () => {
    ensureProjectFusionYjsStore('proj-empty')
    const undo = await handleFusionUndoWithEvidence({
      projectId: 'proj-empty',
      yDocScope: 'manifest',
    })
    expect(undo.ok).toBe(false)
    expect(undo.evidence).toBeNull()
  })
})

describe('Creative apply Fusion receipt + CW6 fileValidation (Honesty #8)', () => {
  it('seals write when fileValidation passes and FusionTx present', () => {
    const fileValidation: FileValidationStatusEntry[] = [
      { path: 'src/a.ts', status: 'pass' },
      { path: 'src/b.ts', status: 'pass' },
    ]
    const sealed = sealCreativeApplyFusionReceipt({
      projectId: 'p-apply',
      fusionTransactionId: 'tx-1',
      fusionScope: 'manifest',
      writeApplied: true,
      fileValidation,
    })
    expect(sealed.ok).toBe(true)
    if (!sealed.ok) return
    expect(sealed.receipt.writeApplied).toBe(true)
    expect(sealed.receipt.composerSurpassClaim).toBe(false)
    expect(sealed.receipt.deniedPaths).toEqual([])
  })

  it('refuses write success when L.5 denied', () => {
    const fileValidation: FileValidationStatusEntry[] = [
      { path: 'src/bad.ts', status: 'denied_l5', code: 'L5_PROJECT_TYPECHECK_FAIL' },
    ]
    const sealed = sealCreativeApplyFusionReceipt({
      projectId: 'p-deny',
      fusionTransactionId: 'tx-2',
      writeApplied: true,
      fileValidation,
    })
    expect(sealed.ok).toBe(false)
    if (sealed.ok) return
    expect(sealed.code).toBe('FILE_VALIDATION_DENIED')
    expect(sealed.receipt?.writeApplied).toBe(false)
    expect(sealed.receipt?.deniedPaths).toEqual(['src/bad.ts'])
  })

  it('refuses write without FusionTx when required', () => {
    const sealed = sealCreativeApplyFusionReceipt({
      projectId: 'p-nofusion',
      writeApplied: true,
      fileValidation: [{ path: 'src/a.ts', status: 'pass' }],
    })
    expect(sealed.ok).toBe(false)
    if (sealed.ok) return
    expect(sealed.code).toBe('MISSING_FUSION_TX')
  })

  it('refuses write claim with empty fileValidation', () => {
    const sealed = sealCreativeApplyFusionReceipt({
      projectId: 'p-empty-fv',
      fusionTransactionId: 'tx-3',
      writeApplied: true,
      fileValidation: [],
    })
    expect(sealed.ok).toBe(false)
    if (sealed.ok) return
    expect(sealed.code).toBe('EMPTY_WRITE_CLAIM')
  })
})
