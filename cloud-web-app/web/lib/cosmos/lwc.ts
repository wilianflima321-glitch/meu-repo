/**
 * Letter cn — Large World Coordinates (LWC) f64 absolute on CPU.
 * GPU always receives camera-relative f32 via floating-origin.
 */

import type { CameraRelativePose, LwcVec3 } from '@/lib/cosmos/types'

export const COSMOS_LWC_WIRED = true as const

/** Absolute origin of the current floating window (CPU f64). */
let absoluteOrigin: LwcVec3 = { x: 0, y: 0, z: 0 }

export function getLwcAbsoluteOrigin(): LwcVec3 {
  return { ...absoluteOrigin }
}

export function setLwcAbsoluteOrigin(origin: LwcVec3): void {
  absoluteOrigin = {
    x: Number(origin.x),
    y: Number(origin.y),
    z: Number(origin.z),
  }
}

/** Distance squared (f64) between two absolute points. */
export function lwcDistanceSq(a: LwcVec3, b: LwcVec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

export function lwcDistance(a: LwcVec3, b: LwcVec3): number {
  return Math.sqrt(lwcDistanceSq(a, b))
}

/** Absolute → camera-relative (subtract origin). Result is f32-safe when origin tracked. */
export function lwcToCameraRelative(
  absolute: LwcVec3,
  origin: LwcVec3 = absoluteOrigin,
): CameraRelativePose {
  return {
    x: absolute.x - origin.x,
    y: absolute.y - origin.y,
    z: absolute.z - origin.z,
  }
}

/** Camera-relative → absolute (add origin). */
export function cameraRelativeToLwc(
  relative: CameraRelativePose,
  origin: LwcVec3 = absoluteOrigin,
): LwcVec3 {
  return {
    x: relative.x + origin.x,
    y: relative.y + origin.y,
    z: relative.z + origin.z,
  }
}

/**
 * Prove f64 precision survives at planetary distances where f32 collapses.
 * At ~1e7 m, f32 mantissa loses cm; f64 keeps sub-mm.
 */
export function proveLwcPrecision(): {
  passed: boolean
  f32Collapsed: boolean
  f64Preserved: boolean
  notes: string[]
} {
  const planet = 12_742_000 // Earth diameter-scale meters
  const a: LwcVec3 = { x: planet, y: 0, z: 0 }
  const b: LwcVec3 = { x: planet + 0.01, y: 0, z: 0 } // 1 cm offset
  const f32A = Math.fround(a.x)
  const f32B = Math.fround(b.x)
  const f32Collapsed = f32A === f32B
  const f64Preserved = a.x !== b.x && lwcDistance(a, b) > 0.009
  return {
    passed: f32Collapsed && f64Preserved,
    f32Collapsed,
    f64Preserved,
    notes: [
      'LWC CPU f64 CLOSED — absolute coords',
      f32Collapsed
        ? 'f32 collapses 1cm at planetary range (expected)'
        : 'unexpected: f32 did not collapse',
      'GPU path must use floating-origin camera-relative',
    ],
  }
}
