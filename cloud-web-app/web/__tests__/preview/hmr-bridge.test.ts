import { afterEach, describe, expect, it, vi } from 'vitest'
import { HMRBridge } from '@/lib/preview/hmr-bridge'

class FakeWebSocket {
  static OPEN = 1
  static CONNECTING = 0
  static instances: FakeWebSocket[] = []
  readyState = FakeWebSocket.CONNECTING
  url: string
  protocol: string
  onopen: ((ev?: unknown) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: ((ev?: unknown) => void) | null = null
  onerror: ((ev?: unknown) => void) | null = null
  sent: string[] = []

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    this.protocol = Array.isArray(protocols) ? protocols[0] || '' : protocols || ''
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.onclose?.({})
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.({})
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

describe('L.8 HMRBridge Vite/Next protocol', () => {
  afterEach(() => {
    FakeWebSocket.instances = []
    vi.unstubAllGlobals()
  })

  it('marks Next webpack-hmr live on open (no connected payload required)', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
    const onConnectionChange = vi.fn()
    const bridge = new HMRBridge({
      runtimeUrl: 'http://localhost:3000',
      hmrPathCandidates: [
        { path: '/_next/webpack-hmr', engine: 'webpack-next', requireConnectedPayload: false },
      ],
      onConnectionChange,
      maxReconnectAttempts: 0,
    })
    bridge.connect()
    const ws = FakeWebSocket.instances[0]!
    expect(ws.url).toBe('ws://localhost:3000/_next/webpack-hmr')
    ws.open()
    expect(onConnectionChange).toHaveBeenCalledWith(true)
    expect(bridge.isProtocolLive()).toBe(true)
    expect(bridge.getActiveEngine()).toBe('webpack-next')
    bridge.disconnect()
  })

  it('requires Vite connected payload before claiming live; supports invalidate', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
    const onConnectionChange = vi.fn()
    const bridge = new HMRBridge({
      runtimeUrl: 'http://localhost:5173',
      hmrPathCandidates: [
        { path: '', protocols: ['vite-hmr'], engine: 'vite', requireConnectedPayload: true },
      ],
      onConnectionChange,
      maxReconnectAttempts: 0,
    })
    bridge.connect()
    const ws = FakeWebSocket.instances[0]!
    expect(ws.protocol).toBe('vite-hmr')
    ws.open()
    expect(onConnectionChange).not.toHaveBeenCalled()
    expect(bridge.isProtocolLive()).toBe(false)

    ws.emit({ type: 'connected' })
    expect(onConnectionChange).toHaveBeenCalledWith(true)
    expect(bridge.isProtocolLive()).toBe(true)
    expect(bridge.getActiveEngine()).toBe('vite')

    expect(bridge.invalidateModules(['src/App.tsx'])).toBe(true)
    expect(ws.sent.some((s) => s.includes('vite:invalidate') && s.includes('src/App.tsx'))).toBe(true)
    bridge.disconnect()
  })

  it('does not claim HMR invalidate when not protocol-live', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
    const bridge = new HMRBridge({
      runtimeUrl: 'http://localhost:5173',
      hmrPathCandidates: [
        { path: '', protocols: ['vite-hmr'], engine: 'vite', requireConnectedPayload: true },
      ],
      maxReconnectAttempts: 0,
    })
    bridge.connect()
    FakeWebSocket.instances[0]!.open()
    expect(bridge.invalidateModules(['a.ts'])).toBe(false)
    bridge.disconnect()
  })
})
