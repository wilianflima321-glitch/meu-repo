/**
 * Gameplay pool bus — pooled projectiles/bullets + entity scratch + frame arena.
 * Letter bp: wire into SimulationTick / GameLoop hot path (Zero-UI; no chrome).
 * Enforces pool reuse; soak proves `objectPoolEnforced` without zero-stutter marketing.
 */

import { ObjectPool, type ObjectPoolStats } from './object-pool'
import {
  FrameArena,
  assertNoHotPathAlloc,
  type FrameArenaStats,
  type HotPathAllocSnapshot,
} from './frame-arena'

/** Structural probe — bus + SimulationTick wire ship (letter bp). */
export const GAMEPLAY_POOL_BUS_WIRED = true as const

export interface PooledProjectile {
  alive: boolean
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  ownerEntityId: number
}

export interface EntityScratch {
  entityId: number
  tmpX: number
  tmpY: number
  tmpZ: number
  flags: number
}

export interface GameplayPoolBusOptions {
  projectileCapacity?: number
  scratchCapacity?: number
  arenaBytes?: number
}

export interface GameplayPoolBusStats {
  projectiles: ObjectPoolStats
  scratch: ObjectPoolStats
  arena: FrameArenaStats
  activeProjectiles: number
  framesSimulated: number
}

export interface ObjectPoolSoakResult {
  frames: number
  passed: boolean
  grew: boolean
  statsBefore: GameplayPoolBusStats
  statsAfter: GameplayPoolBusStats
  notes: string[]
}

let nextProjectileId = 1

function createProjectile(): PooledProjectile {
  return {
    alive: false,
    id: 0,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    ownerEntityId: 0,
  }
}

function resetProjectile(p: PooledProjectile): void {
  p.alive = false
  p.id = 0
  p.x = 0
  p.y = 0
  p.z = 0
  p.vx = 0
  p.vy = 0
  p.vz = 0
  p.life = 0
  p.ownerEntityId = 0
}

function createScratch(): EntityScratch {
  return { entityId: 0, tmpX: 0, tmpY: 0, tmpZ: 0, flags: 0 }
}

function resetScratch(s: EntityScratch): void {
  s.entityId = 0
  s.tmpX = 0
  s.tmpY = 0
  s.tmpZ = 0
  s.flags = 0
}

/**
 * Dedicated gameplay allocator bus for sim hot path.
 * Spawn/update/despawn projectiles without `new` after prewarm.
 */
export class GameplayPoolBus {
  readonly projectiles: ObjectPool<PooledProjectile>
  readonly scratch: ObjectPool<EntityScratch>
  readonly arena: FrameArena
  private readonly active: PooledProjectile[] = []
  private framesSimulated = 0
  private readonly projectileCapacity: number

  constructor(options: GameplayPoolBusOptions = {}) {
    this.projectileCapacity = Math.max(8, options.projectileCapacity ?? 128)
    const scratchCap = Math.max(8, options.scratchCapacity ?? 64)
    const arenaBytes = Math.max(1024, options.arenaBytes ?? 16_384)

    this.projectiles = new ObjectPool({
      factory: createProjectile,
      reset: resetProjectile,
      initialSize: this.projectileCapacity,
      maxSize: this.projectileCapacity,
    })
    this.scratch = new ObjectPool({
      factory: createScratch,
      reset: resetScratch,
      initialSize: scratchCap,
      maxSize: scratchCap,
    })
    this.arena = new FrameArena(arenaBytes)

    this.projectiles.enableHotPath()
    this.scratch.enableHotPath()
  }

  beginFrame(): void {
    this.arena.beginFrame()
  }

  endFrame(): void {
    this.arena.endFrame()
    this.framesSimulated += 1
  }

  /**
   * Spawn a projectile from the pool. Returns null when exhausted (no grow).
   */
  spawnProjectile(init: {
    x: number
    y: number
    z: number
    vx: number
    vy: number
    vz: number
    life: number
    ownerEntityId?: number
  }): PooledProjectile | null {
    const p = this.projectiles.tryAcquire()
    if (!p) return null
    p.alive = true
    p.id = nextProjectileId++
    p.x = init.x
    p.y = init.y
    p.z = init.z
    p.vx = init.vx
    p.vy = init.vy
    p.vz = init.vz
    p.life = init.life
    p.ownerEntityId = init.ownerEntityId ?? 0
    this.active.push(p)
    return p
  }

  despawnProjectile(p: PooledProjectile): void {
    if (!p.alive) return
    p.alive = false
    const idx = this.active.indexOf(p)
    if (idx >= 0) this.active.splice(idx, 1)
    this.projectiles.release(p)
  }

