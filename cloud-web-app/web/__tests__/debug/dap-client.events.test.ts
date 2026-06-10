import { describe, expect, it } from 'vitest'
import { createDapInitializeArguments } from '@/lib/dap-client.defaults'
import { dispatchDapEvent } from '@/lib/dap-client.events'
import type { DapEvent } from '@/lib/dap-client.contracts'

describe('dap-client event dispatcher', () => {
  it('dispatches initialization and capability events through the transport callbacks', () => {
    const emitted: Array<{ name: string; args: unknown[] }> = []
    let initialized = false
    let capabilities: Record<string, unknown> = { supportsStepBack: false }

    const dispatcher = {
      markInitialized: () => {
        initialized = true
      },
      updateCapabilities: (next: Record<string, unknown>) => {
        capabilities = { ...capabilities, ...next }
        return capabilities
      },
      emit: (name: string, ...args: unknown[]) => {
        emitted.push({ name, args })
      },
      logUnknown: () => undefined,
    }

    dispatchDapEvent({ seq: 1, type: 'event', event: 'initialized' }, dispatcher)
    dispatchDapEvent({
      seq: 2,
      type: 'event',
      event: 'capabilities',
      body: { capabilities: { supportsStepBack: true } },
    } satisfies DapEvent, dispatcher)

    expect(initialized).toBe(true)
    expect(capabilities).toEqual({ supportsStepBack: true })
    expect(emitted.map((event) => event.name)).toEqual(['initialized', 'capabilities'])
  })

  it('keeps initialize arguments stable for the Aethel debug adapter', () => {
    expect(createDapInitializeArguments()).toMatchObject({
      clientID: 'aethel-engine',
      clientName: 'Aethel Engine IDE',
      adapterID: 'aethel',
      supportsRunInTerminalRequest: true,
      supportsMemoryReferences: true,
    })
  })
})
