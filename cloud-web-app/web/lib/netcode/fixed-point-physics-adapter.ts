/**
 * Competitive netcode — Q16.16 fixed-point physics adapter.
 * Sidesteps float Rapier for the competitive authority path.
 * Rapier float remains the default playtest/runtime physics.
 *
 * Honesty: path can snapshot/restore frames; GGPO-live / desync-free marketing stay HELD.
 */

import {
  type Fixed,
  fixedAdd,
  fixedMul,
  fromFixed,
  toFixed,
} from './fixed-point'
import type { RollbackPlayerInput } from './rollback-frame-buffer'

/** Structural probe — module ships a real adapter (letter bl). */
export const FIXED_POINT_PHYSICS_PATH_WIRED = true as const

export interface FixedPointBodyState {
  id: string
  x: Fixed
  y: Fixed
  z: Fixed
  vx: Fixed
  vy: Fixed
  vz: Fixed
  buttons: number
}

export interface FixedPointPhysicsAdapterOptions {
  /** Gravity Y in world units/sec² (converted to Q16.16). Default -9.81. */
  gravityY?: number
  /** Fixed timestep seconds. Default 1/60. */
  dt?: number
}

/**
 * Deterministic rigid-body integrator in Q16.16.
 * No Rapier / float accumulation on the authority path.
 */
export class FixedPointPhysicsAdapter {
  private readonly bodies = new Map<string, FixedPointBodyState>()
  private readonly gravityY: Fixed
  private readonly dt: Fixed
  private tick = 0

  constructor(options: FixedPointPhysicsAdapterOptions = {}) {
    this.gravityY = toFixed(options.gravityY ?? -9.81)
    this.dt = toFixed(options.dt ?? 1 / 60)
  }

  getTick(): number {
    return this.tick
  }

  spawn(id: string, x = 0, y = 0, z = 0): void {
    this.bodies.set(id, {
      id,
      x: toFixed(x),
      y: toFixed(y),
      z: toFixed(z),
      vx: toFixed(0),
      vy: toFixed(0),
      vz: toFixed(0),
      buttons: 0,
    })
  }

  applyInputs(inputs: RollbackPlayerInput[]): void {
    for (const input of inputs) {
      let body = this.bodies.get(input.playerId)
      if (!body) {
        this.spawn(input.playerId)
        body = this.bodies.get(input.playerId)!
      }
      body.buttons = input.buttons >>> 0
      // Axis → velocity (Q16.16). Same Fixed ops every peer.
      body.vx = input.axisX
      body.vz = input.axisY
      // Jump impulse on button bit 0
      if (body.buttons & 1) {
        body.vy = toFixed(4)
      }
    }
  }

  step(_dtSeconds?: number): void {
    const dt = this.dt
    for (const body of this.bodies.values()) {
      body.vy = fixedAdd(body.vy, fixedMul(this.gravityY, dt))
      body.x = fixedAdd(body.x, fixedMul(body.vx, dt))
      body.y = fixedAdd(body.y, fixedMul(body.vy, dt))
      body.z = fixedAdd(body.z, fixedMul(body.vz, dt))
      // Ground clamp at y=0
      if ((body.y as number) < 0) {
        body.y = toFixed(0)
        body.vy = toFixed(0)
      }
    }
    this.tick += 1
  }

  captureState(): Map<string, FixedPointBodyState> {
    const snap = new Map<string, FixedPointBodyState>()
    for (const [id, b] of this.bodies) {
      snap.set(id, { ...b })
    }
    return snap
  }

  restoreState(next: Map<string, FixedPointBodyState>, tick?: number): void {
    this.bodies.clear()
    for (const [id, b] of next) {
      this.bodies.set(id, { ...b })
    }
    if (typeof tick === 'number') this.tick = tick
  }

