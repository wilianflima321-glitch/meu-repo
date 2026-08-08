/**
 * R19 — FusionTx undo prefers a registered shared workspace Y.Doc over local fallback.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  recordFusionMutation,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'
import { handleFusionUndoShortcut } from '@/lib/production/fusion-undo-bridge'
import {
  ensureProjectFusionYjsStore,
  getBoundFusionScopeStore,
  getSharedWorkspaceYDoc,
  registerSharedWorkspaceYDoc,
  unregisterSharedWorkspaceYDoc,
  __resetFusionScopeRegistryForTests,
} from '@/lib/production/fusion-scope-registry'
import {
  applyFusionTxClientHandoff,
  buildFusionTxClientHandoff,
  serializeFusionTxClientHandoff,
  parseFusionTxClientHandoff,
} from '@/lib/production/fusion-tx-client-handoff'
import { createMemoryFusionScopeStore } from '@/lib/production/creative-fusion-transaction'

describe('R19 Fusion shared Y.Doc undo preference', () => {
  beforeEach(() => {
    __resetCreativeFusionTransactionsForTests()
    __resetFusionScopeRegistryForTests()
  })

  it('ensureProjectFusionYjsStore upgrades a local bind onto a registered shared doc', () => {
    const local = ensureProjectFusionYjsStore('proj-shared')
    const sharedDoc = new Y.Doc()
    registerSharedWorkspaceYDoc('proj-shared', sharedDoc)

    const upgraded = ensureProjectFusionYjsStore('proj-shared')
    expect(getSharedWorkspaceYDoc('proj-shared')).toBe(sharedDoc)
    expect(upgraded).toBe(getBoundFusionScopeStore('proj-shared'))
    expect((upgraded as { doc: Y.Doc }).doc).toBe(sharedDoc)
    expect((local as { doc: Y.Doc }).doc).not.toBe(sharedDoc)
  })

  it('server handoff applies onto the shared workspace store for Ctrl+Z', async () => {
    const sharedDoc = new Y.Doc()
    const clientStore = registerSharedWorkspaceYDoc('proj-handoff', sharedDoc)

    const serverStore = createMemoryFusionScopeStore()
    serverStore.applySnapshot('proj-handoff', 'manifest', JSON.stringify({ entities: ['before'] }))
    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-handoff',
      yDocScope: 'manifest',
      store: serverStore,
    })
    recordFusionMutation(tx.id, serverStore, JSON.stringify({ entities: ['before', 'ai'] }))
    const committed = await commitCreativeFusionTransaction(tx.id, serverStore)

    const handoffJson = serializeFusionTxClientHandoff(buildFusionTxClientHandoff(committed.record))
    const applied = applyFusionTxClientHandoff(parseFusionTxClientHandoff(handoffJson), clientStore)
    expect(applied.ok).toBe(true)
    expect(JSON.parse(clientStore.getSnapshot('proj-handoff', 'manifest')).entities).toEqual([
      'before',
      'ai',
    ])

    const undo = await handleFusionUndoShortcut({
      projectId: 'proj-handoff',
      yDocScope: 'manifest',
    })
    expect(undo).toEqual({ ok: true, action: 'reverted_committed' })
    expect(JSON.parse(clientStore.getSnapshot('proj-handoff', 'manifest')).entities).toEqual([
      'before',
    ])
  })

  it('unregisterSharedWorkspaceYDoc drops only the shared bind', () => {
    const sharedDoc = new Y.Doc()
    registerSharedWorkspaceYDoc('proj-leave', sharedDoc)
    expect(getBoundFusionScopeStore('proj-leave')).toBeTruthy()
    unregisterSharedWorkspaceYDoc('proj-leave')
    expect(getSharedWorkspaceYDoc('proj-leave')).toBeUndefined()
    expect(getBoundFusionScopeStore('proj-leave')).toBeUndefined()
  })
})
