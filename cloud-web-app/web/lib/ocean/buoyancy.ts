/**
 * Letter cg — Ocean buoyancy helpers for Rapier/float integration.
 * Letter cq — volumes from explicit OceanBuoyancyVolume metadata (not AABB-only).
 * Produces forces/torques; does not invent full Unreal Water System.
 */

import { sampleOceanHeight, type OceanSpectrumParams, generateOceanHeightField } from '@/lib/ocean/fft-displacement'
import {
  createOceanBuoyancyVolume,
  resolveOceanBuoyancyVolume,
  type BuoyancyVolumeSource,
  type OceanBuoyancyVolume,
} from '@/lib/ocean/ocean-buoyancy-volume'

export const OCEAN_BUOYANCY_WIRED = true as const

export interface BuoyancyBodySample {
  id: string
  position: { x: number; y: number; z: number }
  /**
   * AABB / proxy volume (m³). Letter cq CLOSED path uses explicitVolume.volumeM3 instead.
   */
  volume: number
  mass: number
  /** Letter cq — explicit component metadata from entity. */
  explicitVolume?: OceanBuoyancyVolume
  /** @deprecated prefer explicitVolume — kept for older callers. */
  oceanBuoyancyVolume?: OceanBuoyancyVolume
  volumeSource?: BuoyancyVolumeSource
  explicitVolumeClosed?: boolean
  /**
   * When true (default for collectors), skip AABB-only bodies.
   * Collector sets this; solver also honors BuoyancySolverParams.requireExplicitVolume.
   */
  requireExplicitVolume?: boolean
}

export interface BuoyancyForceResult {
  bodyId: string
  force: { x: number; y: number; z: number }
  submerged: number
  waterHeight: number
  floating: boolean
  volumeSource: BuoyancyVolumeSource
  explicitVolumeClosed: boolean
  /** Alias of explicitVolumeClosed. */
  explicitClosed: boolean
  volumeM3: number
  aabbHeuristicHeld: boolean
}

export interface BuoyancySolverParams {
  waterDensity: number
  gravity: number
  linearDrag: number
  worldSize: number
  /**
   * Letter cq — when true (default), skip bodies without explicit OceanBuoyancyVolume.
   */
  requireExplicitVolume?: boolean
}

const DEFAULT_SOLVER: BuoyancySolverParams = {
  waterDensity: 1000,
  gravity: 9.81,
  linearDrag: 0.4,
  worldSize: 64,
  requireExplicitVolume: true,
}

function resolveSampleVolume(body: BuoyancyBodySample): {
  volume: number
  source: BuoyancyVolumeSource
  closed: boolean
  fluidDensity?: number
} {
  const explicit = body.explicitVolume ?? body.oceanBuoyancyVolume
  const resolved = resolveOceanBuoyancyVolume({
    explicit: explicit ?? null,
    aabbVolumeM3: body.volume,
  })
  if (resolved.closedPathAllowed && explicit) {
    return {
      volume: explicit.volumeM3,
      source: 'explicit',
      closed: true,
      fluidDensity: (explicit as OceanBuoyancyVolume & { fluidDensityKgPerM3?: number })
        .fluidDensityKgPerM3,
    }
  }
  if (body.volumeSource === 'explicit' && body.volume > 0 && body.explicitVolumeClosed) {
    return { volume: body.volume, source: 'explicit', closed: true }
  }
  return {
    volume: resolved.volumeM3 > 0 ? resolved.volumeM3 : body.volume,
    source: 'aabbHeuristicHeld',
    closed: false,
  }
}

/**
 * Archimedes + simple drag against FFT height field.
 * Letter cq: default requireExplicitVolume — AABB-only bodies Zero-UI skipped.
 */
export function computeBuoyancyForces(input: {
  heights: Float32Array
  resolution: number
  bodies: BuoyancyBodySample[]
  solver?: Partial<BuoyancySolverParams>
  /** Convenience — maps to solver.requireExplicitVolume. */
  requireExplicitVolume?: boolean
}): BuoyancyForceResult[] {
  const solver = {
    ...DEFAULT_SOLVER,
    ...input.solver,
    ...(input.requireExplicitVolume !== undefined
      ? { requireExplicitVolume: input.requireExplicitVolume }
      : {}),
  }
  const out: BuoyancyForceResult[] = []
  for (const body of input.bodies) {
    const requireExplicit =
      body.requireExplicitVolume === true ||
      (body.requireExplicitVolume !== false && solver.requireExplicitVolume !== false)

    const { volume, source, closed, fluidDensity } = resolveSampleVolume(body)

    if (requireExplicit && !closed) {
      // Fail-closed Zero-UI — honest zero force when OceanBuoyancyVolume missing.
      out.push({
        bodyId: body.id,
        force: { x: 0, y: 0, z: 0 },
        submerged: 0,
        waterHeight: 0,
        floating: false,
        volumeSource: source === 'explicit' ? 'aabbHeuristicHeld' : source,
        explicitVolumeClosed: false,
        explicitClosed: false,
        volumeM3: 0,
        aabbHeuristicHeld: true,
      })
      continue
    }

    if (!(volume > 0) || !Number.isFinite(volume)) {
      out.push({
        bodyId: body.id,
        force: { x: 0, y: 0, z: 0 },
        submerged: 0,
        waterHeight: 0,
        floating: false,
        volumeSource: source,
        explicitVolumeClosed: closed,
        explicitClosed: closed,
        volumeM3: 0,
        aabbHeuristicHeld: !closed,
      })
      continue
    }

    const waterDensity = fluidDensity ?? solver.waterDensity
    const mass =
      body.explicitVolume?.densityKgPerM3 && body.explicitVolume.densityKgPerM3 > 0
        ? volume * body.explicitVolume.densityKgPerM3
        : body.mass
    const u = (body.position.x / solver.worldSize + 0.5) % 1
    const v = (body.position.z / solver.worldSize + 0.5) % 1
    const waterHeight = sampleOceanHeight(
      input.heights,
      input.resolution,
      u < 0 ? u + 1 : u,
      v < 0 ? v + 1 : v,
    )
    const draft = waterHeight - body.position.y
    const submerged = Math.max(0, Math.min(1, draft / Math.max(0.01, Math.cbrt(volume))))
    const displaced = volume * submerged
    const buoyantY = displaced * waterDensity * solver.gravity
    const weightY = -mass * solver.gravity
    const netY = buoyantY + weightY
    const dragY = -solver.linearDrag * submerged * Math.sign(netY) * Math.abs(netY) * 0.01
    out.push({
      bodyId: body.id,
      force: { x: 0, y: netY + dragY, z: 0 },
      submerged,
      waterHeight,
      floating: submerged > 0,
      volumeSource: closed ? 'explicit' : 'aabbHeuristicHeld',
      explicitVolumeClosed: closed,
      explicitClosed: closed,
      volumeM3: volume,
      aabbHeuristicHeld: !closed,
    })
  }
  return out
}

