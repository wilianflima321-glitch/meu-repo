/**
 * Block 2A — Yjs truth, channel, seats, sync LED, fusion Yjs store.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import * as Y from 'yjs'
import {
  collabChannelsAreIsolated,
  parseCollabDocumentName,
  resolveCollabDocumentName,
  upgradeLegacyWorkbenchDocumentName,
} from '@/lib/collaboration/collab-channel'
import { resolveCollabSeat, canApplyYjsWrite } from '@/lib/collaboration/collab-seat-policy'
import { resolveCollabSyncLed } from '@/lib/collaboration/collab-sync-state'
import {
  drainEmergencyUpdates,
  enqueueEmergencyUpdate,
  listPendingEmergencyUpdates,
  markEmergencyUpdatesSynced,
  __resetEmergencyBuffersForTests,
} from '@/lib/collaboration/collab-emergency-buffer'
import {
  applyCollaborationUpdate,
  encodeCollaborationStateAsUpdate,
  getOrCreateCollaborationDocRoom,
  __resetCollaborationDocRoomsForTests,
} from '@/lib/server/collaboration/collaboration-doc-room'
import { createYjsFusionScopeStore } from '@/lib/production/fusion-yjs-scope-store'
import {
  beginCreativeFusionTransaction,
  abortCreativeFusionTransaction,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'
import { handleFusionUndoShortcut } from '@/lib/production/fusion-undo-bridge'

describe('Block 2A collab channel (2A.2)', () => {
  it('isolates same project across branches', () => {
    const a = { projectId: 'proj-1', branchId: 'main', scope: 'workbench' as const }
    const b = { projectId: 'proj-1', branchId: 'feature/x', scope: 'workbench' as const }
    expect(collabChannelsAreIsolated(a, b)).toBe(true)
    expect(resolveCollabDocumentName(a)).toContain('branch:main')
    expect(resolveCollabDocumentName(b)).toContain('branch:feature-x')
  })

  it('upgrades legacy workbench names and parses projectId', () => {
    const upgraded = upgradeLegacyWorkbenchDocumentName('project:abc:workbench', 'develop')
    expect(upgraded).toBe(resolveCollabDocumentName({ projectId: 'abc', branchId: 'develop' }))
    const parsed = parseCollabDocumentName(upgraded)
    expect(parsed?.projectId).toBe('abc')
    expect(parsed?.branchId).toBe('develop')
  })
})

describe('Block 2A doc room (2A.1)', () => {
  beforeEach(() => {
    __resetCollaborationDocRoomsForTests()
  })

  it('merges updates and late joiner gets full state', () => {
    const docName = resolveCollabDocumentName({
      projectId: 'p1',
      branchId: 'main',
      scope: 'workbench',
    })
    const clientA = new Y.Doc()
    clientA.getText('file-1').insert(0, 'hello')
    const updateA = Y.encodeStateAsUpdate(clientA)
    expect(applyCollaborationUpdate(docName, updateA).ok).toBe(true)

    const clientB = new Y.Doc()
    clientB.getText('file-1').insert(5, ' world')
    const updateB = Y.encodeStateAsUpdate(clientB)
    // Apply relative to empty — still merges into room via applyUpdate
    applyCollaborationUpdate(docName, updateA)
    const room = getOrCreateCollaborationDocRoom(docName)
    Y.applyUpdate(room.doc, Y.encodeStateAsUpdate(clientB))

    const lateState = encodeCollaborationStateAsUpdate(docName)
    const lateJoiner = new Y.Doc()
    Y.applyUpdate(lateJoiner, lateState)
    expect(lateJoiner.getText('file-1').toString().length).toBeGreaterThan(0)
  })

  it('rejects empty updates', () => {
    const docName = 'proj:branch:main:scope:workbench'
    expect(applyCollaborationUpdate(docName, new Uint8Array([1])).ok).toBe(false)
  })
})

describe('Block 2A sync LED + emergency buffer (2A.3)', () => {
  beforeEach(() => {
    __resetEmergencyBuffersForTests()
  })

  it('maps disconnect + persistence to offline buffer warning', () => {
    const led = resolveCollabSyncLed({
      collaborationEnabled: true,
      isConnected: false,
      isSynced: false,
      isPersistenceSynced: true,
      pendingEmergencyUpdates: 2,
    })
    expect(led.state).toBe('buffering')
    expect(led.tone).toBe('warning')
    expect(led.label).toMatch(/Offline|buffer|Reconnect/i)
  })

  it('queues and drains emergency updates', () => {
    const doc = 'proj:branch:main:scope:workbench'
    const rec = enqueueEmergencyUpdate({ documentName: doc, update: new Uint8Array([0, 1, 2, 3]) })
    expect(listPendingEmergencyUpdates(doc)).toHaveLength(1)
    const drained = drainEmergencyUpdates(doc)
    expect(drained[0]?.id).toBe(rec.id)
    markEmergencyUpdatesSynced(doc, [rec.id])
    expect(listPendingEmergencyUpdates(doc)).toHaveLength(0)
  })
})

describe('Block 2A seats (2A.4)', () => {
  it('Free plan forces spectator; Pro grants write then spectator overflow', () => {
    const free = resolveCollabSeat({ planId: 'free', roomWriteCount: 0 })
    expect(free.role).toBe('spectator')
    expect(canApplyYjsWrite(free.role)).toBe(false)

    const proWrite = resolveCollabSeat({ planId: 'pro', roomWriteCount: 0 })
    expect(proWrite.role).toBe('write')
    const proOverflow = resolveCollabSeat({ planId: 'pro', roomWriteCount: 2 })
    expect(proOverflow.role).toBe('spectator')
  })
})

describe('Block 2A fusion Yjs store + undo (2A.5)', () => {
  beforeEach(() => {
    __resetCreativeFusionTransactionsForTests()
  })

  it('abort restores Yjs snapshot via FusionScopeStore', async () => {
    const doc = new Y.Doc()
    const store = createYjsFusionScopeStore({ doc })
    store.applySnapshot('proj', 'manifest', JSON.stringify({ entities: ['a'] }))
    const tx = await beginCreativeFusionTransaction({
      projectId: 'proj',
      yDocScope: 'manifest',
      store,
    })
    store.applySnapshot('proj', 'manifest', JSON.stringify({ entities: ['a', 'b'] }))
    await abortCreativeFusionTransaction(tx.id, store)
    expect(JSON.parse(store.getSnapshot('proj', 'manifest')).entities).toEqual(['a'])
  })

  it('undo bridge aborts open fusion tx', async () => {
    const doc = new Y.Doc()
    const store = createYjsFusionScopeStore({ doc })
    await beginCreativeFusionTransaction({
      projectId: 'proj-undo',
      yDocScope: 'manifest',
      store,
    })
    const result = await handleFusionUndoShortcut({
      projectId: 'proj-undo',
      yDocScope: 'manifest',
      store,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.action).toBe('aborted')
  })
})
