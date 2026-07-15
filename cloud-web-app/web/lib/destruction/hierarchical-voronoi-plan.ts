/**
 * Letter cv — Hierarchical Voronoi fragment plan (cook/runtime authority).
 * Deepens DEST-001 convex cells; Fortune 3D remains HELD.
 * Debris mass stays SoA-ready for GPU integrate — CPU must not sim 10k fragments.
 */

import * as THREE from 'three'
import { VoronoiFractureGenerator } from '@/lib/destruction-fracture-generator'

export const HIERARCHICAL_VORONOI_LETTER = 'cv' as const
export const HIERARCHICAL_VORONOI_WIRED = true as const

export type FractureTier = 'hero' | 'debris' | 'dust'

export interface HierarchicalFragmentPlanEntry {
  id: string
  level: number
  parentId: string | null
  tier: FractureTier
  /** Seed / cell center in world space */
  center: [number, number, number]
  /** Approximate half-extents for collider / GPU particle scale */
  halfExtents: [number, number, number]
  mass: number
  /** Impulse bias from impact (xyz) */
  impulse: [number, number, number]
}

export interface HierarchicalVoronoiPlan {
  letter: typeof HIERARCHICAL_VORONOI_LETTER
  wired: true
  seed: number
  levels: number
  entries: HierarchicalFragmentPlanEntry[]
  heroCount: number
  debrisCount: number
  dustCount: number
  fortune3d: 'HELD'
  notes: string[]
}

export interface BuildHierarchicalVoronoiPlanInput {
  bounds: THREE.Box3
  impactPoint: THREE.Vector3
  impactForce: number
  /** Fracture hierarchy depth (1–4). */
  levels?: number
  /** Fragments per level (before tier split). */
  fragmentsPerLevel?: number
  seed?: number
  /** CapScore-aware hero budget (Rapier). Default 8. */
  maxHeroFragments?: number
}

function hashId(seed: number, level: number, index: number): string {
  return `frag-l${level}-i${index}-s${seed}`
}

function classifyTier(
  count: number,
  maxHero: number,
): FractureTier[] {
  const tiers: FractureTier[] = []
  const heroBudget = Math.max(0, Math.min(maxHero, count))
  const debrisBudget = Math.max(0, Math.floor((count - heroBudget) * 0.7))
  for (let i = 0; i < count; i++) {
    if (i < heroBudget) tiers.push('hero')
    else if (i < heroBudget + debrisBudget) tiers.push('debris')
    else tiers.push('dust')
  }
  return tiers
}

/**
 * Build multi-level Voronoi fragment plan.
 * Level 0 = coarsest break; deeper levels subdivide parent cells.
 * Only `hero` tier is eligible for CapScore-budgeted Rapier — debris/dust = GPU SoA.
 */
export function buildHierarchicalVoronoiPlan(
  input: BuildHierarchicalVoronoiPlanInput,
): HierarchicalVoronoiPlan {
  const levels = Math.max(1, Math.min(4, input.levels ?? 2))
  const fragmentsPerLevel = Math.max(4, Math.min(64, input.fragmentsPerLevel ?? 12))
  const seed = input.seed ?? 42
  const maxHero = Math.max(0, input.maxHeroFragments ?? 8)
  const notes: string[] = [
    'Hierarchical Voronoi fragment plan (letter cv)',
    'Fortune 3D Voronoi HELD — DEST-001 convex grid sampling remains authority',
    'Debris/dust → GPU heavy particles; hero → CapScore-budgeted Rapier only',
  ]

  const generator = new VoronoiFractureGenerator(seed)
  const entries: HierarchicalFragmentPlanEntry[] = []
  let parentCenters: THREE.Vector3[] = [input.impactPoint.clone()]
  let parentIds: (string | null)[] = [null]

  for (let level = 0; level < levels; level++) {
    const nextParents: THREE.Vector3[] = []
    const nextParentIds: string[] = []
    const perParent = Math.max(2, Math.ceil(fragmentsPerLevel / Math.max(1, parentCenters.length)))

    for (let p = 0; p < parentCenters.length; p++) {
      const parentCenter = parentCenters[p]!
      const parentId = parentIds[p] ?? null
      const size = new THREE.Vector3()
      input.bounds.getSize(size)
      const shrink = 1 / (level + 1)
      const cellBounds = new THREE.Box3(
        new THREE.Vector3(
          parentCenter.x - size.x * 0.25 * shrink,
          parentCenter.y - size.y * 0.25 * shrink,
          parentCenter.z - size.z * 0.25 * shrink,
        ),
        new THREE.Vector3(
          parentCenter.x + size.x * 0.25 * shrink,
          parentCenter.y + size.y * 0.25 * shrink,
          parentCenter.z + size.z * 0.25 * shrink,
        ),
      )
      const points = generator.generatePoints(cellBounds, perParent)
      const cells = generator.generateCells(points, cellBounds)
      const tiers = classifyTier(cells.length, level === 0 ? maxHero : Math.max(0, maxHero - entries.filter((e) => e.tier === 'hero').length))

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]!
        const id = hashId(seed, level, entries.length)
        const toImpact = new THREE.Vector3().subVectors(cell.center, input.impactPoint)
        const dist = Math.max(0.05, toImpact.length())
        const dir = toImpact.normalize()
        const impulseMag = (input.impactForce / dist) * (1 / (level + 1))
        const half = Math.max(0.04, 0.18 / (level + 1))
        const tier = tiers[i] ?? 'debris'
        const mass = tier === 'hero' ? 2.5 : tier === 'debris' ? 0.6 : 0.08
        entries.push({
          id,
          level,
          parentId,
          tier,
          center: [cell.center.x, cell.center.y, cell.center.z],
          halfExtents: [half, half, half],
          mass,
          impulse: [dir.x * impulseMag, dir.y * impulseMag + 1.5, dir.z * impulseMag],
        })
        nextParents.push(cell.center.clone())
        nextParentIds.push(id)
      }
    }

    parentCenters = nextParents
    parentIds = nextParentIds
  }

  const heroCount = entries.filter((e) => e.tier === 'hero').length
  const debrisCount = entries.filter((e) => e.tier === 'debris').length
  const dustCount = entries.filter((e) => e.tier === 'dust').length
  notes.push(
    `plan entries=${entries.length} hero=${heroCount} debris=${debrisCount} dust=${dustCount} levels=${levels}`,
  )

  return {
    letter: HIERARCHICAL_VORONOI_LETTER,
    wired: true,
    seed,
    levels,
    entries,
    heroCount,
    debrisCount,
    dustCount,
    fortune3d: 'HELD',
    notes,
  }
}

/** Extract GPU debris SoA from plan (excludes hero — those go Rapier). */
export function planEntriesToDebrisSoa(plan: HierarchicalVoronoiPlan): {
  positions: Float32Array
  velocities: Float32Array
  count: number
} {
  const debris = plan.entries.filter((e) => e.tier !== 'hero')
  const count = debris.length
  const positions = new Float32Array(count * 4)
  const velocities = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    const e = debris[i]!
    const o = i * 4
    positions[o] = e.center[0]
    positions[o + 1] = e.center[1]
    positions[o + 2] = e.center[2]
    positions[o + 3] = e.halfExtents[0]
    velocities[o] = e.impulse[0] / Math.max(0.1, e.mass)
    velocities[o + 1] = e.impulse[1] / Math.max(0.1, e.mass)
    velocities[o + 2] = e.impulse[2] / Math.max(0.1, e.mass)
    velocities[o + 3] = e.mass
  }
  return { positions, velocities, count }
}
