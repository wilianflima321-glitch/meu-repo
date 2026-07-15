/**
 * Letter cn — Dynamic gravity volumes (spherical planets + Zero-G 6DOF).
 */

import type { LwcVec3 } from '@/lib/cosmos/types'

export const COSMOS_GRAVITY_VOLUME_WIRED = true as const

export type GravityVolumeKind = 'spherical-planet' | 'zero-g' | 'linear-down'

export interface GravityVolume {
  id: string
  kind: GravityVolumeKind
  /** Absolute center (LWC). */
  center: LwcVec3
  /** Influence radius meters (spherical / zero-g bubble). */
  radiusM: number
  /** Surface gravity m/s² (spherical). Zero-G ignores. */
  surfaceGravity: number
  /** Planet radius for inverse-square falloff (spherical). */
  planetRadiusM: number
}

export interface GravitySample {
  volumeId: string | null
  /** Acceleration vector in absolute space. */
  ax: number
  ay: number
  az: number
  /** True when Zero-G 6DOF (no preferred up). */
  zeroG: boolean
  magnitude: number
}

const volumes = new Map<string, GravityVolume>()

export function clearGravityVolumes(): void {
  volumes.clear()
}

export function registerGravityVolume(volume: GravityVolume): void {
  volumes.set(volume.id, { ...volume, center: { ...volume.center } })
}

export function unregisterGravityVolume(id: string): boolean {
  return volumes.delete(id)
}

export function listGravityVolumes(): GravityVolume[] {
  return [...volumes.values()].map((v) => ({ ...v, center: { ...v.center } }))
}

/**
 * Sample gravity at absolute position. Nearest overlapping volume wins;
 * if none → Earth-like linear down (compat).
 */
export function sampleGravityAt(position: LwcVec3): GravitySample {
  let best: GravityVolume | null = null
  let bestDist = Number.POSITIVE_INFINITY

  for (const v of volumes.values()) {
    const dx = position.x - v.center.x
    const dy = position.y - v.center.y
    const dz = position.z - v.center.z
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d <= v.radiusM && d < bestDist) {
      best = v
      bestDist = d
    }
  }

  if (!best) {
    return {
      volumeId: null,
      ax: 0,
      ay: -9.81,
      az: 0,
      zeroG: false,
      magnitude: 9.81,
    }
  }

  if (best.kind === 'zero-g') {
    return {
      volumeId: best.id,
      ax: 0,
      ay: 0,
      az: 0,
      zeroG: true,
      magnitude: 0,
    }
  }

  if (best.kind === 'linear-down') {
    return {
      volumeId: best.id,
      ax: 0,
      ay: -best.surfaceGravity,
      az: 0,
      zeroG: false,
      magnitude: best.surfaceGravity,
    }
  }

  // Spherical planet — pull toward center.
  const dx = best.center.x - position.x
  const dy = best.center.y - position.y
  const dz = best.center.z - position.z
  const dist = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy + dz * dz))
  const r = Math.max(1, best.planetRadiusM)
  // Surface g * (R/d)² outside; clamp inside to surface.
  const scale = dist <= r ? best.surfaceGravity : best.surfaceGravity * (r / dist) ** 2
  const inv = scale / dist
  return {
    volumeId: best.id,
    ax: dx * inv,
    ay: dy * inv,
    az: dz * inv,
    zeroG: false,
    magnitude: scale,
  }
}

export function proveGravityVolumes(): {
  passed: boolean
  planetPullsInward: boolean
  zeroGNull: boolean
  notes: string[]
} {
  clearGravityVolumes()
  registerGravityVolume({
    id: 'earth',
    kind: 'spherical-planet',
    center: { x: 0, y: 0, z: 0 },
    radiusM: 20_000_000,
    surfaceGravity: 9.81,
    planetRadiusM: 6_371_000,
  })
  registerGravityVolume({
    id: 'ship-bay',
    kind: 'zero-g',
    center: { x: 50_000_000, y: 0, z: 0 },
    radiusM: 200,
    surfaceGravity: 0,
    planetRadiusM: 1,
  })

  const surface = sampleGravityAt({ x: 6_371_000, y: 0, z: 0 })
  const planetPullsInward =
    surface.volumeId === 'earth' &&
    surface.ax < 0 &&
    Math.abs(surface.magnitude - 9.81) < 0.5

  const zg = sampleGravityAt({ x: 50_000_000, y: 0, z: 0 })
  const zeroGNull = zg.zeroG === true && zg.magnitude === 0

  clearGravityVolumes()
  return {
    passed: planetPullsInward && zeroGNull,
    planetPullsInward,
    zeroGNull,
    notes: [
      'Spherical gravity + Zero-G 6DOF volumes CLOSED',
      'Per-body Rapier gravityScale still linear default when no cosmos tick',
    ],
  }
}
