/**
 * Block 2B.2 — Deterministic replay harness for ring-buffer rollback.
 * Uses a pure mock physics adapter (no THREE/Rapier) so tests prove
 * bit-identical resimulation without claiming competitive Rapier readiness.
 */

import { EventEmitter } from 'events'
import type { PhysicsSnapshot, PlayerInput } from '@/lib/networking/rollback-netcode-manager'

export interface DeterministicBodyState {
  x: number
  y: number
  vx: number
  buttons: number
}

export interface DeterministicPhysicsAdapter {
  captureState(): Map<string, DeterministicBodyState>
  restoreState(bodies: Map<string, DeterministicBodyState>): void
  applyInputs(inputs: PlayerInput[]): void
  step(dt: number): void
  /** Hash of all body state for bit-identical asserts */
  stateHash(): string
}

/**
 * Pure integer physics — positions are fixed-point (×1000) so float noise cannot flake tests.
 */
export function createDeterministicMockPhysics(): DeterministicPhysicsAdapter {
  const bodies = new Map<string, DeterministicBodyState>()

  return {
    captureState() {
      const snap = new Map<string, DeterministicBodyState>()
      for (const [id, b] of bodies) {
        snap.set(id, { ...b })
      }
      return snap
    },
    restoreState(next) {
      bodies.clear()
      for (const [id, b] of next) {
        bodies.set(id, { ...b })
      }
    },
    applyInputs(inputs) {
      for (const input of inputs) {
        let b = bodies.get(input.playerId)
        if (!b) {
          b = { x: 0, y: 0, vx: 0, buttons: 0 }
          bodies.set(input.playerId, b)
        }
        b.buttons = input.buttons
        // axes[0] → velocity in fixed units
        b.vx = Math.trunc(input.axes[0] * 1000)
      }
    },
    step(_dt) {
      for (const b of bodies.values()) {
        b.x += b.vx
        if (b.buttons & 1) {
          b.y += 100
        }
      }
    },
    stateHash() {
      const parts: string[] = []
      const ids = [...bodies.keys()].sort()
      for (const id of ids) {
        const b = bodies.get(id)!
        parts.push(`${id}:${b.x},${b.y},${b.vx},${b.buttons}`)
      }
      return parts.join('|')
    },
  }
}

/**
 * Lightweight rollback ring that mirrors RollbackNetcodeManager semantics
 * without THREE / EventEmitter coupling — for deterministic replay tests.
 */
export class DeterministicRollbackRing extends EventEmitter {
  private readonly maxFrames: number
  private currentTick = 0
  private serverTick = 0
  private stateBuffer: Array<{ tick: number; bodies: Map<string, DeterministicBodyState> } | undefined>
  private inputBuffer = new Map<number, PlayerInput[]>()

  constructor(
    private readonly physics: DeterministicPhysicsAdapter,
    maxFrames = 60
  ) {
    super()
    this.maxFrames = maxFrames
    this.stateBuffer = new Array(maxFrames)
  }

  getTick(): number {
    return this.currentTick
  }

  stateHash(): string {
    return this.physics.stateHash()
  }

  tick(localInput: PlayerInput): void {
    this.saveStateSnapshot(this.currentTick)
    this.registerInput(this.currentTick, localInput)
    const inputs = this.inputBuffer.get(this.currentTick) || []
    this.physics.applyInputs(inputs)
    this.physics.step(1 / 60)
    this.currentTick++
    this.pruneInputBuffer()
  }

  receiveServerState(serverTick: number, inputs: PlayerInput[]): void {
    if (serverTick <= this.serverTick) return
    if (serverTick < this.currentTick) {
      this.rollbackAndResimulate(serverTick, inputs)
    } else {
      for (const input of inputs) {
        this.registerInput(serverTick, input)
      }
    }
    this.serverTick = serverTick
  }

  private rollbackAndResimulate(targetTick: number, newInputs: PlayerInput[]): void {
    const framesToRollback = this.currentTick - targetTick
    if (framesToRollback >= this.maxFrames) {
      this.currentTick = targetTick
      this.serverTick = targetTick
      this.stateBuffer = new Array(this.maxFrames)
      for (const input of newInputs) {
        this.registerInput(targetTick, input)
      }
      this.emit('hard-sync', { serverTick: targetTick })
      return
    }
    const snapshot = this.getSnapshotAt(targetTick)
    if (!snapshot) return
    this.physics.restoreState(snapshot.bodies)
    for (const input of newInputs) {
      this.registerInput(targetTick, input)
    }
    for (let simTick = targetTick; simTick < this.currentTick; simTick++) {
      const inputsForTick = this.inputBuffer.get(simTick) || []
      this.physics.applyInputs(inputsForTick)
      this.physics.step(1 / 60)
      this.saveStateSnapshot(simTick + 1)
    }
  }

  private saveStateSnapshot(tick: number): void {
    const bodies = this.physics.captureState()
    const index = tick % this.maxFrames
    this.stateBuffer[index] = { tick, bodies }
  }

  private getSnapshotAt(tick: number): { tick: number; bodies: Map<string, DeterministicBodyState> } | null {
    const index = tick % this.maxFrames
    const snap = this.stateBuffer[index]
    if (snap && snap.tick === tick) return snap
    return null
  }

  private registerInput(tick: number, input: PlayerInput): void {
    let arr = this.inputBuffer.get(tick)
    if (!arr) {
      arr = []
      this.inputBuffer.set(tick, arr)
    }
    // Replace same player input for tick (authoritative overwrite)
    const idx = arr.findIndex((i) => i.playerId === input.playerId)
    if (idx >= 0) arr[idx] = input
    else arr.push(input)
  }

  private pruneInputBuffer(): void {
    const horizon = this.currentTick - this.maxFrames
    for (const tick of this.inputBuffer.keys()) {
      if (tick < horizon) this.inputBuffer.delete(tick)
    }
  }
}

/**
 * Run the same input tape twice through independent rings — hashes must match.
 * Then inject a late remote input and verify both rings converge after rollback.
 */
export function runDeterministicReplayFixture(): {
  baselineHash: string
  replayHash: string
  afterRollbackA: string
  afterRollbackB: string
} {
  const tape: PlayerInput[] = []
  for (let t = 0; t < 30; t++) {
    tape.push({
      tick: t,
      playerId: 'p1',
      buttons: t % 5 === 0 ? 1 : 0,
      axes: [((t % 7) - 3) / 3, 0],
    })
  }

  const runForward = () => {
    const physics = createDeterministicMockPhysics()
    const ring = new DeterministicRollbackRing(physics)
    for (const input of tape) {
      ring.tick(input)
    }
    return { ring, physics, hash: ring.stateHash() }
  }

  const a = runForward()
  const b = runForward()
  const baselineHash = a.hash
  const replayHash = b.hash

  // Late remote correction at tick 10
  const late: PlayerInput = {
    tick: 10,
    playerId: 'p2',
    buttons: 1,
    axes: [1, 0],
  }
  a.ring.receiveServerState(10, [late])
  b.ring.receiveServerState(10, [late])

  return {
    baselineHash,
    replayHash,
    afterRollbackA: a.ring.stateHash(),
    afterRollbackB: b.ring.stateHash(),
  }
}

// Re-export types used by tests that also touch the production manager shape
export type { PhysicsSnapshot, PlayerInput }
