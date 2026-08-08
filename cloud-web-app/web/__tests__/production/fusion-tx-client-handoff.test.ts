/**
 * FusionTx server→client undo handoff (Trava II) — portable revert arming.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  createMemoryFusionScopeStore,
  recordFusionMutation,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'
import {
  applyFusionTxClientHandoff,
  buildFusionTxClientHandoff,
  parseFusionTxClientHandoff,
  serializeFusionTxClientHandoff,
} from '@/lib/production/fusion-tx-client-handoff'
import { handleFusionUndoShortcut } from '@/lib/production/fusion-undo-bridge'
import {
  ensureProjectFusionMemoryStore,
  __resetFusionScopeRegistryForTests,
  bindFusionScopeStore,
} from '@/lib/production/fusion-scope-registry'

describe('fusion-tx-client-handoff', () => {
  beforeEach(() => {
    __resetCreativeFusionTransactionsForTests()
    __resetFusionScopeRegistryForTests()
  })

  it('builds serializable handoff from committed server tx and arms client Ctrl+Z', async () => {
    const serverStore = createMemoryFusionScopeStore()
    serverStore.data.set(
      'proj-handoff::scene',
      JSON.stringify({ projectId: 'proj-handoff', scope: 'scene', entities: [{ id: 'a' }] }),
    )

    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj-handoff',
      yDocScope: 'scene',
      store: serverStore,
    })
    recordFusionMutation(
      tx.id,
      serverStore,
      JSON.stringify({ projectId: 'proj-handoff', scope: 'scene', entities: [{ id: 'b' }] }),
    )
    const committed = await commitCreativeFusionTransaction(tx.id, serverStore)
    const handoff = buildFusionTxClientHandoff(committed.record)
    expect(handoff.schema).toBe('aethel.fusion-tx-handoff.v1')
    expect(handoff.afterPayload).toContain('"id":"b"')

    const wire = serializeFusionTxClientHandoff(handoff)
    const parsed = parseFusionTxClientHandoff(wire)

    // Client has a different store (simulates browser Yjs bind).
    const clientStore = ensureProjectFusionMemoryStore('proj-handoff')
    clientStore.applySnapshot(
      'proj-handoff',
      'scene',
      JSON.stringify({ projectId: 'proj-handoff', scope: 'scene', entities: [{ id: 'stale' }] }),
    )

    const applied = applyFusionTxClientHandoff(parsed, clientStore)
    expect(applied.ok).toBe(true)
    expect(clientStore.getSnapshot('proj-handoff', 'scene')).toContain('"id":"b"')

    const undo = await handleFusionUndoShortcut({
      projectId: 'proj-handoff',
      yDocScope: 'scene',
      store: clientStore,
    })
    expect(undo.ok).toBe(true)
    if (!undo.ok) return
    expect(undo.action).toBe('reverted_committed')
    expect(clientStore.getSnapshot('proj-handoff', 'scene')).toContain('"id":"a"')
  })

  it('fail-closes when client store lacks revert stack API', () => {
    const handoff = {
      schema: 'aethel.fusion-tx-handoff.v1' as const,
      projectId: 'p',
      yDocScope: 'scene' as const,
      transactionId: 'tx-1',
      beforePayload: '{}',
      afterPayload: '{"x":1}',
      snapshotHashBefore: 'a',
      snapshotHashAfter: 'b',
      committedAt: new Date().toISOString(),
    }
    const bareStore = {
      getSnapshot: () => '{}',
      applySnapshot: () => undefined,
    }
    bindFusionScopeStore('p', bareStore)
    const result = applyFusionTxClientHandoff(handoff, bareStore)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('store_missing_revert')
  })
})
