/**
 * Law I — Physics Worker honesty probe (letter bm).
 * Path can be CLOSED while zero-stutter marketing stays HELD.
 */

import { COOP_COEP_HEADERS_CONFIGURED } from './coop-coep-headers'
import { SAB_PHYSICS_BRIDGE_WIRED } from './shared-transform-physics-bridge'
import { PHYSICS_WORKER_PROTOCOL_VERSION } from './physics-worker-protocol'

/** Structural probe — manager + protocol + worker entry ship (letter bm). */
export const PHYSICS_WORKER_PATH_WIRED = true as const

export interface PhysicsWorkerHonesty {
  physicsWorkerPathWired: typeof PHYSICS_WORKER_PATH_WIRED
  protocolVersion: typeof PHYSICS_WORKER_PROTOCOL_VERSION
  sabPhysicsBridgeWired: typeof SAB_PHYSICS_BRIDGE_WIRED
  coopCoepHeadersConfigured: typeof COOP_COEP_HEADERS_CONFIGURED
  workerConstructible: boolean
  sharedBufferBindProven: boolean
  stepSharedWriteProven: boolean
  /**
   * Ready when path wired + protocol proven (bind + step shared write).
   * Does NOT imply zero-stutter marketing or Rapier-in-worker soak.
   */
  physicsWorkerReady: boolean
  /** Always false — marketing unlock is Founder-gated. */
  zeroStutterMarketingAllowed: false
  notes: string[]
}

export function probePhysicsWorkerWired(): boolean {
  return PHYSICS_WORKER_PATH_WIRED === true
}

/**
 * Honesty: physicsWorkerReady when path wired and shared-transform step proven.
 * Worker constructibility is recorded but Node/jsdom may lack Workers —
 * force flags allow probe tests without inventing browser claims.
 */
export function probePhysicsWorkerHonesty(input?: {
  workerConstructible?: boolean
  sharedBufferBindProven?: boolean
  stepSharedWriteProven?: boolean
  crossOriginIsolated?: boolean
}): PhysicsWorkerHonesty {
  const workerConstructible =
    input?.workerConstructible === true
      ? true
      : input?.workerConstructible === false
        ? false
        : typeof Worker !== 'undefined'

  const sharedBufferBindProven = input?.sharedBufferBindProven === true
  const stepSharedWriteProven = input?.stepSharedWriteProven === true

  const isolated =
    input?.crossOriginIsolated ??
    (typeof globalThis !== 'undefined' &&
    typeof (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated ===
      'boolean'
      ? Boolean((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated)
      : false)

  const notes: string[] = [
    'Physics worker posts step commands; shared-transform SAB/fallback updated off main render path',
    'Main-thread Rapier float remains default when worker not requested / unavailable (Zero-UI)',
    'Zero-stutter / AAA marketing HELD until soak',
  ]

  if (!PHYSICS_WORKER_PATH_WIRED) {
    notes.push('Physics worker path not wired')
  }
  if (!SAB_PHYSICS_BRIDGE_WIRED) {
    notes.push('Shared transform physics bridge not wired (bk)')
  }
  if (!COOP_COEP_HEADERS_CONFIGURED) {
    notes.push('COOP/COEP headers missing — SAB path HELD')
  }
  if (!workerConstructible) {
    notes.push('Worker constructible=false in this realm — silent main-thread fallback')
  }
  if (!sharedBufferBindProven) {
    notes.push('Shared buffer bind not proven in this probe')
  }
  if (!stepSharedWriteProven) {
    notes.push('Shared-transform step write not proven in this probe')
  }
  if (!isolated) {
    notes.push('crossOriginIsolated=false — expect fallback-copy or main-thread Rapier')
  }

  const physicsWorkerReady =
    PHYSICS_WORKER_PATH_WIRED &&
    SAB_PHYSICS_BRIDGE_WIRED &&
    sharedBufferBindProven &&
    stepSharedWriteProven

  return {
    physicsWorkerPathWired: PHYSICS_WORKER_PATH_WIRED,
    protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
    sabPhysicsBridgeWired: SAB_PHYSICS_BRIDGE_WIRED,
    coopCoepHeadersConfigured: COOP_COEP_HEADERS_CONFIGURED,
    workerConstructible,
    sharedBufferBindProven,
    stepSharedWriteProven,
    physicsWorkerReady,
    zeroStutterMarketingAllowed: false,
    notes,
  }
}
