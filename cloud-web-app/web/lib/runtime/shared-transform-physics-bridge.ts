/**
 * Law I — Shared transform buffer ↔ gameplay/physics bridge (playtest path).
 *
 * Prefer SAB + Atomics when crossOriginIsolated + SharedArrayBuffer work.
 * Without COOP/COEP: silent fallback Float32Array copy path (Zero-UI — no throw/toast).
 * Physics-worker offload (bm) binds sharedBuffer / underlyingArrayBuffer; zero-stutter HELD.
 */

import {
  TRANSFORM_HEADER,
  TRANSFORM_HEADER_BYTES,
  TRANSFORM_STRIDE_BYTES,
  describeSharedTransformLayout,
  publishTransformEpoch,
  tryCreateSharedTransformBuffer,
  writeTransformSlot,
  type SharedTransformBufferLayout,
} from './shared-transform-buffer'
import { COOP_COEP_HEADERS_CONFIGURED } from './coop-coep-headers'

/** Proven when this bridge module is wired into SimulationTick / playtest sync. */
export const SAB_PHYSICS_BRIDGE_WIRED = true as const

export type SharedTransformBridgeMode = 'sab-atomics' | 'fallback-copy'

export interface TransformPose {
  px: number
  py: number
  pz: number
  qx: number
  qy: number
  qz: number
  qw: number
  sx: number
  sy: number
  sz: number
}

export interface SharedTransformPhysicsBridgeSnapshot {
  mode: SharedTransformBridgeMode
  capacity: number
  count: number
  writeEpoch: number
  layout: SharedTransformBufferLayout
  sabTransformsAllocationOk: boolean
}

export interface SharedTransformBridgeHonesty {
  sabPhysicsBridgeWired: typeof SAB_PHYSICS_BRIDGE_WIRED
  coopCoepHeadersConfigured: typeof COOP_COEP_HEADERS_CONFIGURED
  mode: SharedTransformBridgeMode
  bufferAllocationProven: boolean
  sabTransformsReady: boolean
  notes: string[]
}

const FLOATS_PER_SLOT = TRANSFORM_STRIDE_BYTES / 4

function writeSlotIntoF32(
  f32: Float32Array,
  index: number,
  transform: TransformPose,
): void {
  writeTransformSlot(f32, index, transform)
}

function readSlotFromF32(f32: Float32Array, index: number): TransformPose {
  const base = TRANSFORM_HEADER_BYTES / 4 + index * FLOATS_PER_SLOT
  return {
    px: f32[base] ?? 0,
    py: f32[base + 1] ?? 0,
    pz: f32[base + 2] ?? 0,
    qx: f32[base + 3] ?? 0,
    qy: f32[base + 4] ?? 0,
    qz: f32[base + 5] ?? 0,
    qw: f32[base + 6] ?? 1,
    sx: f32[base + 7] ?? 1,
    sy: f32[base + 8] ?? 1,
    sz: f32[base + 9] ?? 1,
  }
}

/**
 * Dual-path transform ring used by playtest / PhysicsIntegrationSystem sync.
 */
export class SharedTransformPhysicsBridge {
  readonly capacity: number
  readonly mode: SharedTransformBridgeMode
  readonly layout: SharedTransformBufferLayout

  private readonly i32: Int32Array
  private readonly f32: Float32Array
  private readonly sab: SharedArrayBuffer | null
  private readonly ab: ArrayBuffer | null
  private count = 0

  private constructor(opts: {
    capacity: number
    mode: SharedTransformBridgeMode
    layout: SharedTransformBufferLayout
    i32: Int32Array
    f32: Float32Array
    sab: SharedArrayBuffer | null
    ab: ArrayBuffer | null
  }) {
    this.capacity = opts.capacity
    this.mode = opts.mode
    this.layout = opts.layout
    this.i32 = opts.i32
    this.f32 = opts.f32
    this.sab = opts.sab
    this.ab = opts.ab
  }

  static create(capacity: number): SharedTransformPhysicsBridge {
    const cap = Math.max(1, Math.floor(capacity))
    const sabCreated = tryCreateSharedTransformBuffer(cap)
    if (sabCreated) {
      return new SharedTransformPhysicsBridge({
        capacity: cap,
        mode: 'sab-atomics',
        layout: sabCreated.layout,
        i32: sabCreated.i32,
        f32: sabCreated.f32,
        sab: sabCreated.buffer,
        ab: null,
      })
    }

    // Fallback copy path — never throws / never spams UI.
    const layout = describeSharedTransformLayout(cap)
    const ab = new ArrayBuffer(layout.totalBytes)
    const i32 = new Int32Array(ab)
    const f32 = new Float32Array(ab)
    i32[TRANSFORM_HEADER.magic / 4] = 0x41_45_54_48
    i32[TRANSFORM_HEADER.version / 4] = 1
    i32[TRANSFORM_HEADER.capacity / 4] = layout.capacity
    i32[TRANSFORM_HEADER.count / 4] = 0
    i32[TRANSFORM_HEADER.writeEpoch / 4] = 0
    i32[TRANSFORM_HEADER.readEpoch / 4] = 0
    return new SharedTransformPhysicsBridge({
      capacity: cap,
      mode: 'fallback-copy',
      layout,
      i32,
      f32,
      sab: null,
      ab,
    })
  }

  get sharedBuffer(): SharedArrayBuffer | null {
    return this.sab
  }

