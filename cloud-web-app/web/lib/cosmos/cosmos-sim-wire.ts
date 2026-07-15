/**
 * Letter cn — Cosmos sim wire: nested grid + CCD + gravity into physics/sim tick.
 * Letter co — deepen nested island evidence + dual BVH query smoke on tick.
 */

import { resolveCosmosCapabilityBudget } from '@/lib/cosmos/cosmos-capability-budget'
import {
  clearGravityVolumes,
  registerGravityVolume,
  sampleGravityAt,
} from '@/lib/cosmos/gravity-volume'
import {
  clearNestedPhysicsGrids,
  createNestedPhysicsGrid,
  enterIsland,
  resolveBodyVelocity,
  setHullMotion,
} from '@/lib/cosmos/nested-physics-grid'
import {
  planCcdForBody,
  sweepSphereVsSpheres,
  type SweepObstacle,
  type SweepSphere,
} from '@/lib/cosmos/ccd-sweep'
import {
  buildDualSpaceBvh,
  selectBvhSpaceForRay,
  type DualSpaceBvhPair,
} from '@/lib/cosmos/dual-bvh'
import type { LwcVec3 } from '@/lib/cosmos/types'

export const COSMOS_SIM_WIRE_LETTER = 'cn' as const
export const COSMOS_SIM_WIRE_WIRED = true as const

export interface CosmosSimTickInput {
  capabilityScore: number
  bodyPositions?: Array<{ id: string; position: LwcVec3 }>
  movers?: SweepSphere[]
  obstacles?: SweepObstacle[]
  dt?: number
  /** Optional dual BVH rebuild + query smoke (letter co). */
  dualBvhQuery?: {
    playerX: number
    playerY: number
    playerZ: number
    solarBodies?: Array<{ id: string; x: number; y: number; z: number; radiusM: number }>
    localMeshes?: Array<{ id: string; x: number; y: number; z: number; halfExtentM: number }>
  }
  /** Nested island body ids still isolated this tick (letter co evidence). */
  nestedIslandBodyIds?: string[]
  nestedGridId?: string
  setBodyGravity?: (bodyId: string, g: { ax: number; ay: number; az: number }) => boolean
  setBodyCcd?: (bodyId: string, enabled: boolean) => boolean
}

export interface CosmosSimTickResult {
  gravitySamples: number
  ccdHits: number
  ccdEnabled: number
  nestedGridsActive: number
  nestedIslandIsolated: boolean
  dualBvhQueried: boolean
  dualBvhSpace: 'coarse-solar' | 'fine-player' | null
  dualBvh: DualSpaceBvhPair | null
  zeroUiUnavailable: boolean
}

/**
 * One cosmos physics assist tick — gravity volumes + CCD sweeps + nested velocity.
 * Zero-UI when no bodies/movers.
 */
export function tickCosmosSimulation(input: CosmosSimTickInput): CosmosSimTickResult {
  const budget = resolveCosmosCapabilityBudget(input.capabilityScore)
  const bodies = input.bodyPositions ?? []
  const movers = input.movers ?? []
  const obstacles = input.obstacles ?? []
  const empty =
    bodies.length === 0 &&
    movers.length === 0 &&
    !input.dualBvhQuery &&
    !(input.nestedIslandBodyIds && input.nestedIslandBodyIds.length > 0)
  if (empty) {
    return {
      gravitySamples: 0,
      ccdHits: 0,
      ccdEnabled: 0,
      nestedGridsActive: 0,
      nestedIslandIsolated: false,
      dualBvhQueried: false,
      dualBvhSpace: null,
      dualBvh: null,
      zeroUiUnavailable: true,
    }
  }

  let gravitySamples = 0
  for (const b of bodies) {
    const g = sampleGravityAt(b.position)
    gravitySamples += 1
    input.setBodyGravity?.(b.id, { ax: g.ax, ay: g.ay, az: g.az })
  }

  let ccdHits = 0
  let ccdEnabled = 0
  let used = 0
  const dt = input.dt ?? 1 / 60
  for (const m of movers) {
    const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz)
    const plan = planCcdForBody({
      speedMps: speed,
      radiusM: m.radius,
      capabilityScore: budget.capabilityScore,
      ccdBodiesUsed: used,
      ccdBodiesMax: budget.ccdBodiesMax,
    })
    if (plan.ccdEnabled) {
      ccdEnabled += 1
      used += 1
      input.setBodyCcd?.(m.id, true)
      const hit = sweepSphereVsSpheres(m, obstacles, dt)
      if (hit) ccdHits += 1
    }
  }

  // Letter co — nested island isolation evidence (not budget-only no-op).
  let nestedIslandIsolated = false
  let nestedGridsActive = 0
  const gridId = input.nestedGridId ?? 'ship'
  if (input.nestedIslandBodyIds && input.nestedIslandBodyIds.length > 0) {
    nestedGridsActive = 1
    nestedIslandIsolated = true
    for (const bodyId of input.nestedIslandBodyIds) {
      const v = resolveBodyVelocity({
        gridId,
        bodyId,
        localVelocity: { x: 0, y: 0, z: 0 },
      })
      // Island body must not inherit hull Mach (resolve returns local only).
      if (Math.abs(v.x) > 1e-6 || Math.abs(v.y) > 1e-6 || Math.abs(v.z) > 1e-6) {
        nestedIslandIsolated = false
      }
    }
  } else if (budget.maxNestedGrids > 0) {
    nestedGridsActive = budget.maxNestedGrids
  }

  // Letter co — dual BVH query smoke when posed.
  let dualBvhQueried = false
  let dualBvhSpace: CosmosSimTickResult['dualBvhSpace'] = null
  let dualBvh: DualSpaceBvhPair | null = null
  if (input.dualBvhQuery) {
    dualBvh = buildDualSpaceBvh({
      solarBodies: input.dualBvhQuery.solarBodies ?? [
        { id: 'origin-star', x: 0, y: 0, z: 0, radiusM: 1e8 },
      ],
      localMeshes: input.dualBvhQuery.localMeshes ?? [
        {
          id: 'local',
          x: input.dualBvhQuery.playerX,
          y: input.dualBvhQuery.playerY,
          z: input.dualBvhQuery.playerZ,
          halfExtentM: 8,
        },
      ],
      playerX: input.dualBvhQuery.playerX,
      playerY: input.dualBvhQuery.playerY,
      playerZ: input.dualBvhQuery.playerZ,
      fineRadiusM: budget.fineBvhRadiusM,
    })
    // Query at player — fine root includes local mesh around player for smoke.
    dualBvhSpace = selectBvhSpaceForRay(
      dualBvh,
      input.dualBvhQuery.playerX,
      input.dualBvhQuery.playerY,
      input.dualBvhQuery.playerZ,
    )
    dualBvhQueried = true
  }

  return {
    gravitySamples,
    ccdHits,
    ccdEnabled,
    nestedGridsActive,
    nestedIslandIsolated,
    dualBvhQueried,
    dualBvhSpace,
    dualBvh,
    zeroUiUnavailable: false,
  }
}

