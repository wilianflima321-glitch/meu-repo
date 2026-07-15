/**
 * Onda M — Generic object pool for gameplay hot path (no `new` in update).
 * Complements GAS effect-pool / particle pools with a reusable allocator API.
 * Letter bp: deepen + soak evidence for `objectPoolEnforced` (not zero-stutter marketing).
 */

export interface ObjectPoolStats {
  capacity: number
  inUse: number
  free: number
  created: number
  acquireCount: number
  releaseCount: number
  /** Factory calls after construction/prewarm — must stay 0 on enforced hot path. */
  hotPathFactoryCalls: number
  grewPastPrewarm: boolean
}

export interface ObjectPoolOptions<T> {
  factory: () => T
  reset?: (item: T) => void
  initialSize?: number
  /** Soft max — growing past this marks honesty as not enforced for AAA claim. */
  maxSize?: number
}

/**
 * Fixed-capacity-first object pool. Prefer prewarm; grow only when needed.
 */
export class ObjectPool<T> {
  private readonly free: T[] = []
  private readonly factory: () => T
  private readonly resetFn?: (item: T) => void
  private readonly maxSize: number
  private created = 0
  private acquireCount = 0
  private releaseCount = 0
  private inUse = 0
  private prewarmed = 0
  private hotPathFactoryCalls = 0
  private hotPathMode = false
  private grewPastPrewarm = false

  constructor(options: ObjectPoolOptions<T>) {
    this.factory = options.factory
    this.resetFn = options.reset
    this.maxSize = options.maxSize ?? 10_000
    const initial = Math.max(0, options.initialSize ?? 0)
    for (let i = 0; i < initial; i++) {
      this.free.push(this.create(false))
    }
    this.prewarmed = this.created
  }

  /** Pre-allocate until `target` free slots exist (cold path only). */
  prewarm(target: number): void {
    const n = Math.max(0, Math.min(target, this.maxSize))
    while (this.created < n) {
      this.free.push(this.create(false))
    }
    this.prewarmed = Math.max(this.prewarmed, this.created)
  }

  /**
   * After enableHotPath(), every factory call counts as a soak violation.
   * Call once construction/prewarm is done.
   */
  enableHotPath(): void {
    this.hotPathMode = true
  }

  private create(fromHotPath: boolean): T {
    if (this.created >= this.maxSize) {
      throw new Error(`ObjectPool exhausted (maxSize=${this.maxSize})`)
    }
    this.created += 1
    if (fromHotPath || this.hotPathMode) {
      this.hotPathFactoryCalls += 1
      if (this.created > this.prewarmed) {
        this.grewPastPrewarm = true
      }
    }
    return this.factory()
  }

  acquire(): T {
    this.acquireCount += 1
    this.inUse += 1
    const item = this.free.pop()
    if (item !== undefined) return item
    return this.create(true)
  }

  /** Soft acquire — returns null instead of growing past free list. */
  tryAcquire(): T | null {
    const item = this.free.pop()
    if (item === undefined) return null
    this.acquireCount += 1
    this.inUse += 1
    return item
  }

  release(item: T): void {
    this.resetFn?.(item)
    this.free.push(item)
    this.releaseCount += 1
    this.inUse = Math.max(0, this.inUse - 1)
  }

  stats(): ObjectPoolStats {
    return {
      capacity: this.created,
      inUse: this.inUse,
      free: this.free.length,
      created: this.created,
      acquireCount: this.acquireCount,
      releaseCount: this.releaseCount,
      hotPathFactoryCalls: this.hotPathFactoryCalls,
      grewPastPrewarm: this.grewPastPrewarm,
    }
  }

  /**
   * Hot-path stress: acquire/release N times; created must not grow after prewarm.
   */
  measureAllocGrowth(iterations: number): {
    createdBefore: number
    createdAfter: number
    grew: boolean
    hotPathFactoryCalls: number
  } {
    this.enableHotPath()
    const before = this.created
    const held: T[] = []
    for (let i = 0; i < iterations; i++) {
      held.push(this.acquire())
    }
    for (const item of held) {
      this.release(item)
    }
    const after = this.created
    return {
      createdBefore: before,
      createdAfter: after,
      grew: after > before,
      hotPathFactoryCalls: this.hotPathFactoryCalls,
    }
  }
}
