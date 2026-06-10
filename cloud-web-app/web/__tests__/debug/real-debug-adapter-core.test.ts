import { afterEach, describe, expect, it, vi } from 'vitest'
import { RealDebugAdapterCore } from '@/lib/debug/real-debug-adapter-core'
import {
  sendDebugAdapterRequest,
  startDebugAdapterSession,
} from '@/lib/debug/real-debug-adapter-transport'

vi.mock('@/lib/debug/real-debug-adapter-transport', () => ({
  fetchDebugAdapterEvents: vi.fn().mockResolvedValue([]),
  sendDebugAdapterRequest: vi.fn(async (_sessionId: string, command: string) => (
    command === 'initialize' ? { supportsRestartRequest: true } : {}
  )),
  startDebugAdapterSession: vi.fn().mockResolvedValue('session-1'),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('real debug adapter core', () => {
  it('initializes, launches and disconnects through the DAP transport contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    const adapter = new RealDebugAdapterCore({
      type: 'node',
      request: 'launch',
      name: 'Node app',
      program: 'src/index.ts',
      runtimeExecutable: 'node',
      runtimeArgs: ['--inspect'],
      skipFiles: ['<node_internals>/**'],
    })

    await adapter.initialize()
    await adapter.launch()
    await adapter.disconnect()

    expect(startDebugAdapterSession).toHaveBeenCalledWith(expect.objectContaining({ type: 'node' }))
    expect(sendDebugAdapterRequest).toHaveBeenCalledWith(
      'session-1',
      'initialize',
      expect.objectContaining({
        clientID: 'aethel-ide',
        adapterID: 'node',
        supportsRunInTerminalRequest: true,
      }),
    )
    expect(sendDebugAdapterRequest).toHaveBeenCalledWith(
      'session-1',
      'launch',
      expect.objectContaining({
        runtimeExecutable: 'node',
        runtimeArgs: ['--inspect'],
        skipFiles: ['<node_internals>/**'],
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/dap/session/stop', expect.objectContaining({ method: 'POST' }))

    fetchMock.mockRestore()
  })
})
