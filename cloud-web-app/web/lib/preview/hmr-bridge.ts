/**
 * Aethel Engine - HMR Bridge
 * Unified WebSocket bridge for Next.js and Vite preview runtimes.
 */

export type HMRMessageType =
  | 'connected'
  | 'update'
  | 'full-reload'
  | 'prune'
  | 'error'
  | 'custom'
  | 'ping'
  | 'pong'

export interface HMRMessage {
  type: HMRMessageType
  timestamp: number
  data?: unknown
  path?: string
  acceptedPath?: string
  error?: { message: string; stack?: string }
}

export interface HMRBridgeOptions {
  runtimeUrl: string
  hmrPath?: string
  hmrPathCandidates?: string[]
  onUpdate?: (msg: HMRMessage) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: Error) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

type ResolvedOptions = Omit<Required<HMRBridgeOptions>, 'hmrPath'> & { hmrPath: string | null }

export type HMRBridgeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

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
  private connectedThisAttempt = false

  constructor(options: HMRBridgeOptions) {
    const fallbackCandidates = ['/_next/webpack-hmr', '/__vite_hmr']
    const explicitCandidates = Array.isArray(options.hmrPathCandidates)
      ? options.hmrPathCandidates
      : options.hmrPath
        ? [options.hmrPath]
        : fallbackCandidates
    const hmrPathCandidates = Array.from(
      new Set(
        explicitCandidates
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    )

    this.options = {
      hmrPath: options.hmrPath ?? null,
      onUpdate: () => {},
      onConnectionChange: () => {},
      onError: () => {},
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      ...options,
      hmrPathCandidates,
    }
  }

  getState(): HMRBridgeState {
    return this.state
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

    this.setState('connecting')
    this.connectedThisAttempt = false
    const wsUrl = this.getCurrentWsUrl()

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.connectedThisAttempt = true
        this.setState('connected')
        this.reconnectAttempts = 0
        this.options.onConnectionChange(true)
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: HMRMessage = typeof event.data === 'string'
            ? JSON.parse(event.data)
            : event.data

          this.messageBuffer.push({ ...msg, timestamp: Date.now() })
          if (this.messageBuffer.length > 100) this.messageBuffer.shift()

          if (msg.type === 'update' || msg.type === 'full-reload') {
            this.options.onUpdate(msg)
          }

          if (msg.type === 'ping') {
            this.ws?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          }
        } catch {
          // Runtime may emit non-JSON HMR payloads.
        }
      }

      this.ws.onclose = () => {
        this.options.onConnectionChange(false)
        this.stopHeartbeat()
        this.ws = null

        if (!this.connectedThisAttempt && this.tryNextPathCandidate()) {
          this.connect()
          return
        }

        this.tryReconnect()
      }

      this.ws.onerror = () => {
        this.options.onError(
          new Error(`HMR websocket failed on path ${this.options.hmrPathCandidates[this.pathIndex] || 'unknown'}`)
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
    this.clearReconnectTimer()
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.setState('disconnected')
    this.options.onConnectionChange(false)
  }

  send(msg: HMRMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(msg))
    return true
  }

  triggerFullReload(): void {
    this.send({ type: 'full-reload', timestamp: Date.now() })
  }

  private getCurrentWsUrl(): string {
    const runtimeUrl = this.options.runtimeUrl.replace(/^http/, 'ws').replace(/\/$/, '')
    const path = this.options.hmrPathCandidates[this.pathIndex] || '/_next/webpack-hmr'
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
