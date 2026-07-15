/**
 * Onda M — Per-frame bump arena (reset each tick; no GC in hot path).
 * Gameplay update docs: allocate temporaries from arena, never `new` in tick.
 * Letter bp: beginFrame/endFrame + assertNoHotPathAlloc for soak tests.
 */

export interface FrameArenaStats {
  capacityBytes: number
  usedBytes: number
  highWaterBytes: number
  resetCount: number
  frameCount: number
}

/**
 * Byte bump allocator over a preallocated ArrayBuffer.
 * Not a general malloc — intentional for frame-scoped scratch.
 */
export class FrameArena {
  private readonly buffer: ArrayBuffer
  private offset = 0
  private highWater = 0
  private resetCount = 0
  private frameCount = 0

  constructor(capacityBytes: number) {
    this.buffer = new ArrayBuffer(Math.max(64, capacityBytes))
  }

  /** Alias for reset — call at frame start before scratch allocs. */
  beginFrame(): void {
    this.reset()
    this.frameCount += 1
  }

  /** Frame end hook — records high-water; does not free (bump reset next begin). */
  endFrame(): void {
    this.highWater = Math.max(this.highWater, this.offset)
  }

  reset(): void {
    this.highWater = Math.max(this.highWater, this.offset)
    this.offset = 0
    this.resetCount += 1
  }

  allocBytes(byteLength: number, align = 8): number {
    const a = Math.max(1, align)
    const aligned = (this.offset + (a - 1)) & ~(a - 1)
    if (aligned + byteLength > this.buffer.byteLength) {
      throw new Error(
        `FrameArena OOM: need ${byteLength} at ${aligned}, capacity ${this.buffer.byteLength}`,
      )
    }
    this.offset = aligned + byteLength
    return aligned
  }

  allocFloat32(count: number): Float32Array {
    const bytes = count * 4
    const at = this.allocBytes(bytes, 4)
    return new Float32Array(this.buffer, at, count)
  }

  allocUint32(count: number): Uint32Array {
    const bytes = count * 4
    const at = this.allocBytes(bytes, 4)
    return new Uint32Array(this.buffer, at, count)
  }

  allocInt16(count: number): Int16Array {
    const bytes = count * 2
    const at = this.allocBytes(bytes, 2)
    return new Int16Array(this.buffer, at, count)
  }

  /** Capacity is fixed at construction — never grows (soak invariant). */
  capacityBytes(): number {
    return this.buffer.byteLength
  }

  stats(): FrameArenaStats {
    return {
      capacityBytes: this.buffer.byteLength,
      usedBytes: this.offset,
      highWaterBytes: Math.max(this.highWater, this.offset),
      resetCount: this.resetCount,
      frameCount: this.frameCount,
    }
  }
}

/**
 * Lint/rule helper text for gameplay loops — document + test enforcement.
 */
export const GAMEPLAY_HOT_PATH_RULES = [
  'Do not call `new` / allocate objects inside fixed update / tick',
  'Prefer ObjectPool.acquire/release for entity-scoped temporaries',
  'Prefer FrameArena.alloc* for scratch buffers; beginFrame()/reset() at frame start',
  'GAS / particles already use typed-array pools — extend those patterns',
  'objectPoolEnforced flips only when soak tests prove zero alloc growth',
  'zeroStutterMarketingAllowed stays false until Founder soak (M.1) — no fake AAA marketing',
] as const

export function gameplayHotPathRuleSummary(): string {
  return GAMEPLAY_HOT_PATH_RULES.join('\n')
}

export interface HotPathAllocSnapshot {
  poolCreated: number
  poolHotPathFactoryCalls: number
  arenaCapacityBytes: number
  label?: string
}

/**
 * Test/soak helper: throws when pooled types grew via `new` on the hot path
 * or when the frame arena capacity changed (illegal grow).
 */
export function assertNoHotPathAlloc(
  before: HotPathAllocSnapshot,
  after: HotPathAllocSnapshot,
): void {
  const tag = after.label ?? before.label ?? 'hot-path'
  if (after.poolCreated > before.poolCreated) {
    throw new Error(
      `assertNoHotPathAlloc(${tag}): pool created grew ${before.poolCreated}→${after.poolCreated}`,
    )
  }
  if (after.poolHotPathFactoryCalls > before.poolHotPathFactoryCalls) {
    throw new Error(
      `assertNoHotPathAlloc(${tag}): hotPathFactoryCalls grew ${before.poolHotPathFactoryCalls}→${after.poolHotPathFactoryCalls}`,
    )
  }
  if (after.arenaCapacityBytes !== before.arenaCapacityBytes) {
    throw new Error(
      `assertNoHotPathAlloc(${tag}): arena capacity changed ${before.arenaCapacityBytes}→${after.arenaCapacityBytes}`,
    )
  }
}
