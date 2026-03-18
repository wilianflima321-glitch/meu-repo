/**
 * Aethel Engine - HMR Bridge
 * WebSocket proxy for Hot Module Replacement messages from Vite/Next.js
 * Connects the preview sandbox to the IDE for real-time updates.
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
  /** The URL of the preview runtime (e.g., sandbox URL) */
  runtimeUrl: string
  /** WebSocket path for HMR (default: /_next/webpack-hmr or /__vite_hmr) */
  hmrPath?: string
  /** Callback when HMR update is received */
  onUpdate?: (msg: HMRMessage) => void
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Reconnect interval in ms (default: 2000) */
  reconnectInterval?: number
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number
}

export type HMRBridgeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

export class HMRBridge {
  private ws: WebSocket | null = null
  private state: HMRBridgeState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private options: Required<HMRBridgeOptions>
  private listeners: Set<(state: HMRBridgeState) => void> = new Set()
  private messageBuffer: HMRMessage[] = []

  constructor(options: HMRBridgeOptions) {
    this.options = {
      hmrPath: '/_next/webpack-hmr',
      onUpdate: () => {},
      onConnectionChange: () => {},
      onError: () => {},
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      ...options,
    }
  }

  /** Get current bridge state */
  getState(): HMRBridgeState {
    return this.state
  }

  /** Get buffered messages (useful for debugging) */
  getMessageBuffer(): readonly HMRMessage[] {
    return this.messageBuffer
  }

  /** Subscribe to state changes */
  onStateChange(listener: (state: HMRBridgeState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Connect to the HMR WebSocket */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.setState('connecting')
    const runtimeUrl = this.options.runtimeUrl.replace(/^http/, 'ws')
    const wsUrl = `${runtimeUrl}${this.options.hmrPath}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
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

          // Buffer last 100 messages
          this.messageBuffer.push({ ...msg, timestamp: Date.now() })
          if (this.messageBuffer.length > 100) this.messageBuffer.shift()

          if (msg.type === 'update' || msg.type === 'full-reload') {
            this.options.onUpdate(msg)
          }

          if (msg.type === 'ping') {
            this.ws?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          }
        } catch {
          // Non-JSON messages from Vite/Webpack are common, ignore
        }
      }

      this.ws.onclose = () => {
        this.options.onConnectionChange(false)
        this.stopHeartbeat()
        this.tryReconnect()
      }

      this.ws.onerror = (event) => {
        this.options.onError(new Error(`HMR WebSocket error: ${event}`))
      }
    } catch (err) {
      this.options.onError(err instanceof Error ? err : new Error(String(err)))
      this.tryReconnect()
    }
  }

  /** Disconnect from HMR */
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

  /** Send a message to the HMR socket */
  send(msg: HMRMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(msg))
    return true
  }

  /** Force a full reload signal */
  triggerFullReload(): void {
    this.send({ type: 'full-reload', timestamp: Date.now() })
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
    this.reconnectAttempts++
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

/** Factory: create and immediately connect an HMR bridge */
export function createHMRBridge(options: HMRBridgeOptions): HMRBridge {
  const bridge = new HMRBridge(options)
  bridge.connect()
  return bridge
}
