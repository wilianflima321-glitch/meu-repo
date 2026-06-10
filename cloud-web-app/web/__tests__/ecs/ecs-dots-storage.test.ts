import { describe, expect, it } from 'vitest'
import { ArchetypeStorage, ComponentRegistry } from '@/lib/ecs-dots-system'
import { SystemScheduler } from '@/lib/ecs-dots-scheduler'

describe('ecs-dots storage and scheduler', () => {
  it('stores entities by archetype, supports query filters and swap-removal', () => {
    const registry = new ComponentRegistry()
    const transform = registry.register('Transform', [{ name: 'x', type: 'float32' }])
    const velocity = registry.register('Velocity', [{ name: 'x', type: 'float32' }])
    const render = registry.register('Render', [{ name: 'visible', type: 'uint8' }])
    const storage = new ArchetypeStorage(registry, 2)

    const moving = storage.getOrCreateArchetype([transform, velocity])
    const rendered = storage.getOrCreateArchetype([transform, render])

    storage.addEntity(1, moving)
    storage.addEntity(2, moving)
    storage.addEntity(3, rendered)

    expect(storage.queryArchetypes({ all: [transform], any: [velocity], none: [render] })).toEqual([moving])

    expect(storage.removeEntity(1)).toBe(true)
    expect(storage.getEntityIndex(2)).toBe(0)
    expect(moving.entityIds.slice(0, moving.entityCount)).toEqual([2])
  })

  it('orders enabled systems by priority and skips disabled systems', () => {
    const scheduler = new SystemScheduler()
    const noop = () => undefined

    scheduler.registerSystem({ id: 1, name: 'low', priority: 0, query: {}, update: noop })
    scheduler.registerSystem({ id: 2, name: 'high', priority: 10, query: {}, update: noop })
    scheduler.registerSystem({ id: 3, name: 'disabled', priority: 100, enabled: false, query: {}, update: noop })

    expect(scheduler.getSystems().map((system) => system.id)).toEqual([2, 1])

    scheduler.enableSystem(3, true)
    expect(scheduler.getSystems().map((system) => system.id)).toEqual([3, 2, 1])
  })
})
