/**
 * Letter cj — injectable LoS testers for EQS playtest.
 * Physics/THREE raycast can wrap these; soak uses scripted testers.
 */

import type {
  EqsAgent,
  EqsLosTester,
  EqsTarget,
  EqsWorldPoint,
} from '@/lib/character/environment-query-system'

export const EQS_LOS_PROVIDER_LETTER = 'cj' as const

/** Always-open LoS (open field soak / Zero-UI fallback). */
export function createOpenLosTester(): EqsLosTester {
  return () => true
}

/** Always-blocked LoS (cover-only / relocate soak). */
export function createBlockedLosTester(): EqsLosTester {
  return () => false
}

/**
 * Occluder AABB on XZ plane — blocks LoS when segment crosses box.
 * Height ignored for Zero-MVP playtest (flat combat plane).
 */
export function createAabbLosTester(occluders: Array<{
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}>): EqsLosTester {
  return (a: EqsWorldPoint | EqsAgent, b: EqsTarget | EqsWorldPoint) => {
    const ax = a.x
    const az = a.z
    const bx = b.x
    const bz = b.z
    for (const o of occluders) {
      if (segmentIntersectsAabb2d(ax, az, bx, bz, o.minX, o.maxX, o.minZ, o.maxZ)) {
        return false
      }
    }
    return true
  }
}

function segmentIntersectsAabb2d(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): boolean {
  // Liang–Barsky style clip against AABB; true if any portion inside.
  let t0 = 0
  let t1 = 1
  const dx = bx - ax
  const dz = bz - az
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0
    const r = q / p
    if (p < 0) {
      if (r > t1) return false
      if (r > t0) t0 = r
    } else {
      if (r < t0) return false
      if (r < t1) t1 = r
    }
    return true
  }
  if (!clip(-dx, ax - minX)) return false
  if (!clip(dx, maxX - ax)) return false
  if (!clip(-dz, az - minZ)) return false
  if (!clip(dz, maxZ - az)) return false
  return t0 < t1
}
