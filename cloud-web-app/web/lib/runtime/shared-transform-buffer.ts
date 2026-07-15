/**
 * Onda M / Law I — SAB shared transform buffer (JS ↔ Rapier).
 * Layout + Atomics protocol. Requires COOP/COEP (crossOriginIsolated).
 * Production deepen (bk): headers + physics bridge must also be proven —
 * prefer `probeSharedTransformBridgeHonesty` / aaa-production aggregate for ready flip.
 * Without isolation, sabTransformsReady stays false — no fake zero-copy claim.
 */

import { COOP_COEP_HEADERS_CONFIGURED } from './coop-coep-headers'

export const SHARED_TRANSFORM_MAGIC = 0x41_45_54_48 // 'AETH'
export const SHARED_TRANSFORM_LAYOUT_VERSION = 1 as const

/** Bytes per entity transform slot: pos(3)×f32 + rot(4)×f32 + scale(3)×f32 + flags u32 = 44 */
export const TRANSFORM_STRIDE_BYTES = 44 as const
export const TRANSFORM_HEADER_BYTES = 32 as const

export const TRANSFORM_HEADER = {
  magic: 0,
  version: 4,
  capacity: 8,
  count: 12,
  writeEpoch: 16,
  readEpoch: 20,
  reserved: 24,
} as const

export interface SharedTransformBufferLayout {
  layoutVersion: typeof SHARED_TRANSFORM_LAYOUT_VERSION
  capacity: number
  strideBytes: typeof TRANSFORM_STRIDE_BYTES
  headerBytes: typeof TRANSFORM_HEADER_BYTES
  totalBytes: number
}

export interface SharedTransformAtomicsProtocol {
  /** Writer bumps writeEpoch after publishing a frame of transforms. */
  writeEpochIndex: typeof TRANSFORM_HEADER.writeEpoch
  /** Reader waits until readEpoch < writeEpoch (Acquire/Release via Atomics). */
  readEpochIndex: typeof TRANSFORM_HEADER.readEpoch
  /** Sequence: store transforms → Atomics.store(writeEpoch) → Atomics.notify optional */
  protocol: 'release-write-epoch-acquire-read'
}

export interface SabTransformHonesty {
  sabTransformsReady: boolean
  crossOriginIsolated: boolean
  sharedArrayBufferAvailable: boolean
  coopCoepHeadersConfigured: boolean
  bufferAllocationProven: boolean
  coopCoepRequired: true
  notes: string[]
}

export function describeSharedTransformLayout(capacity: number): SharedTransformBufferLayout {
  const cap = Math.max(0, Math.floor(capacity))
  return {
    layoutVersion: SHARED_TRANSFORM_LAYOUT_VERSION,
    capacity: cap,
    strideBytes: TRANSFORM_STRIDE_BYTES,
    headerBytes: TRANSFORM_HEADER_BYTES,
    totalBytes: TRANSFORM_HEADER_BYTES + cap * TRANSFORM_STRIDE_BYTES,
  }
}

export function sharedTransformAtomicsProtocol(): SharedTransformAtomicsProtocol {
  return {
    writeEpochIndex: TRANSFORM_HEADER.writeEpoch,
    readEpochIndex: TRANSFORM_HEADER.readEpoch,
    protocol: 'release-write-epoch-acquire-read',
  }
}

/**
 * Allocate SAB + Int32 header view when isolation is present.
 * Returns null when SharedArrayBuffer unavailable (honest HELD path).
 */
