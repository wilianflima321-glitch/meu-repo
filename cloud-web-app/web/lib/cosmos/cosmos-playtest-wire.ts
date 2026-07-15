/**
 * Letter cn — Aethel Cosmos interface soak (gears + CapScore).
 * Letter co — multi-frame live playtest soak deepen (floating-origin rebase +
 * nested island + CCD sweep + dual BVH query) — gates cosmosPlaytestSoakReady.
 */

import { proveAcousticAtmosphere } from '@/lib/cosmos/acoustic-atmosphere'
import { proveActorPersistence } from '@/lib/cosmos/actor-persistence'
import {
  proveCcdSweep,
  sweepSphereVsSpheres,
  type SweepObstacle,
  type SweepSphere,
} from '@/lib/cosmos/ccd-sweep'
import { resolveCosmosCapabilityBudget } from '@/lib/cosmos/cosmos-capability-budget'
import {
  proveCosmosRenderWire,
  tickCosmosRender,
  type CosmosRenderTargets,
} from '@/lib/cosmos/cosmos-render-wire'
import {
  proveCosmosSimWire,
  tickCosmosSimulation,
} from '@/lib/cosmos/cosmos-sim-wire'
import {
  buildDualSpaceBvh,
  proveDualSpaceBvh,
  selectBvhSpaceForRay,
} from '@/lib/cosmos/dual-bvh'
import {
  getFloatingOriginState,
  proveFloatingOrigin,
  resetFloatingOrigin,
} from '@/lib/cosmos/floating-origin'
import {
  clearGravityVolumes,
  proveGravityVolumes,
  registerGravityVolume,
} from '@/lib/cosmos/gravity-volume'
import { proveInterestManagement } from '@/lib/cosmos/interest-management'
import { proveLwcPrecision } from '@/lib/cosmos/lwc'
import {
  clearNestedPhysicsGrids,
  createNestedPhysicsGrid,
  enterIsland,
  proveNestedPhysicsGrid,
  resolveBodyVelocity,
  setHullMotion,
} from '@/lib/cosmos/nested-physics-grid'
import { provePbrSkyAtmosphere } from '@/lib/cosmos/pbr-sky-atmosphere'
import { provePlanetarySdf } from '@/lib/cosmos/planetary-sdf-sculpt'
import { proveReversedZ } from '@/lib/cosmos/reversed-z'
import { proveVolumetricStreamingAsync } from '@/lib/cosmos/volumetric-streaming'
import { COSMOS_LETTER } from '@/lib/cosmos/types'

/** Interface soak letter (cn). Live multi-frame deepen is `co`. */
export const COSMOS_PLAYTEST_WIRE_LETTER = COSMOS_LETTER
export const COSMOS_LIVE_SOAK_LETTER = 'co' as const
export const COSMOS_PLAYTEST_WIRE_WIRED = true as const

export interface CosmosPlaytestSoakResult {
  letter: typeof COSMOS_PLAYTEST_WIRE_LETTER
  passed: boolean
  framesProven: number
  capScoreContrast: boolean
  gears: Record<string, boolean>
  notes: string[]
}

export interface CosmosLivePlaytestSoakResult {
  letter: typeof COSMOS_LIVE_SOAK_LETTER
  passed: boolean
  framesProven: number
  floatingOriginRebased: boolean
  nestedIslandIsolated: boolean
  ccdSweepHit: boolean
  dualBvhQuerySmoke: boolean
  capScoreContrast: boolean
  notes: string[]
}

/**
 * Full cosmos interface soak — all gears + CapScore GT730 vs high contrast.
 * Gates `cosmosScaleReady` (letter cn). Not a multi-frame live tick proof.
 */
