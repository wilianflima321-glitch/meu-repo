/**
 * Aethel Engine — HMR Bridge (L.8)
 * Unified WebSocket bridge for Next.js webpack-hmr and Vite (`vite-hmr`) preview runtimes.
 * Honesty: connection is only "live" after open (Next) or protocol `connected` (Vite).
 */

import type { PreviewHmrEngine, PreviewHmrPathCandidate } from '@/lib/preview/vite-hmr-detect'

export type HMRMessageType =
  | 'connected'
  | 'update'
  | 'full-reload'
  | 'prune'
  | 'error'
  | 'custom'
  | 'ping'
  | 'pong'
  | 'reload'

export interface HMRMessage {
  type: HMRMessageType | string
  timestamp: number
  data?: unknown
  path?: string
  acceptedPath?: string
  updates?: Array<{ path?: string; acceptedPath?: string; type?: string }>
  error?: { message: string; stack?: string }
  event?: string
}

export interface HMRBridgeOptions {
  runtimeUrl: string
  hmrPath?: string
  hmrPathCandidates?: Array<string | PreviewHmrPathCandidate>
  onUpdate?: (msg: HMRMessage) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: Error) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

type NormalizedCandidate = PreviewHmrPathCandidate

type ResolvedOptions = {
  runtimeUrl: string
  hmrPathCandidates: NormalizedCandidate[]
  onUpdate: (msg: HMRMessage) => void
  onConnectionChange: (connected: boolean) => void
  onError: (error: Error) => void
  reconnectInterval: number
  maxReconnectAttempts: number
}

export type HMRBridgeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

function normalizeCandidate(value: string | PreviewHmrPathCandidate): NormalizedCandidate {
  if (typeof value === 'string') {
    const path = value.trim()
    if (path.includes('webpack-hmr')) {
      return { path, engine: 'webpack-next', requireConnectedPayload: false }
    }
    if (path.includes('vite') || path === '' || path === '/' || path.startsWith('?')) {
      return {
        path,
        protocols: ['vite-hmr'],
        engine: 'vite',
        requireConnectedPayload: true,
      }
    }
    return { path, engine: 'unknown', requireConnectedPayload: false }
  }
  return {
    path: value.path,
    protocols: value.protocols,
    engine: value.engine,
    requireConnectedPayload: value.requireConnectedPayload,
  }
}

export class HMRBridge {
  private ws: WebSocket | null = null
  private state: HMRBridgeState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private options: ResolvedOptions
  private listeners: Set<(state: HMRBridgeState) => void> = new Set()
  private messageBuffer: HMRMessage[] = []
  private pathIndex = 0
  private openedThisAttempt = false
  private protocolConfirmed = false
  private activeEngine: PreviewHmrEngine = 'unknown'
  private intentionalClose = false

  constructor(options: HMRBridgeOptions) {
    const fallbackCandidates: Array<string | PreviewHmrPathCandidate> = [
      { path: '/_next/webpack-hmr', engine: 'webpack-next', requireConnectedPayload: false },
      { path: '', protocols: ['vite-hmr'], engine: 'vite', requireConnectedPayload: true },
      { path: '/', protocols: ['vite-hmr'], engine: 'vite', requireConnectedPayload: true },
    ]
    const explicit =
      Array.isArray(options.hmrPathCandidates) && options.hmrPathCandidates.length > 0
        ? options.hmrPathCandidates
        : options.hmrPath
          ? [options.hmrPath]
          : fallbackCandidates

    const hmrPathCandidates = Array.from(
      new Map(
        explicit
          .map(normalizeCandidate)
          .filter((c) => typeof c.path === 'string')
          .map((c) => [`${c.engine}:${c.path}:${(c.protocols || []).join(',')}`, c] as const),
      ).values(),
    )

    this.options = {
      runtimeUrl: options.runtimeUrl,
      hmrPathCandidates,
      onUpdate: options.onUpdate ?? (() => {}),
      onConnectionChange: options.onConnectionChange ?? (() => {}),
      onError: options.onError ?? (() => {}),
      reconnectInterval: options.reconnectInterval ?? 2000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    }
  }

  getState(): HMRBridgeState {
    return this.state
  }

  getActiveEngine(): PreviewHmrEngine {
    return this.activeEngine
  }

  isProtocolLive(): boolean {
    return this.state === 'connected' && this.protocolConfirmed
  }

  getMessageBuffer(): readonly HMRMessage[] {
    return this.messageBuffer
  }