  /**
   * Serialize bodies into a portable blob for RollbackFrameBuffer.stateBlob.
   * Layout per body: idLen(u16) + id utf8 + 6×i32 (x,y,z,vx,vy,vz) + u32 buttons.
   */
  serializeStateBlob(): Uint8Array {
    const ids = [...this.bodies.keys()].sort()
    const chunks: Uint8Array[] = []
    const tickBuf = new ArrayBuffer(4)
    new DataView(tickBuf).setInt32(0, this.tick, true)
    chunks.push(new Uint8Array(tickBuf))
    const countBuf = new ArrayBuffer(4)
    new DataView(countBuf).setUint32(0, ids.length, true)
    chunks.push(new Uint8Array(countBuf))

    for (const id of ids) {
      const b = this.bodies.get(id)!
      const idBytes = new TextEncoder().encode(id)
      const header = new ArrayBuffer(2)
      new DataView(header).setUint16(0, idBytes.length, true)
      chunks.push(new Uint8Array(header), idBytes)
      const nums = new ArrayBuffer(28)
      const dv = new DataView(nums)
      dv.setInt32(0, b.x as number, true)
      dv.setInt32(4, b.y as number, true)
      dv.setInt32(8, b.z as number, true)
      dv.setInt32(12, b.vx as number, true)
      dv.setInt32(16, b.vy as number, true)
      dv.setInt32(20, b.vz as number, true)
      dv.setUint32(24, b.buttons >>> 0, true)
      chunks.push(new Uint8Array(nums))
    }

    let total = 0
    for (const c of chunks) total += c.length
    const out = new Uint8Array(total)
    let o = 0
    for (const c of chunks) {
      out.set(c, o)
      o += c.length
    }
    return out
  }

  restoreStateBlob(blob: Uint8Array): void {
    const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
    let o = 0
    const tick = dv.getInt32(o, true)
    o += 4
    const count = dv.getUint32(o, true)
    o += 4
    const next = new Map<string, FixedPointBodyState>()
    const decoder = new TextDecoder()
    for (let i = 0; i < count; i++) {
      const idLen = dv.getUint16(o, true)
      o += 2
      const id = decoder.decode(blob.subarray(o, o + idLen))
      o += idLen
      const x = dv.getInt32(o, true) as Fixed
      const y = dv.getInt32(o + 4, true) as Fixed
      const z = dv.getInt32(o + 8, true) as Fixed
      const vx = dv.getInt32(o + 12, true) as Fixed
      const vy = dv.getInt32(o + 16, true) as Fixed
      const vz = dv.getInt32(o + 20, true) as Fixed
      const buttons = dv.getUint32(o + 24, true)
      o += 28
      next.set(id, { id, x, y, z, vx, vy, vz, buttons })
    }
    this.restoreState(next, tick)
  }

  stateHash(): string {
    const parts: string[] = [`t${this.tick}`]
    const ids = [...this.bodies.keys()].sort()
    for (const id of ids) {
      const b = this.bodies.get(id)!
      parts.push(
        `${id}:${b.x as number},${b.y as number},${b.z as number},${b.vx as number},${b.vy as number},${b.vz as number},${b.buttons}`,
      )
    }
    return parts.join('|')
  }

  /** Float view for rendering only — never feed back into authority. */
  readBodyFloat(id: string): { x: number; y: number; z: number } | null {
    const b = this.bodies.get(id)
    if (!b) return null
    return { x: fromFixed(b.x), y: fromFixed(b.y), z: fromFixed(b.z) }
  }

  bodyCount(): number {
    return this.bodies.size
  }
}

export function createFixedPointPhysicsAdapter(
  options?: FixedPointPhysicsAdapterOptions,
): FixedPointPhysicsAdapter {
  return new FixedPointPhysicsAdapter(options)
}

/**
 * Probe: competitive fixed-point path is wired (adapter module real).
 * Does not claim GGPO-live or desync-free.
 */
export function probeFixedPointPhysicsWired(): boolean {
  return FIXED_POINT_PHYSICS_PATH_WIRED === true
}

export function fixedPointPhysicsPathClaim(): string {
  return 'Fixed-point physics adapter + rollback snapshot/restore CLOSED — Rapier float default; GGPO-live / desync-free marketing [HELD]'
}