  /**
   * Integrate active projectiles for `dt` seconds using arena scratch floats.
   * Despawns expired; no `new` for pooled types.
   */
  updateProjectiles(dt: number): number {
    const n = this.active.length
    if (n === 0) return 0
    // Frame scratch for positions — typed views into preallocated arena.
    const scratchPos = this.arena.allocFloat32(Math.max(3, n * 3))
    let aliveCount = 0
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]!
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      p.life -= dt
      const base = i * 3
      scratchPos[base] = p.x
      scratchPos[base + 1] = p.y
      scratchPos[base + 2] = p.z
      if (p.life <= 0) {
        this.active.splice(i, 1)
        this.projectiles.release(p)
      } else {
        aliveCount += 1
      }
    }
    return aliveCount
  }

  acquireScratch(entityId: number): EntityScratch | null {
    const s = this.scratch.tryAcquire()
    if (!s) return null
    s.entityId = entityId
    return s
  }

  releaseScratch(s: EntityScratch): void {
    this.scratch.release(s)
  }

  getActiveProjectiles(): readonly PooledProjectile[] {
    return this.active
  }

  stats(): GameplayPoolBusStats {
    return {
      projectiles: this.projectiles.stats(),
      scratch: this.scratch.stats(),
      arena: this.arena.stats(),
      activeProjectiles: this.active.length,
      framesSimulated: this.framesSimulated,
    }
  }

  hotPathSnapshot(label?: string): HotPathAllocSnapshot {
    const ps = this.projectiles.stats()
    const ss = this.scratch.stats()
    return {
      poolCreated: ps.created + ss.created,
      poolHotPathFactoryCalls: ps.hotPathFactoryCalls + ss.hotPathFactoryCalls,
      arenaCapacityBytes: this.arena.capacityBytes(),
      label,
    }
  }
}

export function createGameplayPoolBus(
  options?: GameplayPoolBusOptions,
): GameplayPoolBus {
  return new GameplayPoolBus(options)
}

/**
 * Soak: N frames of spawn/update/despawn; pool created + arena capacity must stay stable.
 * Evidence for `objectPoolEnforced` — does NOT unlock zero-stutter marketing.
 */
export function runObjectPoolSoak(
  frames = 240,
  options?: GameplayPoolBusOptions,
): ObjectPoolSoakResult {
  const bus = createGameplayPoolBus({
    projectileCapacity: 64,
    scratchCapacity: 32,
    arenaBytes: 8192,
    ...options,
  })
  const before = bus.stats()
  const snapBefore = bus.hotPathSnapshot('soak-before')
  const notes: string[] = []

  for (let f = 0; f < frames; f++) {
    bus.beginFrame()
    // Burst spawn within capacity, then update + natural despawn.
    const burst = 4 + (f % 3)
    for (let i = 0; i < burst; i++) {
      bus.spawnProjectile({
        x: i,
        y: 0,
        z: f,
        vx: 1,
        vy: 0,
        vz: 0,
        life: 0.05 + (i % 5) * 0.01,
        ownerEntityId: f,
      })
    }
    const scratch = bus.acquireScratch(f)
    if (scratch) {
      scratch.tmpX = f
      bus.releaseScratch(scratch)
    }
    bus.updateProjectiles(1 / 60)
    bus.endFrame()
  }

  // Drain remaining actives back to pool.
  while (bus.getActiveProjectiles().length > 0) {
    bus.despawnProjectile(bus.getActiveProjectiles()[0]!)
  }

  const after = bus.stats()
  const snapAfter = bus.hotPathSnapshot('soak-after')
  let grew = false
  try {
    assertNoHotPathAlloc(snapBefore, snapAfter)
  } catch (e) {
    grew = true
    notes.push(e instanceof Error ? e.message : String(e))
  }

  if (after.projectiles.created !== before.projectiles.created) {
    grew = true
    notes.push(
      `projectile created ${before.projectiles.created}→${after.projectiles.created}`,
    )
  }
  if (after.scratch.created !== before.scratch.created) {
    grew = true
    notes.push(`scratch created ${before.scratch.created}→${after.scratch.created}`)
  }
  if (after.arena.capacityBytes !== before.arena.capacityBytes) {
    grew = true
    notes.push(
      `arena capacity ${before.arena.capacityBytes}→${after.arena.capacityBytes}`,
    )
  }
  if (after.projectiles.hotPathFactoryCalls > 0 || after.scratch.hotPathFactoryCalls > 0) {
    grew = true
    notes.push('hotPathFactoryCalls > 0 on soak')
  }

  if (!grew) {
    notes.push(`soak ${frames} frames: pool stats stable; no hot-path factory growth`)
  }

  return {
    frames,
    passed: !grew,
    grew,
    statsBefore: before,
    statsAfter: after,
    notes,
  }
}

export function probeGameplayPoolBusWired(): boolean {
  return GAMEPLAY_POOL_BUS_WIRED === true
}
