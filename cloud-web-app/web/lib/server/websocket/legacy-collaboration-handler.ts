import type { IncomingMessage } from 'http'
import type { WebSocket } from 'ws'
import * as Y from 'yjs'

import { prisma } from '../../db.ts'

import { createComponentLogger } from '../../observability/logger.ts'
import { toUint8Array } from '../websocket-runtime-codecs.ts'
import { resolveCollaborationRoomName } from '../websocket-runtime-routing.ts'
import { getYWebsocketSetup } from '../websocket-yjs-bootstrap.ts'
import { addLegacyRoomClient } from './rooms.ts'

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
      const newDoc = new Y.Doc()
      docs.set(roomName, newDoc)

      // Sync State for Late Joiners (Re-hidratação de Colaboração)
      // Carrega os arquivos do banco de dados na primeira vez que a sala é aberta no servidor
      prisma.file.findMany({ where: { projectId: roomName } })
        .then((files) => {
          if (files && files.length > 0) {
            newDoc.transact(() => {
              files.forEach((f) => {
                const text = newDoc.getText(f.id)
                // Insere apenas se estiver vazio para não sobrescrever edições em andamento na mesma transação
                if (text.length === 0) {
                  text.insert(0, f.content)
                }
              })
            })
            log.info(`[Collaboration] Hydrated ${files.length} files from DB for room ${roomName}`)
            // Broadcast o estado atualizado para a sala (incluindo o cliente recém-conectado)
            const update = Y.encodeStateAsUpdate(newDoc)
            broadcastToLegacyRoom(roomName, update)
          }
        })
        .catch((err) => {
          log.error(`[Collaboration] Failed to hydrate room ${roomName} from DB`, err)
        })
    }

    const doc = docs.get(roomName)!
    ws.on('message', (data) => {
      const update = toUint8Array(data)
      if (update && update.byteLength > 2) {
        try {
          Y.applyUpdate(doc, update)
          // Só faz broadcast se o update for válido e aplicado com sucesso
          broadcastToLegacyRoom(roomName, update, ws)
        } catch (err) {
          log.error(`[Collaboration] Failed to apply Y.js update to room ${roomName}`, err)
        }
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
