/**
 * Letter bp — Object Pool / Frame Arena zero-stutter deepen (Zero-MVP honesty).
 * objectPoolEnforced flips on soak; zeroStutterMarketingAllowed stays false.
 */

import { describe, expect, it } from 'vitest'
import { ObjectPool } from '@/lib/runtime/object-pool'
import {
  FrameArena,
  GAMEPLAY_HOT_PATH_RULES,
  assertNoHotPathAlloc,
} from '@/lib/runtime/frame-arena'
import {
  GAMEPLAY_POOL_BUS_WIRED,
  createGameplayPoolBus,
  runObjectPoolSoak,
  probeGameplayPoolBusWired,
} from '@/lib/runtime/gameplay-pool-bus'
import {
  probeObjectPoolHonesty,
  proveObjectPoolSoak,
  probeObjectPoolWired,
} from '@/lib/runtime/object-pool-honesty'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'

describe('Object pool deepen (bp)', () => {
  it('prewarmed pool shows no alloc growth; hotPathFactoryCalls stay 0', () => {
    const pool = new ObjectPool({
      factory: () => ({ x: 0, y: 0 }),
      reset: (o) => {
        o.x = 0
        o.y = 0
      },
      initialSize: 32,
      maxSize: 64,
    })
    const growth = pool.measureAllocGrowth(32)
    expect(growth.grew).toBe(false)
    expect(growth.createdAfter).toBe(growth.createdBefore)
    expect(growth.hotPathFactoryCalls).toBe(0)
    expect(pool.stats().grewPastPrewarm).toBe(false)
  })

  it('tryAcquire returns null instead of growing past free list', () => {
    const pool = new ObjectPool({
      factory: () => ({ v: 1 }),
      initialSize: 2,
      maxSize: 2,
    })
    pool.enableHotPath()
    expect(pool.tryAcquire()).not.toBeNull()
    expect(pool.tryAcquire()).not.toBeNull()
    expect(pool.tryAcquire()).toBeNull()
    expect(pool.stats().hotPathFactoryCalls).toBe(0)
  })
})

describe('Frame arena + assertNoHotPathAlloc (bp)', () => {
  it('beginFrame resets used bytes; capacity fixed', () => {
    const arena = new FrameArena(4096)
    arena.beginFrame()
    const a = arena.allocFloat32(16)
    expect(a.length).toBe(16)
    expect(arena.stats().usedBytes).toBeGreaterThan(0)
    arena.endFrame()
    arena.beginFrame()
    expect(arena.stats().usedBytes).toBe(0)
    expect(arena.capacityBytes()).toBe(4096)
    expect(GAMEPLAY_HOT_PATH_RULES.some((r) => /zeroStutterMarketingAllowed/i.test(r))).toBe(
      true,
    )
  })

  it('assertNoHotPathAlloc throws on pool factory growth', () => {
    expect(() =>
      assertNoHotPathAlloc(
        { poolCreated: 8, poolHotPathFactoryCalls: 0, arenaCapacityBytes: 1024 },
        {
          poolCreated: 9,
          poolHotPathFactoryCalls: 1,
          arenaCapacityBytes: 1024,
          label: 'test',
        },
      ),
    ).toThrow(/pool created grew/)
  })
})

describe('Gameplay pool bus soak (bp)', () => {
  it('N frames keep pool stats stable (soak evidence)', () => {
    expect(GAMEPLAY_POOL_BUS_WIRED).toBe(true)
    expect(probeGameplayPoolBusWired()).toBe(true)
    const soak = runObjectPoolSoak(240)
    expect(soak.passed).toBe(true)
    expect(soak.grew).toBe(false)
    expect(soak.statsAfter.projectiles.created).toBe(soak.statsBefore.projectiles.created)
    expect(soak.statsAfter.scratch.created).toBe(soak.statsBefore.scratch.created)
    expect(soak.statsAfter.arena.capacityBytes).toBe(soak.statsBefore.arena.capacityBytes)
    expect(soak.statsAfter.projectiles.hotPathFactoryCalls).toBe(0)
    expect(soak.frames).toBe(240)
  })

  it('spawn/update/despawn projectiles without hot-path factory', () => {
    const bus = createGameplayPoolBus({ projectileCapacity: 16, arenaBytes: 4096 })
    const before = bus.hotPathSnapshot('before')
    bus.beginFrame()
    const p = bus.spawnProjectile({
      x: 0,
      y: 1,
      z: 0,
      vx: 10,
      vy: 0,
      vz: 0,
      life: 1,
    })
    expect(p).not.toBeNull()
    bus.updateProjectiles(1 / 60)
    expect(bus.getActiveProjectiles().length).toBe(1)
    bus.despawnProjectile(p!)
    bus.endFrame()
    const after = bus.hotPathSnapshot('after')
    expect(() => assertNoHotPathAlloc(before, after)).not.toThrow()
  })
})

describe('Object pool honesty (bp)', () => {
  it('objectPoolEnforced true after soak; zeroStutterMarketingAllowed always false', () => {
    expect(probeObjectPoolWired()).toBe(true)
    const proved = proveObjectPoolSoak(120)
    expect(proved.passed).toBe(true)

    const honesty = probeObjectPoolHonesty()
    expect(honesty.objectPoolEnforced).toBe(true)
    expect(honesty.soakPassed).toBe(true)
    expect(honesty.zeroStutterMarketingAllowed).toBe(false)

    const forcedOff = probeObjectPoolHonesty({ soakPassed: false })
    expect(forcedOff.objectPoolEnforced).toBe(false)
    expect(forcedOff.zeroStutterMarketingAllowed).toBe(false)
  })

  it('aaa-production aggregate auto-proves objectPoolEnforced; marketing fail-closed', () => {
    const report = evaluateAaaProductionHonesty()
    expect(report.capability.objectPoolEnforced).toBe(true)
    expect(report.capability.zeroStutterMarketingAllowed).toBe(false)
    expect(report.capability.marketingAaaProductionAllowed).toBe(false)
    const gap5 = report.gaps.find((g) => g.id === 5)!
    expect(gap5.scaffoldStatus).toBe('CLOSED')
    expect(gap5.shipStatus).toBe('CLOSED')
    expect(gap5.notes.some((n) => /zeroStutterMarketingAllowed/i.test(n))).toBe(true)

    const held = probeAaaProductionCapability({ objectPoolSoakPassed: false })
    expect(held.objectPoolEnforced).toBe(false)
    expect(held.zeroStutterMarketingAllowed).toBe(false)
  })
})
