import type { WsClient, WsMessage } from './websocket-runtime-contracts.ts'
import { WS_MESSAGE_TYPES } from './websocket-runtime-contracts.ts'
import { asWsRecord, readString } from './websocket-runtime-codecs.ts'
import {
  applyCollaborationUpdate,
  encodeCollaborationStateAsUpdate,
} from './collaboration/collaboration-doc-room.ts'

function decodeUpdatePayload(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value
  if (typeof value !== 'string' || !value) return null
  try {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(value, 'base64'))
    }
    const binary = atob(value)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

export function handleCollabJoin(input: {
  client: WsClient
  payload: unknown
  ensureUserIdentity: (client: WsClient, requestedUserId?: string) => string | null
  subscribeToChannel: (client: WsClient, channelName: string, options?: unknown) => void
  broadcastToChannel: (channelName: string, message: WsMessage, excludeClientId?: string) => void
}): void {
  const data = asWsRecord(input.payload)
  const documentId = readString(data.documentId) || 'default'
  const userId = input.ensureUserIdentity(input.client, readString(data.userId))
  const channelName = `collab:${documentId}`

  input.subscribeToChannel(input.client, channelName, {
    metadata: { documentId },
  })

  const stateUpdate = encodeCollaborationStateAsUpdate(documentId)
  const stateB64 =
    typeof Buffer !== 'undefined' ? Buffer.from(stateUpdate).toString('base64') : ''

  input.broadcastToChannel(
    channelName,
    {
      type: WS_MESSAGE_TYPES.COLLAB_AWARENESS,
      channel: channelName,
      payload: {
        type: 'join',
        userId: userId || input.client.id,
        userName: data.userName,
        color: data.color,
        clientId: input.client.id,
        stateUpdateB64: stateB64 || undefined,
        role: readString(data.role) || 'write',
      },
    },
    input.client.id,
  )
}

export function handleCollabOperation(input: {
  client: WsClient
  channel: string
  payload: unknown
  broadcastToChannel: (channelName: string, message: WsMessage, excludeClientId?: string) => void
}): void {
  const data = asWsRecord(input.payload)
  const documentId =
    readString(data.documentId) ||
    (input.channel.startsWith('collab:') ? input.channel.slice('collab:'.length) : input.channel)

  const update =
    decodeUpdatePayload(data.updateB64) || decodeUpdatePayload(data.update) || null

  // Spectator / read-only clients must not mutate the authoritative doc
  if (readString(data.role) === 'spectator') {
    return
  }

  if (update) {
    const applied = applyCollaborationUpdate(documentId, update)
    if (!applied.ok) {
      return
    }
  }

  input.broadcastToChannel(
    input.channel,
    {
      type: WS_MESSAGE_TYPES.COLLAB_OPERATION,
      channel: input.channel,
      payload: {
        ...data,
        clientId: input.client.id,
        timestamp: Date.now(),
        applied: Boolean(update),
      },
    },
    input.client.id,
  )
}

export function handleCollabChat(input: {
  client: WsClient
  channel: string
  payload: unknown
  ensureUserIdentity: (client: WsClient, requestedUserId?: string) => string | null
  broadcastToChannel: (channelName: string, message: WsMessage, excludeClientId?: string) => void
}): void {
  const data = asWsRecord(input.payload)
  const userId = input.ensureUserIdentity(input.client, readString(data.userId))
  input.broadcastToChannel(input.channel, {
    type: WS_MESSAGE_TYPES.COLLAB_CHAT,
    channel: input.channel,
    payload: {
      ...data,
      userId: userId || input.client.id,
      timestamp: Date.now(),
    },
  })
}
