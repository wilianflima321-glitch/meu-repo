/**
 * Competitive netcode — rollback frame store interfaces.
 * Ring buffer for inputs + optional state blobs. No desync-free claim.
 */

import type { Fixed } from './fixed-point'

export interface RollbackPlayerInput {
  playerId: string
  tick: number
  buttons: number
  /** Fixed-point axes when competitive path active; else ignored. */
  axisX: Fixed
  axisY: Fixed
}

export interface RollbackFrameSlot {
  tick: number
  inputs: RollbackPlayerInput[]
  /** Opaque state blob (serialized SoA / fixed-point snapshot). */
  stateBlob: Uint8Array | null
  checksum: string
}

export interface RollbackFrameBufferOptions {
  capacity: number
}

/**
 * Fixed-capacity ring of rollback frames. Overwrites oldest when full.
 */
export class RollbackFrameBuffer {
  private readonly capacity: number
  private readonly slots: Array<RollbackFrameSlot | undefined>
  private writeIndex = 0
  private size = 0
  private latestTick = -1

  constructor(options: RollbackFrameBufferOptions) {
    this.capacity = Math.max(1, options.capacity)
    this.slots = new Array(this.capacity)
  }

  push(frame: RollbackFrameSlot): void {
    this.slots[this.writeIndex] = frame
    this.writeIndex = (this.writeIndex + 1) % this.capacity
    this.size = Math.min(this.size + 1, this.capacity)
    this.latestTick = frame.tick
  }

  getByTick(tick: number): RollbackFrameSlot | undefined {
    for (let i = 0; i < this.size; i++) {
      const idx = (this.writeIndex - 1 - i + this.capacity * 2) % this.capacity
      const slot = this.slots[idx]
      if (slot?.tick === tick) return slot
    }
    return undefined
  }

  /** Frames from fromTick inclusive to latest, ascending. */
  sliceFrom(fromTick: number): RollbackFrameSlot[] {
    const out: RollbackFrameSlot[] = []
    for (let i = this.size - 1; i >= 0; i--) {
      const idx = (this.writeIndex - 1 - i + this.capacity * 2) % this.capacity
      const slot = this.slots[idx]
      if (slot && slot.tick >= fromTick) out.push(slot)
    }
    return out.sort((a, b) => a.tick - b.tick)
  }

  getLatestTick(): number {
    return this.latestTick
  }

  getSize(): number {
    return this.size
  }

  clear(): void {
    this.slots.fill(undefined)
    this.writeIndex = 0
    this.size = 0
    this.latestTick = -1
  }
}

/**
 * Honesty: frame store ≠ proven competitive rollback with Rapier.
 */
export function rollbackFrameStoreClaim(): string {
  return 'Rollback frame store interfaces ready — competitive desync-free claim [HELD] until fixed-point physics + GGPO soak'
}