export async function proveCosmosPlaytestSoak(
  capabilityScore = 38,
): Promise<CosmosPlaytestSoakResult> {
  const low = resolveCosmosCapabilityBudget(12)
  const high = resolveCosmosCapabilityBudget(80)
  const capScoreContrast =
    low.maxInterestActors < high.maxInterestActors &&
    low.ccdBodiesMax < high.ccdBodiesMax &&
    low.fineBvhRadiusM < high.fineBvhRadiusM

  const lwc = proveLwcPrecision()
  const grav = proveGravityVolumes()
  const nested = proveNestedPhysicsGrid()
  const dual = proveDualSpaceBvh()
  const rz = proveReversedZ()
  const ccd = proveCcdSweep()
  const interest = proveInterestManagement()
  const acoustic = proveAcousticAtmosphere()
  const sky = provePbrSkyAtmosphere()
  const float = proveFloatingOrigin()
  const actor = await proveActorPersistence()
  const volumetric = await proveVolumetricStreamingAsync()
  const sdf = provePlanetarySdf()
  const render = proveCosmosRenderWire(capabilityScore)
  const sim = proveCosmosSimWire(capabilityScore)

  const gears: Record<string, boolean> = {
    lwc: lwc.passed,
    gravity: grav.passed,
    nested: nested.passed,
    dualBvh: dual.passed,
    reversedZ: rz.passed,
    ccd: ccd.passed,
    interest: interest.passed,
    acoustic: acoustic.passed,
    sky: sky.passed,
    floatingOrigin: float.passed,
    actorPersistence: actor.passed,
    volumetric: volumetric.passed,
    planetarySdf: sdf.passed,
    renderWire: render.passed,
    simWire: sim.passed,
  }

  const framesProven = Object.values(gears).filter(Boolean).length
  const passed = framesProven === Object.keys(gears).length && capScoreContrast

  return {
    letter: COSMOS_PLAYTEST_WIRE_LETTER,
    passed,
    framesProven,
    capScoreContrast,
    gears,
    notes: [
      'Aethel Cosmos (cn) soak — planetary/space scale interfaces',
      `gears ${framesProven}/${Object.keys(gears).length}`,
      `CapScore contrast GT730 interest=${low.maxInterestActors} vs ${high.maxInterestActors}`,
      'Honest: Unreal/Unity also choke at true planetary MMO — we scaffold+wire, not Star-Citizen-solved',
      'MMO space / Agones fleet / Nanite / Coins marketing HELD',
      'Live multi-frame soak deepen → letter co (cosmosPlaytestSoakReady)',
      ...lwc.notes.slice(0, 1),
      ...nested.notes.slice(0, 1),
      ...interest.notes.slice(0, 1),
    ],
  }
}

/**
 * Scripted multi-frame camera walk that crosses floating-origin rebase threshold.
 */
export function buildCosmosFloatingOriginWalk(
  thresholdM: number,
): Array<{ x: number; y: number; z: number }> {
  const step = Math.max(1, thresholdM * 0.4)
  return [
    { x: 0, y: 0, z: 0 },
    { x: step, y: 0, z: 0 },
    { x: step * 2, y: 0, z: 0 },
    { x: step * 3, y: 0, z: 0 },
    { x: thresholdM + 10, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 }, // after rebase, GPU-relative near origin
  ]
}

/**
 * Letter co — multi-frame live soak:
 * floating-origin rebase + nested island isolation + CCD sweep + dual BVH query
 * + CapScore GT730 contrast. Gates `cosmosPlaytestSoakReady`.
 */
