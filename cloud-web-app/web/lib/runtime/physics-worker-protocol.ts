/**
 * Law I — Physics Worker ↔ main-thread message contract (letter bm).
 *
 * Worker steps physics and publishes transforms into the bk SAB ring
 * (Atomics) or silent fallback-copy ArrayBuffer. Hot path never returns
 * structured-clone body maps when a shared buffer is bound.
 *
 * Pure handlers are Vitest-friendly (no real Worker required for contract tests).
 */

import {
  TRANSFORM_HEADER,
  TRANSFORM_HEADER_BYTES,
  TRANSFORM_STRIDE_BYTES,
  publishTransformEpoch,
  writeTransformSlot,
} from './shared-transform-buffer'
import type { TransformPose } from './shared-transform-physics-bridge'

export const PHYSICS_WORKER_PROTOCOL_VERSION = 1 as const

export type PhysicsWorkerRequestType =
  | 'init'
  | 'bindSharedTransforms'
  | 'registerBodies'
  | 'step'
  | 'destroy'

export type PhysicsWorkerResponseType =
  | PhysicsWorkerRequestType
  | 'ready'
  | 'stepped'
  | 'error'

export interface PhysicsWorkerBodySeed {
  id: string
  /** Slot index into the shared transform ring. */
  slot: number
  px: number
  py: number
  pz: number
  qx?: number
  qy?: number
  qz?: number
  qw?: number
  vx?: number
  vy?: number
  vz?: number
  /** dynamic | kinematic | fixed — only dynamic integrate. */
  kind?: 'dynamic' | 'kinematic' | 'fixed'
}

export interface PhysicsWorkerRequest {
  type: PhysicsWorkerRequestType
  id: string
  protocolVersion?: typeof PHYSICS_WORKER_PROTOCOL_VERSION
  data?: {
    gravity?: { x: number; y: number; z: number }
    /** SharedArrayBuffer from SharedTransformPhysicsBridge (bk). */
    sharedBuffer?: SharedArrayBuffer | ArrayBuffer
    mode?: 'sab-atomics' | 'fallback-copy'
    capacity?: number
    bodies?: PhysicsWorkerBodySeed[]
    deltaTime?: number
    /** Fixed substeps; default 1. */
    substeps?: number
  }
}

export interface PhysicsWorkerResponse {
  type: PhysicsWorkerResponseType
  id: string
  success: boolean
  data?: {
    initialized?: boolean
    bound?: boolean
    mode?: 'sab-atomics' | 'fallback-copy'
    capacity?: number
    registered?: number
    /** Epoch published into shared transform header after step. */
    writeEpoch?: number
    count?: number
    /** True when step wrote via shared buffer (no body clone). */
    sharedTransformsWritten?: boolean
    destroyed?: boolean
  }
  error?: string
}

export interface PhysicsWorkerBodyState {
  id: string
  slot: number
  px: number
  py: number
  pz: number
  qx: number
  qy: number
  qz: number
  qw: number
  vx: number
  vy: number
  vz: number
  kind: 'dynamic' | 'kinematic' | 'fixed'
}

/**
 * In-worker / in-process sim state. Lightweight integrator for Law I offload
 * proof — Rapier float remains default main-thread playtest authority.
 */
export class PhysicsWorkerSimState {
  gravity = { x: 0, y: -9.81, z: 0 }
  bodies = new Map<string, PhysicsWorkerBodyState>()
  i32: Int32Array | null = null
  f32: Float32Array | null = null
  mode: 'sab-atomics' | 'fallback-copy' | null = null
  capacity = 0
  initialized = false

  init(gravity?: { x: number; y: number; z: number }): void {
    if (gravity) this.gravity = { ...gravity }
    this.initialized = true
  }

  bindSharedTransforms(
    buffer: SharedArrayBuffer | ArrayBuffer,
    mode: 'sab-atomics' | 'fallback-copy',
    capacity: number,
  ): void {
    this.i32 = new Int32Array(buffer)
    this.f32 = new Float32Array(buffer)
    this.mode = mode
    this.capacity = Math.max(1, Math.floor(capacity))
  }

  registerBodies(seeds: readonly PhysicsWorkerBodySeed[]): number {
    for (const seed of seeds) {
      this.bodies.set(seed.id, {
        id: seed.id,
        slot: seed.slot,
        px: seed.px,
        py: seed.py,
        pz: seed.pz,
        qx: seed.qx ?? 0,
        qy: seed.qy ?? 0,
        qz: seed.qz ?? 0,
        qw: seed.qw ?? 1,
        vx: seed.vx ?? 0,
        vy: seed.vy ?? 0,
        vz: seed.vz ?? 0,
        kind: seed.kind ?? 'dynamic',
      })
    }
    return this.bodies.size
  }

