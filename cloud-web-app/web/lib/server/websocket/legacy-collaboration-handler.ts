import type { IncomingMessage } from 'http'
import type { WebSocket } from 'ws'
import * as Y from 'yjs'

import { createComponentLogger } from '@/lib/observability/logger'
import { toUint8Array } from '../websocket-runtime-codecs'
import { resolveCollaborationRoomName } from '../websocket-runtime-routing'
import { getYWebsocketSetup } from '../websocket-yjs-bootstrap'
import { addLegacyRoomClient } from './rooms'

const log = createComponentLogger('server/websocket/legacy-collaboration-handler')

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
    log.warn('[Collaboration] Using fallback Yjs handler')
    if (!docs.has(roomName)) {
      docs.set(roomName, new Y.Doc())
    }

    const doc = docs.get(roomName)!
    ws.on('message', (data) => {
      const update = toUint8Array(data)
      if (update) {
        broadcastToLegacyRoom(roomName, update, ws)
      }
    })

    ws.send(Y.encodeStateAsUpdate(doc))
  }

  const room = addLegacyRoomClient(legacyRooms, roomName, ws)
  broadcastToLegacyRoom(
    roomName,
    {
      type: 'user-joined',
      roomName,
      userCount: room.size,
    },
    ws
  )
}