export function proveCosmosLivePlaytestSoak(
  capabilityScore = 38,
): CosmosLivePlaytestSoakResult {
  const notes: string[] = []
  const low = resolveCosmosCapabilityBudget(12)
  const high = resolveCosmosCapabilityBudget(80)
  const mid = resolveCosmosCapabilityBudget(capabilityScore)
  const capScoreContrast =
    low.maxInterestActors < high.maxInterestActors &&
    low.ccdBodiesMax < high.ccdBodiesMax &&
    low.fineBvhRadiusM < high.fineBvhRadiusM &&
    mid.fineBvhRadiusM <= high.fineBvhRadiusM

  if (!capScoreContrast) {
    notes.push('CapScore contrast soak failed — GT730 should tighten interest/CCD/fine-BVH')
  }

  // --- Floating origin multi-frame rebase ---
  const thresholdM = 100
  resetFloatingOrigin(thresholdM)
  const camera = {
    near: 0.1,
    far: 1e6,
    fov: 75,
    aspect: 1.777,
    position: { x: 0, y: 0, z: 0 },
    projectionMatrix: { elements: new Array(16).fill(0) as number[] },
  }
  const objects: CosmosRenderTargets['objects'] = [
    { position: { x: 50, y: 0, z: 0 } },
    { position: { x: 200, y: 0, z: 0 } },
  ]
  const walk = buildCosmosFloatingOriginWalk(thresholdM)
  let floatingOriginRebased = false
  let framesProven = 0

  for (let i = 0; i < walk.length; i++) {
    const pose = walk[i]!
    camera.position.x = pose.x
    camera.position.y = pose.y
    camera.position.z = pose.z
    const tick = tickCosmosRender({
      capabilityScore,
      targets: { camera, objects },
      cameraRelative: { ...pose },
      enableSky: i % 2 === 0,
    })
    framesProven += 1
    if (tick.floatingOriginRebased) floatingOriginRebased = true
  }
  if (!floatingOriginRebased || getFloatingOriginState().rebaseCount < 1) {
    notes.push('floating-origin soak failed — expected rebase across multi-frame walk')
    floatingOriginRebased = false
  }
  resetFloatingOrigin()

  // --- Nested grid island isolation across hull motion frames ---
  clearNestedPhysicsGrids()
  clearGravityVolumes()
  registerGravityVolume({
    id: 'soak-planet',
    kind: 'spherical-planet',
    center: { x: 0, y: 0, z: 0 },
    radiusM: 1e8,
    surfaceGravity: 9.81,
    planetRadiusM: 6e6,
  })
  createNestedPhysicsGrid({ id: 'soak-ship', hullOrigin: { x: 1e7, y: 0, z: 0 } })
  enterIsland('soak-ship', 'crew')
  let nestedIslandIsolated = true
  for (let f = 0; f < 6; f++) {
    const hullX = 1e7 + f * 5_000
    setHullMotion(
      'soak-ship',
      { x: hullX, y: 0, z: 0 },
      { x: 8_000 + f * 100, y: 0, z: 0 },
    )
    const island = resolveBodyVelocity({
      gridId: 'soak-ship',
      bodyId: 'crew',
      localVelocity: { x: 0.2, y: 0, z: 0 },
    })
    const exterior = resolveBodyVelocity({
      gridId: 'soak-ship',
      bodyId: 'drone',
      localVelocity: { x: 0.2, y: 0, z: 0 },
    })
    framesProven += 1
    if (Math.abs(island.x - 0.2) > 1e-9) nestedIslandIsolated = false
    if (Math.abs(exterior.x - (8000 + f * 100 + 0.2)) > 1e-6) nestedIslandIsolated = false
  }
  if (!nestedIslandIsolated) {
    notes.push('nested island soak failed — island must ignore hull Mach velocity')
  }

  // --- CCD sweep multi-frame (hypervelocity slug vs asteroid) ---
  let ccdSweepHit = false
  const obstacles: SweepObstacle[] = [
    { id: 'asteroid', x: 90, y: 0, z: 0, radius: 20 },
  ]
  let slugX = 0
  for (let f = 0; f < 4; f++) {
    const mover: SweepSphere = {
      id: 'slug',
      x: slugX,
      y: 0,
      z: 0,
      radius: 0.5,
      vx: 12_000,
      vy: 0,
      vz: 0,
    }
    const sim = tickCosmosSimulation({
      capabilityScore,
      bodyPositions: [{ id: 'probe', position: { x: 6e6, y: 0, z: 0 } }],
      movers: [mover],
      obstacles,
      dt: 1 / 60,
      setBodyGravity: () => true,
      setBodyCcd: () => true,
    })
    const hit = sweepSphereVsSpheres(mover, obstacles, 1 / 60)
    framesProven += 1
    if (sim.ccdHits >= 1 || hit !== null) ccdSweepHit = true
    slugX += mover.vx / 60
  }
  if (!ccdSweepHit) {
    notes.push('CCD soak failed — hypervelocity sweep should hit asteroid')
  }

  // --- Dual BVH query smoke across frames (CapScore fine radius) ---
  let dualBvhQuerySmoke = true
  const fineR = mid.fineBvhRadiusM
  for (let f = 0; f < 4; f++) {
    const playerX = f * 50
    const pair = buildDualSpaceBvh({
      solarBodies: [
        { id: 'sun', x: 0, y: 0, z: 0, radiusM: 7e8 },
        { id: 'earth', x: 1.5e11, y: 0, z: 0, radiusM: 6.3e6 },
      ],
    localMeshes: [
      { id: 'near', x: playerX, y: 0, z: 0, halfExtentM: 8 },
      { id: 'far', x: playerX + fineR + 5_000, y: 0, z: 0, halfExtentM: 5 },
    ],
    playerX,
    playerY: 0,
    playerZ: 0,
    fineRadiusM: fineR,
  })
  const space = selectBvhSpaceForRay(pair, playerX, 0, 0)
    framesProven += 1
    if (pair.coarse.leafCount !== 2) dualBvhQuerySmoke = false
    if (pair.fine.leafCount < 1) dualBvhQuerySmoke = false
    if (space !== 'fine-player') dualBvhQuerySmoke = false
    // GT730 fine radius must cull the far mesh
    if (pair.fine.leaves.some((l) => l.id === 'far')) dualBvhQuerySmoke = false
  }
  if (!dualBvhQuerySmoke) {
    notes.push('dual BVH query smoke failed — fine space + CapScore cull expected')
  }

  clearNestedPhysicsGrids()
  clearGravityVolumes()

  const passed =
    floatingOriginRebased &&
    nestedIslandIsolated &&
    ccdSweepHit &&
    dualBvhQuerySmoke &&
    capScoreContrast &&
    framesProven >= 16

  if (passed) {
    notes.unshift(
      'cosmosPlaytestSoakReady CLOSED (letter co) — multi-frame floating-origin + nested + CCD + dual BVH + CapScore',
    )
  } else {
    notes.unshift('cosmosPlaytestSoakReady pending — live multi-frame soak incomplete')
  }
  notes.push(
    'Honest: Unreal/Unity also choke at true planetary MMO — live soak ≠ Star-Citizen-solved',
    'MMO space / Agones fleet / Nanite / Coins / cloud immortal marketing HELD',
  )

  return {
    letter: COSMOS_LIVE_SOAK_LETTER,
    passed,
    framesProven,
    floatingOriginRebased,
    nestedIslandIsolated,
    ccdSweepHit,
    dualBvhQuerySmoke,
    capScoreContrast,
    notes,
  }
}