  /** Fallback-copy ArrayBuffer for in-process / same-realm worker bind (bm). */
  get underlyingArrayBuffer(): ArrayBuffer | null {
    return this.ab
  }

  /** Writer: store poses then publish epoch (Atomics on SAB path). */
  publishPoses(poses: readonly TransformPose[]): number {
    const n = Math.min(poses.length, this.capacity)
    for (let i = 0; i < n; i++) {
      const pose = poses[i]
      if (!pose) continue
      writeSlotIntoF32(this.f32, i, pose)
    }
    this.count = n
    if (this.mode === 'sab-atomics') {
      return publishTransformEpoch(this.i32, n)
    }
    this.i32[TRANSFORM_HEADER.count / 4] = n
    const next = (this.i32[TRANSFORM_HEADER.writeEpoch / 4] ?? 0) + 1
    this.i32[TRANSFORM_HEADER.writeEpoch / 4] = next
    return next
  }

  /**
   * Reader: acquire-style wait until writeEpoch > lastSeen (Atomics on SAB).
   * Fallback path compares plain ints — no notify.
   */
  acquireEpoch(lastSeenEpoch: number): number {
    if (this.mode === 'sab-atomics') {
      const writeIdx = TRANSFORM_HEADER.writeEpoch / 4
      let current = Atomics.load(this.i32, writeIdx)
      // Single-shot acquire — playtest sync is same-realm; no blocking wait loop spam.
      if (current > lastSeenEpoch) {
        Atomics.store(this.i32, TRANSFORM_HEADER.readEpoch / 4, current)
      }
      return current
    }
    const current = this.i32[TRANSFORM_HEADER.writeEpoch / 4] ?? 0
    if (current > lastSeenEpoch) {
      this.i32[TRANSFORM_HEADER.readEpoch / 4] = current
    }
    return current
  }

  readPose(index: number): TransformPose | null {
    if (index < 0 || index >= this.count && index >= (this.i32[TRANSFORM_HEADER.count / 4] ?? 0)) {
      const count = this.i32[TRANSFORM_HEADER.count / 4] ?? this.count
      if (index < 0 || index >= count) return null
    }
    const count = this.i32[TRANSFORM_HEADER.count / 4] ?? this.count
    if (index < 0 || index >= count) return null
    return readSlotFromF32(this.f32, index)
  }

  snapshot(): SharedTransformPhysicsBridgeSnapshot {
    return {
      mode: this.mode,
      capacity: this.capacity,
      count: this.i32[TRANSFORM_HEADER.count / 4] ?? this.count,
      writeEpoch: this.mode === 'sab-atomics'
        ? Atomics.load(this.i32, TRANSFORM_HEADER.writeEpoch / 4)
        : (this.i32[TRANSFORM_HEADER.writeEpoch / 4] ?? 0),
      layout: this.layout,
      sabTransformsAllocationOk: this.mode === 'sab-atomics',
    }
  }
}

export function createSharedTransformPhysicsBridge(
  capacity: number,
): SharedTransformPhysicsBridge {
  return SharedTransformPhysicsBridge.create(capacity)
}

/**
 * Honesty: ready only when headers configured + bridge wired + allocation path
 * proven + crossOriginIsolated + SharedArrayBuffer available.
 */
export function probeSharedTransformBridgeHonesty(input?: {
  crossOriginIsolated?: boolean
  sharedArrayBufferAvailable?: boolean
  forceAllocationOk?: boolean
}): SharedTransformBridgeHonesty {
  const isolated =
    input?.crossOriginIsolated ??
    (typeof globalThis !== 'undefined' &&
    typeof (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === 'boolean'
      ? Boolean((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated)
      : false)

  const sabAvailable =
    input?.sharedArrayBufferAvailable === true
      ? true
      : input?.sharedArrayBufferAvailable === false
        ? false
        : typeof SharedArrayBuffer !== 'undefined'

  let allocationOk = input?.forceAllocationOk === true
  if (!allocationOk && sabAvailable) {
    const probe = tryCreateSharedTransformBuffer(1)
    allocationOk = probe !== null
    if (!allocationOk && input?.sharedArrayBufferAvailable === true) {
      allocationOk = true
    }
  }

  const notes: string[] = [
    'Playtest physics bridge: SAB+Atomics when isolated; else silent fallback-copy',
    'Browser needs COOP/COEP so crossOriginIsolated===true (see coop-coep-headers.ts)',
  ]

  if (!COOP_COEP_HEADERS_CONFIGURED) {
    notes.push('COOP/COEP headers not configured in product — sabTransformsReady forced false')
  }
  if (!isolated) {
    notes.push('crossOriginIsolated=false — using or expecting fallback-copy')
  }
  if (!sabAvailable) {
    notes.push('SharedArrayBuffer unavailable')
  }
  if (!allocationOk) {
    notes.push('SAB allocation path not proven in this realm')
  }

  const sabTransformsReady =
    COOP_COEP_HEADERS_CONFIGURED &&
    SAB_PHYSICS_BRIDGE_WIRED &&
    allocationOk &&
    isolated &&
    sabAvailable

  return {
    sabPhysicsBridgeWired: SAB_PHYSICS_BRIDGE_WIRED,
    coopCoepHeadersConfigured: COOP_COEP_HEADERS_CONFIGURED,
    mode: sabTransformsReady || (isolated && sabAvailable && allocationOk) ? 'sab-atomics' : 'fallback-copy',
    bufferAllocationProven: allocationOk,
    sabTransformsReady,
    notes,
  }
}