export function proveBuoyancyHelpers(): {
  passed: boolean
  floating: boolean
  forceY: number
} {
  const params: OceanSpectrumParams = {
    resolution: 16,
    windSpeed: 10,
    windAngle: 0,
    amplitude: 0.8,
    seed: 7,
  }
  const heights = generateOceanHeightField(params)
  const vol = createOceanBuoyancyVolume('crate', 1, { densityKgPerM3: 200 })
  const forces = computeBuoyancyForces({
    heights,
    resolution: params.resolution,
    bodies: [
      {
        id: 'crate',
        position: { x: 0, y: -50, z: 0 },
        volume: 1,
        mass: 200,
        explicitVolume: vol,
      },
    ],
  })
  const f = forces[0]!
  return {
    passed: OCEAN_BUOYANCY_WIRED && f.floating && f.force.y !== 0 && f.explicitVolumeClosed,
    floating: f.floating,
    forceY: f.force.y,
  }
}

/**
 * Letter cq — surfboard vs crate float differently from OceanBuoyancyVolume metadata.
 */
export function proveExplicitBuoyancySurfboardVsCrate(): {
  passed: boolean
  surfboardForceY: number
  crateForceY: number
  notes: string[]
} {
  const params: OceanSpectrumParams = {
    resolution: 16,
    windSpeed: 10,
    windAngle: 0,
    amplitude: 0.5,
    seed: 9,
  }
  const heights = generateOceanHeightField(params)
  // Same displaced volume — density metadata alone changes float (surfboard light, crate dense).
  const surfboardVol = createOceanBuoyancyVolume('surfboard', 0.5, { densityKgPerM3: 150 })
  const crateVol = createOceanBuoyancyVolume('crate', 0.5, { densityKgPerM3: 900 })
  const forces = computeBuoyancyForces({
    heights,
    resolution: params.resolution,
    bodies: [
      {
        id: 'surfboard',
        position: { x: 0, y: -2, z: 0 },
        volume: 0.01,
        mass: 999, // ignored when densityKgPerM3 present
        explicitVolume: surfboardVol,
      },
      {
        id: 'crate',
        position: { x: 0, y: -2, z: 0 },
        volume: 0.01,
        mass: 999,
        explicitVolume: crateVol,
      },
    ],
  })
  const s = forces.find((f) => f.bodyId === 'surfboard')!
  const c = forces.find((f) => f.bodyId === 'crate')!
  const passed =
    s.explicitVolumeClosed &&
    c.explicitVolumeClosed &&
    s.force.y > c.force.y &&
    Math.abs(s.force.y - c.force.y) > 1
  return {
    passed,
    surfboardForceY: s.force.y,
    crateForceY: c.force.y,
    notes: [
      passed
        ? 'surfboard ≠ crate from OceanBuoyancyVolume metadata (cq CLOSED)'
        : 'surfboard/crate force contrast failed',
    ],
  }
}

/** Alias for honesty / tests. */
export function proveExplicitBuoyancyContrast(): {
  passed: boolean
  letter: 'cq'
  surfForceY: number
  crateForceY: number
  surfboardForceY: number
  crateForceYAlias: number
  missingSkipped: boolean
  notes: string[]
} {
  const r = proveExplicitBuoyancySurfboardVsCrate()
  const params: OceanSpectrumParams = {
    resolution: 16,
    windSpeed: 10,
    windAngle: 0,
    amplitude: 0.5,
    seed: 9,
  }
  const heights = generateOceanHeightField(params)
  const withMissing = computeBuoyancyForces({
    heights,
    resolution: params.resolution,
    bodies: [
      {
        id: 'no-meta',
        position: { x: 0, y: -2, z: 0 },
        volume: 2,
        mass: 100,
      },
    ],
  })
  // Fail-closed may omit the body OR emit an honest zero-force row (not floating).
  const missingSkipped =
    withMissing.length === 0 ||
    withMissing.every((f) => !f.floating && f.force.y === 0 && !f.explicitVolumeClosed)
  return {
    passed: r.passed && missingSkipped,
    letter: 'cq',
    surfForceY: r.surfboardForceY,
    crateForceY: r.crateForceY,
    surfboardForceY: r.surfboardForceY,
    crateForceYAlias: r.crateForceY,
    missingSkipped,
    notes: r.notes,
  }
}
