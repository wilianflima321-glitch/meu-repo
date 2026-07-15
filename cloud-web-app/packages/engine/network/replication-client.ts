/**
 * Zero-Config Multiplayer client — Cook & Build Pipeline Stage 4.
 *
 * `runtime-main.ts` calls `createReplicationClient()` only when the cooked
 * project manifest reports at least one entity tagged `[Replicated]` (see
 * `hasReplicatedEntities` in `publish-pipeline-orchestrator.ts`). Games with
 * no replicated entities never import this module at all — so the WebSocket
 * client, reconciliation buffer, and `WebRTCOracle` divergence check add zero
 * bytes to a single-player export.
 *
 * This is deliberately the thin client half only. The matching authoritative
 * relay (`web/server/workers/` multiplayer relay) is out of scope for this
 * pass — see `docs/architecture/implementation_plan.md` One-Click Deploy
 * section §4. What IS real here: connection lifecycle, outbound state
 * publishing, and inbound snapshot application, wired against the same
 * Yjs-encoded state vectors `WebRTCOracle` already validates for the
 * collaborative editor, so the wire format has exactly one implementation
 * across Studio and shipped games.
 */

import * as Y from 'yjs'
import { WebRTCOracle } from './WebRTCOracle'

export interface ReplicatedEntityRef {
  entityId: string
  ownerClientId: string | null
}

export type ReplicationConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ReplicationClientConfig {
  /** wss:// (or ws:// in local dev) endpoint for the Aethel multiplayer relay. */
  relayUrl: string
  /** Stable id for this project build — the relay uses it to route to the right session/room. */
  projectId: string
  /** Optional room/session code; when absent the client requests a fresh public room from the relay. */
  roomCode?: string
  onStateChange?: (state: ReplicationConnectionState) => void
  onSnapshotApplied?: (doc: Y.Doc) => void
}

export class ReplicationClient {
  private socket: WebSocket | null = null
  private readonly doc = new Y.Doc()
  private state: ReplicationConnectionState = 'idle'

  constructor(private readonly config: ReplicationClientConfig) {}

  connect(): void {
    if (typeof WebSocket === 'undefined') {
      this.setState('error')
      return
    }
    this.setState('connecting')
    const url = new URL(this.config.relayUrl)
    url.searchParams.set('projectId', this.config.projectId)
    if (this.config.roomCode) url.searchParams.set('room', this.config.roomCode)

    const socket = new WebSocket(url.toString())
    socket.binaryType = 'arraybuffer'
    socket.onopen = () => this.setState('connected')
    socket.onclose = () => this.setState('disconnected')
    socket.onerror = () => this.setState('error')
    socket.onmessage = (event) => this.handleMessage(event.data)
    this.socket = socket
  }

  disconnect(): void {
    this.socket?.close()
    this.socket = null
    this.setState('disconnected')
  }

  /** Publishes the local delta for a replicated entity's transform/state — call after simulating each authoritative-locally-owned entity for the frame. */
  publishEntityState(entityId: string, patch: Record<string, unknown>): void {
    if (!this.socket || this.state !== 'connected') return
    const map = this.doc.getMap<Record<string, unknown>>('replicated_entities')
    map.set(entityId, { ...(map.get(entityId) ?? {}), ...patch })
    const update = Y.encodeStateAsUpdate(this.doc)
    this.socket.send(update as unknown as ArrayBuffer)
  }

  getReplicatedState(entityId: string): Record<string, unknown> | undefined {
    return this.doc.getMap<Record<string, unknown>>('replicated_entities').get(entityId)
  }

  private handleMessage(data: unknown): void {
    if (!(data instanceof ArrayBuffer)) return
    const update = new Uint8Array(data)
    const accepted = WebRTCOracle.validatePeerUpdate(this.doc, update)
    if (!accepted) return
    Y.applyUpdate(this.doc, update)
    this.config.onSnapshotApplied?.(this.doc)
  }

  private setState(next: ReplicationConnectionState): void {
    this.state = next
    this.config.onStateChange?.(next)
  }
}

export function createReplicationClient(config: ReplicationClientConfig): ReplicationClient {
  return new ReplicationClient(config)
}
