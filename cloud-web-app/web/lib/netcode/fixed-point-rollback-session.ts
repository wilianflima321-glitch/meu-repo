/**
 * Competitive netcode — rollback session over FixedPointPhysicsAdapter + RollbackFrameBuffer.
 * Snapshot / restore / resimulate. No GGPO transport; no desync-free claim.
 */

import { toFixed } from './fixed-point'
import {
  FixedPointPhysicsAdapter,
  createFixedPointPhysicsAdapter,
} from './fixed-point-physics-adapter'
import {
  RollbackFrameBuffer,
  type RollbackPlayerInput,
} from './rollback-frame-buffer'

export interface FixedPointRollbackSessionOptions {
  capacity?: number
  gravityY?: number
  seedBodies?: Array<{ id: string; x?: number; y?: number; z?: number }>
}

/**
 * Drives fixed-point physics with a ring of frame snapshots for rollback restore.
 */
export class FixedPointRollbackSession {
  readonly physics: FixedPointPhysicsAdapter
  readonly frames: RollbackFrameBuffer
  private readonly inputByTick = new Map<number, RollbackPlayerInput[]>()
  private currentTick = 0

  constructor(options: FixedPointRollbackSessionOptions = {}) {
    this.physics = createFixedPointPhysicsAdapter({
      gravityY: options.gravityY,
    })
    this.frames = new RollbackFrameBuffer({
      capacity: options.capacity ?? 60,
    })
    for (const b of options.seedBodies ?? []) {
      this.physics.spawn(b.id, b.x ?? 0, b.y ?? 0, b.z ?? 0)
    }
  }

  getTick(): number {
    return this.currentTick
  }

  stateHash(): string {
    return this.physics.stateHash()
  }

  /**
   * Advance one frame: snapshot → apply inputs → step → store blob.
   */
  tick(inputs: RollbackPlayerInput[]): void {
    const tick = this.currentTick
    const stamped = inputs.map((i) => ({ ...i, tick }))
    this.inputByTick.set(tick, stamped)

    const blob = this.physics.serializeStateBlob()
    const checksum = this.physics.stateHash()
    this.frames.push({
      tick,
      inputs: stamped,
      stateBlob: blob,
      checksum,
    })

    this.physics.applyInputs(stamped)
    this.physics.step()
    this.currentTick = tick + 1
  }

  /**
   * Restore to a prior tick snapshot and resimulate forward with stored inputs.
   * Returns false if the tick is outside the ring.
   */
  rollbackTo(tick: number): boolean {
    const slot = this.frames.getByTick(tick)
    if (!slot?.stateBlob) return false

    this.physics.restoreStateBlob(slot.stateBlob)
    this.currentTick = tick

    const forward = this.frames.sliceFrom(tick)
    for (const frame of forward) {
      const inputs = this.inputByTick.get(frame.tick) ?? frame.inputs
      this.physics.applyInputs(inputs)
      this.physics.step()
      this.currentTick = frame.tick + 1
      // Refresh checksum after resim (blob already captured at original push)
    }
    return true
  }

  /**
   * Replace inputs at tick and resimulate from that snapshot (late remote input).
   */
  correctAndResimulate(tick: number, inputs: RollbackPlayerInput[]): boolean {
    const slot = this.frames.getByTick(tick)
    if (!slot?.stateBlob) return false

    const stamped = inputs.map((i) => ({ ...i, tick }))
    this.inputByTick.set(tick, stamped)
    slot.inputs = stamped

    this.physics.restoreStateBlob(slot.stateBlob)
    this.currentTick = tick

    const forward = this.frames.sliceFrom(tick)
    for (const frame of forward) {
      const frameInputs = this.inputByTick.get(frame.tick) ?? frame.inputs
      this.physics.applyInputs(frameInputs)
      this.physics.step()
      this.currentTick = frame.tick + 1
      // Update live checksum for this frame after resim
      frame.checksum = this.physics.stateHash()
    }
    return true
  }
}

export function createFixedPointRollbackSession(
  options?: FixedPointRollbackSessionOptions,
): FixedPointRollbackSession {
  return new FixedPointRollbackSession(options)
}

/** Helper: build a Fixed-axis input from float axes (convert once at edge). */
export function fixedInputFromAxes(
  playerId: string,
  tick: number,
  buttons: number,
  axisX: number,
  axisY: number,
): RollbackPlayerInput {
  return {
    playerId,
    tick,
    buttons,
    axisX: toFixed(axisX),
    axisY: toFixed(axisY),
  }
}