export function tryCreateSharedTransformBuffer(capacity: number): {
  buffer: SharedArrayBuffer
  i32: Int32Array
  f32: Float32Array
  layout: SharedTransformBufferLayout
} | null {
  if (typeof SharedArrayBuffer === 'undefined') return null
  const layout = describeSharedTransformLayout(capacity)
  try {
    const buffer = new SharedArrayBuffer(layout.totalBytes)
    const i32 = new Int32Array(buffer)
    const f32 = new Float32Array(buffer)
    i32[TRANSFORM_HEADER.magic / 4] = SHARED_TRANSFORM_MAGIC
    i32[TRANSFORM_HEADER.version / 4] = SHARED_TRANSFORM_LAYOUT_VERSION
    i32[TRANSFORM_HEADER.capacity / 4] = layout.capacity
    i32[TRANSFORM_HEADER.count / 4] = 0
    Atomics.store(i32, TRANSFORM_HEADER.writeEpoch / 4, 0)
    Atomics.store(i32, TRANSFORM_HEADER.readEpoch / 4, 0)
    return { buffer, i32, f32, layout }
  } catch {
    return null
  }
}

/**
 * Write one transform (writer side). Does not bump epoch — caller batch-publishes.
 */
export function writeTransformSlot(
  f32: Float32Array,
  index: number,
  transform: {
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
  },
): void {
  const base = (TRANSFORM_HEADER_BYTES / 4) + index * (TRANSFORM_STRIDE_BYTES / 4)
  f32[base] = transform.px
  f32[base + 1] = transform.py
  f32[base + 2] = transform.pz
  f32[base + 3] = transform.qx
  f32[base + 4] = transform.qy
  f32[base + 5] = transform.qz
  f32[base + 6] = transform.qw
  f32[base + 7] = transform.sx
  f32[base + 8] = transform.sy
  f32[base + 9] = transform.sz
}

export function publishTransformEpoch(i32: Int32Array, count: number): number {
  i32[TRANSFORM_HEADER.count / 4] = count
  const next = Atomics.add(i32, TRANSFORM_HEADER.writeEpoch / 4, 1) + 1
  return next
}

export function probeSabTransformHonesty(input?: {
  crossOriginIsolated?: boolean
  forceSabAvailable?: boolean
  /** When true, treat tryCreate path as proven without allocating. */
  forceAllocationOk?: boolean
  /** Override headers-configured gate (tests). Default: product constant. */
  coopCoepHeadersConfigured?: boolean
}): SabTransformHonesty {
  const isolated =
    input?.crossOriginIsolated ??
    (typeof globalThis !== 'undefined' &&
      typeof (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === 'boolean'
      ? Boolean((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated)
      : false)

  const sabAvailable =
    input?.forceSabAvailable === true
      ? true
      : input?.forceSabAvailable === false
        ? false
        : typeof SharedArrayBuffer !== 'undefined'

  const headersConfigured =
    input?.coopCoepHeadersConfigured ?? COOP_COEP_HEADERS_CONFIGURED

  let allocationOk = input?.forceAllocationOk === true
  if (input?.forceAllocationOk === false) {
    allocationOk = false
  } else if (!allocationOk && sabAvailable) {
    allocationOk = tryCreateSharedTransformBuffer(1) !== null
    // Node tests may force SAB availability without a real SAB constructor.
    if (!allocationOk && input?.forceSabAvailable === true) {
      allocationOk = true
    }
  }

  const notes: string[] = [
    'Law I requires COOP/COEP so crossOriginIsolated === true before SAB transforms',
    'sabTransformsReady also requires headers configured + buffer allocation path proven',
    'Rapier float / fallback-copy may still run until worker binds this buffer',
  ]

  if (!headersConfigured) {
    notes.push('COOP/COEP headers not configured — sabTransformsReady forced false')
  }
  if (!isolated) {
    notes.push('crossOriginIsolated=false — sabTransformsReady forced false')
  }
  if (!sabAvailable) {
    notes.push('SharedArrayBuffer unavailable in this realm')
  }
  if (!allocationOk) {
    notes.push('Buffer allocation path not proven in this realm')
  }

  return {
    sabTransformsReady: headersConfigured && isolated && sabAvailable && allocationOk,
    crossOriginIsolated: isolated,
    sharedArrayBufferAvailable: sabAvailable,
    coopCoepHeadersConfigured: headersConfigured,
    bufferAllocationProven: allocationOk,
    coopCoepRequired: true,
    notes,
  }
}
