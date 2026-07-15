import { EventEmitter } from 'events'

import { createComponentLogger, logger } from '@/lib/observability/logger'

import { createDapInitializeArguments } from './dap-client.defaults'
import { dispatchDapEvent } from './dap-client.events'
import type { DapEvent, DapRequest, DapResponse } from './dap-client.contracts'

const log = createComponentLogger('dap-client')

export class DapTransportClient extends EventEmitter {
  private ws: WebSocket | null = null
  private seq = 0
  private pendingRequests = new Map<number, { resolve: (value: DapResponse) => void; reject: (error: Error) => void }>()
  private capabilities: Record<string, unknown> = {}
  private isInitialized = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(private wsUrl: string = 'ws://localhost:3001/debug') {
    super()
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        log.info('[DAP Client] Connected to debug server')
        this.reconnectAttempts = 0
        this.emit('connected')
        resolve()
      }

      this.ws.onclose = () => {
        log.info('[DAP Client] Disconnected from debug server')
        this.emit('disconnected')
        this.handleDisconnect()
      }

      this.ws.onerror = (error) => {
        logger.error('[DAP Client] WebSocket error:', error)
        reject(new Error('Failed to connect to debug server'))
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data))
      }
    })
  }

  protected sendRequest<T extends Record<string, unknown> = Record<string, unknown>>(
    command: string,
    args?: Record<string, unknown>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const seq = ++this.seq
      const request: DapRequest = {
        seq,
        type: 'request',
        command,
        arguments: args,
      }

      this.pendingRequests.set(seq, {
        resolve: (response: DapResponse) => resolve(response.body as T),
        reject,
      })

      this.ws.send(JSON.stringify(request))

      setTimeout(() => {
        if (this.pendingRequests.has(seq)) {
          this.pendingRequests.delete(seq)
          reject(new Error(`Request ${command} timed out`))
        }
      }, 30000)
    })
  }

  async initialize(): Promise<Record<string, unknown>> {
    const response = await this.sendRequest<{ capabilities?: Record<string, unknown> }>(
      'initialize',
      createDapInitializeArguments(),
    )

    this.capabilities = response.capabilities || {}
    return this.capabilities
  }

  get initialized(): boolean {
    return this.isInitialized
  }

  getCapabilities(): Record<string, unknown> {
    return { ...this.capabilities }
  }

  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.pendingRequests.clear()
    this.isInitialized = false
  }

  private async handleDisconnect(): Promise<void> {
    this.isInitialized = false

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = 1000 * Math.pow(2, this.reconnectAttempts - 1)
      log.info(`[DAP Client] Attempting reconnect in ${delay}ms`)

      setTimeout(async () => {
        try {
          await this.connect()
        } catch (error) {
          logger.error('[DAP Client] Reconnect failed:', error)
        }
      }, delay)
    }
  }

  private handleMessage(message: DapResponse | DapEvent): void {
    if (message.type === 'response') {
      const response = message as DapResponse
      const pending = this.pendingRequests.get(response.request_seq)

      if (pending) {
        this.pendingRequests.delete(response.request_seq)
        if (response.success) pending.resolve(response)
        else pending.reject(new Error(response.message || 'Request failed'))
      }
      return
    }

    if (message.type === 'event') this.handleEvent(message as DapEvent)
  }

  private handleEvent(event: DapEvent): void {
    dispatchDapEvent(event, {
      markInitialized: () => {
        this.isInitialized = true
      },
      updateCapabilities: (capabilities) => {
        this.capabilities = { ...this.capabilities, ...capabilities }
        return this.capabilities
      },
      emit: (eventName, ...args) => {
        this.emit(eventName, ...args)
      },
      logUnknown: (eventName, body) => {
        log.info('[DAP Client] Unknown event:', eventName, body)
      },
    })
  }
}
