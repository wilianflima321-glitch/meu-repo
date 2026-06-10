import { describe, expect, it } from 'vitest'
import { ComputedSignal, DeferredEvent, EventBus, Signal, TypedEventEmitter } from '@/lib/events/event-bus-system'

describe('event bus reactive exports', () => {
  it('dispatches typed events through the canonical barrel', () => {
    EventBus.resetInstance()
    const emitter = new TypedEventEmitter<{ ready: { id: string } }>('agent')
    const seen: string[] = []

    const off = emitter.on('ready', (payload) => seen.push(payload.id))
    emitter.emit('ready', { id: 'planner' })
    off()
    emitter.emit('ready', { id: 'engineer' })

    expect(seen).toEqual(['planner'])
  })

  it('updates signals and computed signals', () => {
    EventBus.resetInstance()
    const source = new Signal<number>(1, 'source')
    const doubled = new ComputedSignal(() => source.get() * 2, [source as Signal<unknown>])
    const seen: number[] = []

    const off = doubled.subscribe((value) => seen.push(value))
    source.set(3)
    source.update((value) => value + 1)
    off()
    source.set(10)

    expect(doubled.get()).toBe(20)
    expect(seen).toEqual([6, 8])
  })

  it('resolves deferred events once', async () => {
    EventBus.resetInstance()
    const deferred = new DeferredEvent<string>('asset-ready')
    const promise = deferred.toPromise()

    deferred.resolve('receipt-1')
    deferred.resolve('receipt-2')

    await expect(promise).resolves.toBe('receipt-1')
    expect(deferred.getValue()).toBe('receipt-1')
  })
})