  /**
   * Integrate dynamics and publish poses into the bound shared transform ring.
   * Never returns body maps — main thread acquires epoch from SAB / fallback.
   */
  step(deltaTime: number, substeps = 1): {
    writeEpoch: number
    count: number
    sharedTransformsWritten: boolean
  } {
    if (!this.initialized) {
      throw new Error('Physics worker not initialized')
    }
    if (!this.i32 || !this.f32 || !this.mode) {
      throw new Error('Shared transforms not bound')
    }

    const steps = Math.max(1, Math.floor(substeps))
    const dt = deltaTime / steps
    const gx = this.gravity.x
    const gy = this.gravity.y
    const gz = this.gravity.z

    for (let s = 0; s < steps; s++) {
      for (const body of this.bodies.values()) {
        if (body.kind !== 'dynamic') continue
        body.vx += gx * dt
        body.vy += gy * dt
        body.vz += gz * dt
        body.px += body.vx * dt
        body.py += body.vy * dt
        body.pz += body.vz * dt
      }
    }

    const poses: TransformPose[] = []
    const ordered = [...this.bodies.values()].sort((a, b) => a.slot - b.slot)
    for (const body of ordered) {
      if (body.slot < 0 || body.slot >= this.capacity) continue
      const pose: TransformPose = {
        px: body.px,
        py: body.py,
        pz: body.pz,
        qx: body.qx,
        qy: body.qy,
        qz: body.qz,
        qw: body.qw,
        sx: 1,
        sy: 1,
        sz: 1,
      }
      writeTransformSlot(this.f32, body.slot, pose)
      poses.push(pose)
    }

    const count = poses.length
    let writeEpoch: number
    if (this.mode === 'sab-atomics') {
      writeEpoch = publishTransformEpoch(this.i32, count)
    } else {
      this.i32[TRANSFORM_HEADER.count / 4] = count
      const next = (this.i32[TRANSFORM_HEADER.writeEpoch / 4] ?? 0) + 1
      this.i32[TRANSFORM_HEADER.writeEpoch / 4] = next
      writeEpoch = next
    }

    return {
      writeEpoch,
      count,
      sharedTransformsWritten: true,
    }
  }

  destroy(): void {
    this.bodies.clear()
    this.i32 = null
    this.f32 = null
    this.mode = null
    this.capacity = 0
    this.initialized = false
  }
}

/** Layout helpers exported for contract tests. */
export function physicsWorkerTransformStride(): {
  headerBytes: typeof TRANSFORM_HEADER_BYTES
  strideBytes: typeof TRANSFORM_STRIDE_BYTES
} {
  return {
    headerBytes: TRANSFORM_HEADER_BYTES,
    strideBytes: TRANSFORM_STRIDE_BYTES,
  }
}

/**
 * Pure request → response handler (same logic the worker uses).
 * Safe for Vitest message-contract tests without spawning a Worker.
 */
export function handlePhysicsWorkerRequest(
  state: PhysicsWorkerSimState,
  req: PhysicsWorkerRequest,
): PhysicsWorkerResponse {
  const { type, id, data } = req
  try {
    switch (type) {
      case 'init': {
        state.init(data?.gravity)
        return {
          type,
          id,
          success: true,
          data: { initialized: true },
        }
      }
      case 'bindSharedTransforms': {
        if (!data?.sharedBuffer) {
          throw new Error('sharedBuffer required')
        }
        const mode = data.mode ?? 'fallback-copy'
        const capacity = data.capacity ?? 1
        state.bindSharedTransforms(data.sharedBuffer, mode, capacity)
        return {
          type,
          id,
          success: true,
          data: { bound: true, mode, capacity },
        }
      }
      case 'registerBodies': {
        const n = state.registerBodies(data?.bodies ?? [])
        return {
          type,
          id,
          success: true,
          data: { registered: n },
        }
      }
      case 'step': {
        const result = state.step(data?.deltaTime ?? 1 / 60, data?.substeps ?? 1)
        return {
          type: 'stepped',
          id,
          success: true,
          data: {
            writeEpoch: result.writeEpoch,
            count: result.count,
            sharedTransformsWritten: result.sharedTransformsWritten,
          },
        }
      }
      case 'destroy': {
        state.destroy()
        return {
          type,
          id,
          success: true,
          data: { destroyed: true },
        }
      }
      default: {
        const _exhaustive: never = type
        throw new Error(`Unknown physics worker message: ${String(_exhaustive)}`)
      }
    }
  } catch (err) {
    return {
      type: 'error',
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/** Validate inbound message shape (fail-closed). */
export function isPhysicsWorkerRequest(value: unknown): value is PhysicsWorkerRequest {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.type !== 'string' || typeof v.id !== 'string') return false
  const allowed: PhysicsWorkerRequestType[] = [
    'init',
    'bindSharedTransforms',
    'registerBodies',
    'step',
    'destroy',
  ]
  return (allowed as string[]).includes(v.type)
}