export function proveCosmosSimWire(capabilityScore = 38): {
  passed: boolean
  gravity: boolean
  ccd: boolean
  nested: boolean
  dualBvh: boolean
  notes: string[]
} {
  clearGravityVolumes()
  clearNestedPhysicsGrids()
  registerGravityVolume({
    id: 'p',
    kind: 'spherical-planet',
    center: { x: 0, y: 0, z: 0 },
    radiusM: 1e8,
    surfaceGravity: 9.81,
    planetRadiusM: 6e6,
  })
  createNestedPhysicsGrid({ id: 'ship', hullOrigin: { x: 1e7, y: 0, z: 0 } })
  setHullMotion('ship', { x: 1e7, y: 0, z: 0 }, { x: 5000, y: 0, z: 0 })
  enterIsland('ship', 'crew')
  const island = resolveBodyVelocity({
    gridId: 'ship',
    bodyId: 'crew',
    localVelocity: { x: 0, y: 0, z: 0 },
  })

  const gravApplied: string[] = []
  const ccdApplied: string[] = []
  const tick = tickCosmosSimulation({
    capabilityScore,
    bodyPositions: [{ id: 'probe', position: { x: 6e6, y: 0, z: 0 } }],
    movers: [
      {
        id: 'slug',
        x: 0,
        y: 0,
        z: 0,
        radius: 0.5,
        vx: 10_000,
        vy: 0,
        vz: 0,
      },
    ],
    obstacles: [{ id: 'rock', x: 80, y: 0, z: 0, radius: 20 }],
    nestedGridId: 'ship',
    nestedIslandBodyIds: ['crew'],
    dualBvhQuery: {
      playerX: 0,
      playerY: 0,
      playerZ: 0,
      solarBodies: [{ id: 'sun', x: 0, y: 0, z: 0, radiusM: 1e8 }],
      localMeshes: [{ id: 'near', x: 2, y: 0, z: 0, halfExtentM: 5 }],
    },
    setBodyGravity: (id) => {
      gravApplied.push(id)
      return true
    },
    setBodyCcd: (id, en) => {
      if (en) ccdApplied.push(id)
      return true
    },
  })

  const gravity = tick.gravitySamples === 1 && gravApplied.includes('probe')
  const ccd = tick.ccdHits >= 1 && ccdApplied.includes('slug')
  const nested =
    Math.abs(island.x) < 1e-9 && tick.nestedIslandIsolated === true
  const dualBvh =
    tick.dualBvhQueried &&
    tick.dualBvhSpace === 'fine-player' &&
    (tick.dualBvh?.fine.leafCount ?? 0) >= 1
  clearGravityVolumes()
  clearNestedPhysicsGrids()
  return {
    passed: gravity && ccd && nested && dualBvh && !tick.zeroUiUnavailable,
    gravity,
    ccd,
    nested,
    dualBvh,
    notes: [
      'Cosmos sim wire CLOSED — gravity volumes + CCD + nested island isolation + dual BVH query',
      'Multi-Rapier-world production soak HELD',
    ],
  }
}
