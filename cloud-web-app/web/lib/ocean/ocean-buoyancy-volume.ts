/**
 * Letter cq — Explicit OceanBuoyancyVolume component metadata (data-driven float).
 * Surfboard ≠ heavy crate from volume/density on the entity — not AABB-guess-only.
 * Missing metadata → fail-closed Zero-UI skip OR documented AABB heuristic HELD.
 */

import type { Component, ComponentType, EntityId } from '@/lib/game-engine-core.contracts'

export const OCEAN_BUOYANCY_VOLUME_LETTER = 'cq' as const
export const OCEAN_BUOYANCY_VOLUME_WIRED = true as const
export const OCEAN_BUOYANCY_VOLUME_TYPE = 'oceanBuoyancyVolume' as const

/**
 * Explicit displaced-volume metadata on an entity.
 * Required for CLOSED buoyancy path (letter cq).
 */
export interface OceanBuoyancyVolume extends Component {
  type: typeof OCEAN_BUOYANCY_VOLUME_TYPE
  /** Exact displaced volume (m³) — Archimedes input, not AABB guess. */
  volumeM3: number
  /**
   * Optional material density (kg/m³). When set with mass absent on sample,
   * mass ≈ density × volume. Does not invent Unreal Water System.
   */
  densityKgPerM3?: number
  /** Optional fluid density override (kg/m³) — default solver waterDensity. */
  fluidDensityKgPerM3?: number
  /** Center-of-buoyancy offset in local space (optional). */
  centerOffset?: { x: number; y: number; z: number }
}

export type BuoyancyVolumeSource = 'explicit' | 'aabbHeuristicHeld' | 'missing'


export interface ResolvedBuoyancyVolume {
  volumeM3: number
  source: BuoyancyVolumeSource
  /** True only when OceanBuoyancyVolume present with finite volumeM3 > 0. */
  closedPathAllowed: boolean
  densityKgPerM3?: number
  centerOffset?: { x: number; y: number; z: number }
  notes: string[]
}

/**
 * Resolve volume from explicit component. Missing / invalid → HELD heuristic flag
 * when aabbFallback provided; otherwise fail-closed (closedPathAllowed false, volume 0).
 */
export function resolveOceanBuoyancyVolume(input: {
  explicit?: OceanBuoyancyVolume | null | undefined
  /** Alias for tests / collectors that pass metadata. */
  metadata?: OceanBuoyancyVolume | null | undefined
  /** Documented AABB proxy — never claimed CLOSED (letter cq). */
  aabbVolumeM3?: number
  /** When true and metadata missing, return AABB with aabbHeuristicHeld. */
  allowAabbHeuristic?: boolean
}): ResolvedBuoyancyVolume {
  const notes: string[] = []
  const explicit = input.explicit ?? input.metadata
  const v = explicit?.volumeM3
  if (
    explicit &&
    explicit.type === OCEAN_BUOYANCY_VOLUME_TYPE &&
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v > 0
  ) {
    return {
      volumeM3: v,
      source: 'explicit',
      closedPathAllowed: true,
      densityKgPerM3: explicit.densityKgPerM3,
      centerOffset: explicit.centerOffset,
      notes: ['OceanBuoyancyVolume explicit — CLOSED cq path'],
    }
  }

  notes.push(
    'OceanBuoyancyVolume missing/invalid — explicit float CLOSED path denied (letter cq)',
  )
  const allowAabb = input.allowAabbHeuristic !== false
  const aabb = input.aabbVolumeM3
  if (allowAabb && typeof aabb === 'number' && Number.isFinite(aabb) && aabb > 0) {
    notes.push(
      'AABB volume heuristic HELD — not shipped as data-driven buoyancy (Zero-UI / fail-closed marketing)',
    )
    return {
      volumeM3: aabb,
      source: 'aabbHeuristicHeld',
      closedPathAllowed: false,
      notes,
    }
  }

  notes.push('No AABB fallback — Zero-UI skip (volume 0)')
  return {
    volumeM3: 0,
    source: 'missing',
    closedPathAllowed: false,
    notes,
  }
}

/** Soak / IDE presets — surfboard floats; dense crate sinks relative. */
export const OCEAN_BUOYANCY_PRESETS = {
  surfboard: {
    type: OCEAN_BUOYANCY_VOLUME_TYPE,
    volumeM3: 0.12,
    densityKgPerM3: 180,
  },
  heavyCrate: {
    type: OCEAN_BUOYANCY_VOLUME_TYPE,
    volumeM3: 0.5,
    densityKgPerM3: 900,
  },
} as const

/** Factory for ECS / prefab attach. */
export function createOceanBuoyancyVolume(
  entityId: EntityId,
  volumeM3: number,
  opts?: {
    densityKgPerM3?: number
    centerOffset?: { x: number; y: number; z: number }
  },
): OceanBuoyancyVolume {
  return {
    type: OCEAN_BUOYANCY_VOLUME_TYPE,
    entityId,
    volumeM3,
    densityKgPerM3: opts?.densityKgPerM3,
    centerOffset: opts?.centerOffset,
  }
}

/** Duck-typed World.getComponent reader for collectors. */
export function readOceanBuoyancyVolume(
  getComponent: <T extends Component>(entityId: EntityId, type: ComponentType) => T | undefined,
  entityId: EntityId,
): OceanBuoyancyVolume | undefined {
  return getComponent<OceanBuoyancyVolume>(entityId, OCEAN_BUOYANCY_VOLUME_TYPE)
}

/**
 * Surfboard vs crate contrast — same water, different metadata → different float.
 * Used by soak / tests (not a gameplay preset catalog).
 */
export function proveExplicitBuoyancyVolumeContrast(): {
  passed: boolean
  surfboardVolume: number
  crateVolume: number
  notes: string[]
} {
  const surfboard = createOceanBuoyancyVolume('surfboard', 0.12, { densityKgPerM3: 180 })
  const crate = createOceanBuoyancyVolume('crate', 1.2, { densityKgPerM3: 700 })
  const s = resolveOceanBuoyancyVolume({ explicit: surfboard })
  const c = resolveOceanBuoyancyVolume({ explicit: crate })
  const missing = resolveOceanBuoyancyVolume({ explicit: null, aabbVolumeM3: 1 })
  const passed =
    s.closedPathAllowed &&
    c.closedPathAllowed &&
    s.volumeM3 !== c.volumeM3 &&
    !missing.closedPathAllowed &&
    missing.source === 'aabbHeuristicHeld'
  return {
    passed,
    surfboardVolume: s.volumeM3,
    crateVolume: c.volumeM3,
    notes: [
      ...s.notes,
      ...c.notes,
      ...missing.notes,
      passed
        ? 'explicit OceanBuoyancyVolume contrast CLOSED (cq)'
        : 'explicit volume contrast failed',
    ],
  }
}
