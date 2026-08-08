/**
 * P2f #3 — FusionTx Trava II must bind real Yjs scopes for undo.
 * Proves: Yjs abort restore, post-commit revert, theater empty-Map undo fail-closed.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  recordFusionMutation,
  __resetCreativeFusionTransactionsForTests,
  createMemoryFusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import { createYjsFusionScopeStore } from '@/lib/production/fusion-yjs-scope-store'
import { handleFusionUndoShortcut } from '@/lib/production/fusion-undo-bridge'
import {
  bindFusionScopeStore,
  ensureProjectFusionYjsStore,
  getBoundFusionScopeStore,
  __resetFusionScopeRegistryForTests,
} from '@/lib/production/fusion-scope-registry'

describe('P2f #3 FusionTx Yjs undo (Trava II)', () => {
  beforeEach(() => {
    __resetCreativeFusionTransactionsForTests()
    __resetFusionScopeRegistryForTests()
  })

  it('abort restores entities on a real Y.Doc FusionScopeStore', async () => {
    const doc = new Y.Doc()
    const store = createYjsFusionScopeStore({ doc })
    store.applySnapshot('proj-yjs', 'manifest', JSON.stringify({ entities: ['keep'] }))

    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-yjs',
      yDocScope: 'manifest',
      store,
    })
    recordFusionMutation(
      tx.id,
      store,
      JSON.stringify({ entities: ['keep', 'ai-added'] }),
    )

    const undo = await handleFusionUndoShortcut({
      projectId: 'proj-yjs',
      yDocScope: 'manifest',
      store,
    })
    expect(undo).toEqual({ ok: true, action: 'aborted', transactionId: tx.id })
    expect(JSON.parse(store.getSnapshot('proj-yjs', 'manifest')).entities).toEqual(['keep'])
  })

  it('post-commit Ctrl+Z restores via captureRevertPoint on the same Yjs store', async () => {
    const store = ensureProjectFusionYjsStore('proj-commit')
    store.applySnapshot('proj-commit', 'scene', JSON.stringify({ entities: ['a'] }))

    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-commit',
      yDocScope: 'scene',
      store,
    })
    recordFusionMutation(tx.id, store, JSON.stringify({ entities: ['a', 'b'] }))
    await commitCreativeFusionTransaction(tx.id, store)

    expect(JSON.parse(store.getSnapshot('proj-commit', 'scene')).entities).toEqual(['a', 'b'])

    const undo = await handleFusionUndoShortcut({
      projectId: 'proj-commit',
      yDocScope: 'scene',
    })
    expect(undo).toEqual({ ok: true, action: 'reverted_committed' })
    expect(JSON.parse(store.getSnapshot('proj-commit', 'scene')).entities).toEqual(['a'])
  })

  it('fail-closes when no store is bound — never invents success for theater undo', async () => {
    const result = await handleFusionUndoShortcut({
      projectId: 'unbound-project',
      yDocScope: 'manifest',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('no_store')
  })

  it('fail-closes when a fresh empty memory store is passed (the old banner bug)', async () => {
    const real = ensureProjectFusionYjsStore('proj-theater')
    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-theater',
      yDocScope: 'manifest',
      store: real,
    })
    recordFusionMutation(tx.id, real, JSON.stringify({ entities: ['mutated'] }))
    await commitCreativeFusionTransaction(tx.id, real)

    // Old FusionTransactionUndoBanner bug: createMemoryFusionScopeStore() per click.
    const throwaway = createMemoryFusionScopeStore()
    const theater = await handleFusionUndoShortcut({
      projectId: 'proj-theater',
      yDocScope: 'manifest',
      store: throwaway,
    })
    // Preferred store is used when passed — throwaway has no revert point → fail-closed.
    expect(theater.ok).toBe(false)
    if (theater.ok) return
    expect(theater.reason).toBe('no_reversible_fusion_state')
    // Real Yjs doc still holds the mutation (theater undo must not claim success).
    expect(JSON.parse(real.getSnapshot('proj-theater', 'manifest')).entities).toEqual(['mutated'])

    // Bound-store path actually reverts.
    const realUndo = await handleFusionUndoShortcut({
      projectId: 'proj-theater',
      yDocScope: 'manifest',
    })
    expect(realUndo).toEqual({ ok: true, action: 'reverted_committed' })
  })

  it('ensureProjectFusionYjsStore reuses the bound store (same Y.Doc)', () => {
    const a = ensureProjectFusionYjsStore('proj-reuse')
    const b = ensureProjectFusionYjsStore('proj-reuse')
    expect(a).toBe(b)
    expect(getBoundFusionScopeStore('proj-reuse')).toBe(a)
    bindFusionScopeStore('proj-reuse', a)
    expect(getBoundFusionScopeStore('proj-reuse')).toBe(a)
  })

  it('memory store also supports post-commit revert when the same instance is bound', async () => {
    const store = createMemoryFusionScopeStore()
    bindFusionScopeStore('proj-mem', store)
    store.applySnapshot('proj-mem', 'quest', JSON.stringify({ entities: ['q0'] }))
    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-mem',
      yDocScope: 'quest',
      store,
    })
    recordFusionMutation(tx.id, store, JSON.stringify({ entities: ['q0', 'q1'] }))
    await commitCreativeFusionTransaction(tx.id, store)

    const undo = await handleFusionUndoShortcut({
      projectId: 'proj-mem',
      yDocScope: 'quest',
    })
    expect(undo).toEqual({ ok: true, action: 'reverted_committed' })
    expect(JSON.parse(store.getSnapshot('proj-mem', 'quest')).entities).toEqual(['q0'])
  })
})