  onStateChange(listener: (state: HMRBridgeState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return

    this.intentionalClose = false
    this.setState('connecting')
    this.openedThisAttempt = false
    this.protocolConfirmed = false

    const candidate = this.options.hmrPathCandidates[this.pathIndex]
    const wsUrl = this.buildWsUrl(candidate)

    try {
      this.ws =
        candidate?.protocols && candidate.protocols.length > 0
          ? new WebSocket(wsUrl, candidate.protocols)
          : new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.openedThisAttempt = true
        this.activeEngine = candidate?.engine ?? 'unknown'
        const requirePayload = Boolean(candidate?.requireConnectedPayload)
        if (!requirePayload) {
          this.markLive()
        }
        // Vite: wait for `{ type: 'connected' }` before claiming live.
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          const msg: HMRMessage = {
            ...(typeof raw === 'object' && raw ? raw : { type: 'custom', data: raw }),
            timestamp: Date.now(),
          }

          this.messageBuffer.push(msg)
          if (this.messageBuffer.length > 100) this.messageBuffer.shift()

          if (msg.type === 'connected' && !this.protocolConfirmed) {
            this.markLive()
          }

          if (msg.type === 'update' || msg.type === 'full-reload' || msg.type === 'reload') {
            if (!this.protocolConfirmed) this.markLive()
            this.options.onUpdate(msg)
          }

          if (msg.type === 'ping') {
            this.ws?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          }
        } catch {
          // Runtime may emit non-JSON HMR payloads (ignore for protocol).
        }
      }

      this.ws.onclose = () => {
        const wasLive = this.protocolConfirmed
        this.stopHeartbeat()
        this.ws = null
        if (wasLive) {
          this.protocolConfirmed = false
          this.options.onConnectionChange(false)
        }

        if (this.intentionalClose) {
          this.setState('disconnected')
          return
        }

        if (!this.openedThisAttempt && this.tryNextPathCandidate()) {
          this.connect()
          return
        }

        // Vite required payload but never got it — treat as failed candidate.
        if (this.openedThisAttempt && !wasLive && this.tryNextPathCandidate()) {
          this.connect()
          return
        }

        this.tryReconnect()
      }

      this.ws.onerror = () => {
        this.options.onError(
          new Error(
            `HMR websocket failed on path ${this.options.hmrPathCandidates[this.pathIndex]?.path || 'unknown'}`,
          ),
        )
      }
    } catch (err) {
      this.options.onError(err instanceof Error ? err : new Error(String(err)))
      if (!this.tryNextPathCandidate()) {
        this.tryReconnect()
      } else {
        this.connect()
      }
    }
  }

  disconnect(): void {
    this.intentionalClose = true
    this.clearReconnectTimer()
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    const wasLive = this.protocolConfirmed
    this.protocolConfirmed = false
    this.setState('disconnected')
    if (wasLive) this.options.onConnectionChange(false)
  }

  send(msg: HMRMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(msg))
    return true
  }

  /**
   * Best-effort Vite-style invalidate for applied module paths.
   * Returns false when WS is not protocol-live (caller should rely on Vite file watcher).
   */
  invalidateModules(paths: string[]): boolean {
    if (!this.isProtocolLive() || this.activeEngine !== 'vite') return false
    const cleaned = paths.map((p) => p.trim()).filter(Boolean)
    if (cleaned.length === 0) return false
    for (const path of cleaned) {
      const ok = this.send({
        type: 'custom',
        event: 'vite:invalidate',
        data: { path, message: 'aethel-governed-apply' },
        path,
        timestamp: Date.now(),
      })
      if (!ok) return false
    }
    return true
  }

  triggerFullReload(): void {
    this.send({ type: 'full-reload', timestamp: Date.now() })
  }

  private markLive(): void {
    if (this.protocolConfirmed) return
    this.protocolConfirmed = true
    this.setState('connected')
    this.reconnectAttempts = 0
    this.options.onConnectionChange(true)
  }

  private buildWsUrl(candidate: NormalizedCandidate | undefined): string {
    const runtimeUrl = this.options.runtimeUrl.replace(/^http/, 'ws').replace(/\/$/, '')
    const path = candidate?.path ?? '/_next/webpack-hmr'
    if (!path || path === '/') return `${runtimeUrl}/`
    if (path.startsWith('?')) return `${runtimeUrl}/${path}`
    return `${runtimeUrl}${path.startsWith('/') ? path : `/${path}`}`
  }

  private tryNextPathCandidate(): boolean {
    if (this.pathIndex < this.options.hmrPathCandidates.length - 1) {
      this.pathIndex += 1
      return true
    }
    this.pathIndex = 0
    return false
  }

  private setState(state: HMRBridgeState): void {
    this.state = state
    this.listeners.forEach((fn) => fn(state))
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setState('failed')
      return
    }

    this.setState('reconnecting')
    this.reconnectAttempts += 1
    this.pathIndex = 0
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => this.connect(), this.options.reconnectInterval)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    // Next webpack-hmr accepts JSON ping; Vite may ignore — harmless.
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() })
    }, 15_000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}

export function createHMRBridge(options: HMRBridgeOptions): HMRBridge {
  const bridge = new HMRBridge(options)
  bridge.connect()
  return bridge
}
