import type { IncomingMessage } from 'http'
import type { WebSocket } from 'ws'
import * as Y from 'yjs'

import { prisma } from '../../db.ts'

import { createComponentLogger } from '../../observability/logger.ts'
import { toUint8Array } from '../websocket-runtime-codecs.ts'
import { resolveCollaborationRoomName } from '../websocket-runtime-routing.ts'
import { getYWebsocketSetup } from '../websocket-yjs-bootstrap.ts'
import { addLegacyRoomClient } from './rooms.ts'
import {
  applyCollaborationUpdate,
  encodeCollaborationStateAsUpdate,
  getOrCreateCollaborationDocRoom,
  hydrateCollaborationRoomFromFiles,
} from '../collaboration/collaboration-doc-room.ts'
import { parseCollabDocumentName } from '../../collaboration/collab-channel.ts'

const log = createComponentLogger('server/websocket/legacy-collaboration-handler')
const hydratedRooms = new Set<string>()

export function handleLegacyCollaborationSocket(options: {
  ws: WebSocket
  request: IncomingMessage
  pathname: string
  docs: Map<string, Y.Doc>
  legacyRooms: Map<string, Set<WebSocket>>
  broadcastToLegacyRoom: (roomName: string, message: unknown, exclude?: WebSocket) => void
}): void {
  const { ws, request, pathname, docs, legacyRooms, broadcastToLegacyRoom } = options
  const roomName = resolveCollaborationRoomName(pathname)
  log.info(`[Collaboration] Client joining room: ${roomName}`)

  const yjsSetupConnection = getYWebsocketSetup()
  if (yjsSetupConnection) {
    yjsSetupConnection(ws, request, {
      docName: roomName,
      gc: true,
    })
  } else {
    log.warn('[Collaboration] Using fallback Yjs handler (authoritative doc room)')
    const room = getOrCreateCollaborationDocRoom(roomName)
    docs.set(roomName, room.doc)

    const parsed = parseCollabDocumentName(roomName)
    const projectIdForHydrate = parsed?.projectId ?? null
    if (projectIdForHydrate && !hydratedRooms.has(roomName)) {
      hydratedRooms.add(roomName)
      prisma.file
        .findMany({ where: { projectId: projectIdForHydrate } })
        .then((files) => {
          if (files && files.length > 0) {
            const hydrated = hydrateCollaborationRoomFromFiles(
              roomName,
              files.map((f) => ({ id: f.id, content: f.content })),
            )
            log.info(`[Collaboration] Hydrated ${hydrated} files from DB for project ${projectIdForHydrate}`)
            const update = encodeCollaborationStateAsUpdate(roomName)
            broadcastToLegacyRoom(roomName, update)
          }
        })
        .catch((err) => {
          log.error(`[Collaboration] Failed to hydrate room ${roomName} from DB`, err)
        })
    }

    ws.on('message', (data) => {
      const update = toUint8Array(data)
      if (update && update.byteLength > 2) {
        const applied = applyCollaborationUpdate(roomName, update)
        if (applied.ok) {
          broadcastToLegacyRoom(roomName, update, ws)
        } else {
          log.error(`[Collaboration] Failed to apply Y.js update to room ${roomName}`, applied.error)
        }
      }
    })

    // Late joiner: full merged state (2A.1)
    ws.send(encodeCollaborationStateAsUpdate(roomName))
  }

  const roomClients = addLegacyRoomClient(legacyRooms, roomName, ws)
  broadcastToLegacyRoom(
    roomName,
    {
      type: 'user-joined',
      roomName,
      userCount: roomClients.size,
    },
    ws,
  )
}
