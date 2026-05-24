import type { WebSocket } from 'ws'

import { createComponentLogger } from '@/lib/observability/logger'
import type { ConnectionInfo } from '../websocket-runtime-contracts'
import { asWsRecord } from '../websocket-runtime-codecs'
import { eventBus } from './event-bus'
import { addLegacyRoomClient, removeLegacyRoomClient } from './rooms'

const log = createComponentLogger('server/websocket/legacy-simple-handlers')

type SendRaw = (ws: WebSocket, message: unknown) => void

export function handleLegacyLspSocket(ws: WebSocket, info: ConnectionInfo, sendRaw: SendRaw): void {
  const language = info.sessionId || 'typescript'

  ws.on('message', (data) => {
    try {
      const message = asWsRecord(JSON.parse(data.toString()))
      eventBus.emit('lsp:message', {
        language,
        message,
        respond: (response: unknown) => sendRaw(ws, response),
      })
    } catch (error) {
      log.error('[LSP] Message parse error', error)
    }
  })

  sendRaw(ws, { type: 'ready', language })
}

export function handleLegacyAiSocket(ws: WebSocket, sendRaw: SendRaw): void {
  ws.on('message', (data) => {
    try {
      const message = asWsRecord(JSON.parse(data.toString()))
      eventBus.emit('ai:stream', {
        ...message,
        stream: (chunk: string) => sendRaw(ws, { type: 'chunk', content: chunk }),
        done: () => sendRaw(ws, { type: 'done' }),
        error: (err: string) => sendRaw(ws, { type: 'error', error: err }),
      })
    } catch (error) {
      log.error('[AI] Message parse error', error)
    }
  })

  sendRaw(ws, { type: 'ready' })
}

export function handleLegacyDapSocket(ws: WebSocket, sendRaw: SendRaw): void {
  ws.on('message', (data) => {
    try {
      const message = asWsRecord(JSON.parse(data.toString()))
      eventBus.emit('dap:message', {
        message,
        respond: (response: unknown) => sendRaw(ws, response),
      })
    } catch (error) {
      log.error('[DAP] Message parse error', error)
    }
  })

  sendRaw(ws, { type: 'ready' })
}

export function handleLegacyGeneralSocket(options: {
  ws: WebSocket
  info: ConnectionInfo
  legacyRooms: Map<string, Set<WebSocket>>
  sendRaw: SendRaw
  broadcastToLegacyRoom: (roomName: string, message: unknown, exclude?: WebSocket) => void
}): void {
  const { ws, info, legacyRooms, sendRaw, broadcastToLegacyRoom } = options

  ws.on('message', (data) => {
    try {
      const message = asWsRecord(JSON.parse(data.toString()))
      if (message.type === 'join-room') {
        const roomName = String(message.room || 'default')
        addLegacyRoomClient(legacyRooms, roomName, ws)
        sendRaw(ws, { type: 'room-joined', room: roomName })
        return
      }

      if (message.type === 'leave-room') {
        removeLegacyRoomClient(legacyRooms, String(message.room || ''), ws)
        return
      }

      if (message.type === 'broadcast') {
        broadcastToLegacyRoom(String(message.room || ''), message.data, ws)
        return
      }

      if (message.type === 'ping') {
        sendRaw(ws, { type: 'pong', timestamp: Date.now() })
      }
    } catch (error) {
      log.error('[General] Message parse error', error)
    }
  })

  sendRaw(ws, { type: 'connected', connectionId: info.id })
}
