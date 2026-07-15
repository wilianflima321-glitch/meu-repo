/**
 * Block 2A.1 — Authoritative server-side Y.Doc room.
 * Late joiners receive encodeStateAsUpdate of the merged doc — never broadcast-only.
 */

import * as Y from 'yjs'
import { createComponentLogger } from '@/lib/observability/logger'
import { parseCollabDocumentName } from '@/lib/collaboration/collab-channel'

const log = createComponentLogger('collaboration-doc-room')

export type CollaborationDocRoom = {
  documentName: string
  projectId: string
  branchId: string
  doc: Y.Doc
  createdAt: number
  updateCount: number
}

const rooms = new Map<string, CollaborationDocRoom>()

export function getOrCreateCollaborationDocRoom(documentName: string): CollaborationDocRoom {
  const existing = rooms.get(documentName)
  if (existing) return existing

  const parsed = parseCollabDocumentName(documentName)
  const doc = new Y.Doc()
  const room: CollaborationDocRoom = {
    documentName,
    projectId: parsed?.projectId ?? documentName,
    branchId: parsed?.branchId ?? 'main',
    doc,
    createdAt: Date.now(),
    updateCount: 0,
  }
  rooms.set(documentName, room)
  log.info('collab_room_created', {
    documentName,
    projectId: room.projectId,
    branchId: room.branchId,
  })
  return room
}

export function applyCollaborationUpdate(
  documentName: string,
  update: Uint8Array,
): { ok: true; room: CollaborationDocRoom } | { ok: false; error: string } {
  if (!update || update.byteLength < 2) {
    return { ok: false, error: 'UPDATE_TOO_SHORT' }
  }
  try {
    const room = getOrCreateCollaborationDocRoom(documentName)
    Y.applyUpdate(room.doc, update)
    room.updateCount += 1
    return { ok: true, room }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'APPLY_FAILED'
    log.error('collab_apply_failed', { documentName, error: message })
    return { ok: false, error: message }
  }
}

export function encodeCollaborationStateAsUpdate(documentName: string): Uint8Array {
  const room = getOrCreateCollaborationDocRoom(documentName)
  return Y.encodeStateAsUpdate(room.doc)
}

export function hydrateCollaborationRoomFromFiles(
  documentName: string,
  files: Array<{ id: string; content: string }>,
): number {
  const room = getOrCreateCollaborationDocRoom(documentName)
  let hydrated = 0
  room.doc.transact(() => {
    for (const file of files) {
      const text = room.doc.getText(file.id)
      if (text.length === 0 && file.content) {
        text.insert(0, file.content)
        hydrated += 1
      }
    }
  })
  return hydrated
}

/** Test / shutdown helper */
export function __resetCollaborationDocRoomsForTests(): void {
  for (const room of rooms.values()) {
    room.doc.destroy()
  }
  rooms.clear()
}

export function getCollaborationDocRoomStats(): {
  roomCount: number
  rooms: Array<{ documentName: string; updateCount: number; projectId: string; branchId: string }>
} {
  return {
    roomCount: rooms.size,
    rooms: [...rooms.values()].map((r) => ({
      documentName: r.documentName,
      updateCount: r.updateCount,
      projectId: r.projectId,
      branchId: r.branchId,
    })),
  }
}
