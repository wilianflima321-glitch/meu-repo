/**
 * Letter cm — Ocean playtest wire (Zero-MVP).
 * Multi-frame FFT mesh soak + buoyancy force apply (Rapier duck-typed).
 * SimulationTick / GameLoop opt-in — not lib-only.
 * UE Water parity / GPU FFT stay HELD.
 */

import { proveOceanFft } from '@/lib/ocean/fft-displacement'
import {
  computeBuoyancyForces,
  proveBuoyancyHelpers,
  type BuoyancyBodySample,
  type BuoyancyForceResult,
  type BuoyancySolverParams,
} from '@/lib/ocean/buoyancy'
import {
  OCEAN_CAPABILITY_BUDGET_WIRED,
  OCEAN_VIEWPORT_OPTIN_WIRED,
  planOceanViewportOptIn,
  resolveOceanCapabilityBudget,
} from '@/lib/ocean/ocean-capability-budget'
import {
  OCEAN_VIEWPORT_WIRE_WIRED,
  bindOceanViewportMesh,
  createOceanViewportMockMesh,
  proveOceanCapScoreMeshContrast,
  tickOceanViewportDisplacement,
  type OceanMeshTarget,
} from '@/lib/ocean/ocean-viewport-wire'

export const OCEAN_PLAYTEST_WIRE_LETTER = 'cm' as const
export const OCEAN_PLAYTEST_WIRE_WIRED = true as const

/** Duck-typed Rapier / PhysicsBody force sink. */
export interface OceanForceBody {
  addForce: (force: { x: number; y: number; z: number }, mode?: 'force' | 'impulse') => void
}

export interface OceanBuoyancyTickResult {
  letter: typeof OCEAN_PLAYTEST_WIRE_LETTER
  applied: boolean
  zeroUiUnavailable: boolean
  forcesApplied: number
  floatingCount: number
  results: BuoyancyForceResult[]
}

/**
 * Apply buoyancy helpers to dynamic bodies near water.
 * Null applicator / empty bodies / opt-in off → Zero-UI silent no-op.
 */
export function tickOceanBuoyancy(input: {
  heights: Float32Array | null | undefined
  resolution: number
  bodies: BuoyancyBodySample[]
  /** Map bodyId → force applicator (Rapier PhysicsBody or mock). */
  applyForce?: (bodyId: string, force: { x: number; y: number; z: number }) => boolean
  bodiesById?: Map<string, OceanForceBody>
  solver?: Partial<BuoyancySolverParams>
  enabled?: boolean
  buoyancyBodiesMax?: number
}): OceanBuoyancyTickResult {
  if (
    input.enabled === false ||
    !input.heights ||
    input.heights.length === 0 ||
    input.bodies.length === 0
  ) {
    return {
      letter: OCEAN_PLAYTEST_WIRE_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      forcesApplied: 0,
      floatingCount: 0,
      results: [],
    }
  }

  const max = Math.max(1, input.buoyancyBodiesMax ?? 64)
  const bodies = input.bodies.slice(0, max)
  const results = computeBuoyancyForces({
    heights: input.heights,
    resolution: input.resolution,
    bodies,
    solver: input.solver,
    requireExplicitVolume: true,
  })

  let forcesApplied = 0
  let floatingCount = 0
  for (const r of results) {
    if (r.floating) floatingCount += 1
    if (r.force.x === 0 && r.force.y === 0 && r.force.z === 0) continue
    let ok = false
    if (input.applyForce) {
      ok = input.applyForce(r.bodyId, r.force)
    } else if (input.bodiesById) {
      const body = input.bodiesById.get(r.bodyId)
      if (body) {
        body.addForce(r.force, 'force')
        ok = true
      }
    }
    if (ok) forcesApplied += 1
  }

  const hasApplicator = Boolean(input.applyForce || input.bodiesById)
  if (!hasApplicator) {
    return {
      letter: OCEAN_PLAYTEST_WIRE_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      forcesApplied: 0,
      floatingCount,
      results,
    }
  }

  return {
    letter: OCEAN_PLAYTEST_WIRE_LETTER,
    applied: forcesApplied > 0,
    zeroUiUnavailable: false,
    forcesApplied,
    floatingCount,
    results,
  }
}

/**
 * Combined viewport displace + buoyancy tick for SimulationTick hot path.
 */
export function tickOceanFromSimulation(input: {
  capabilityScore: number
  userEnabled: boolean
  applyBuoyancy?: boolean
  bodies: BuoyancyBodySample[]
  applyForce?: (bodyId: string, force: { x: number; y: number; z: number }) => boolean
  bodiesById?: Map<string, OceanForceBody>
  mesh?: OceanMeshTarget | null
  seed?: number
  waveScale?: number
}): {
  displace: ReturnType<typeof tickOceanViewportDisplacement>
  buoyancy: OceanBuoyancyTickResult
  fftResolution: number
} {
  const opt = planOceanViewportOptIn({
    capabilityScore: input.capabilityScore,
    userEnabled: input.userEnabled,
    applyBuoyancy: input.applyBuoyancy,
  })
  const budget = resolveOceanCapabilityBudget(input.capabilityScore)
  const displace = tickOceanViewportDisplacement({
    capabilityScore: input.capabilityScore,
    userEnabled: input.userEnabled,
    seed: input.seed,
    waveScale: input.waveScale,
    target: input.mesh,
  })
  const buoyancy =
    opt.enabled && opt.applyBuoyancy
      ? tickOceanBuoyancy({
          heights: displace.heights,
          resolution: opt.fftResolution,
          bodies: input.bodies,
          applyForce: input.applyForce,
          bodiesById: input.bodiesById,
          enabled: true,
          buoyancyBodiesMax: budget.buoyancyBodiesMax,
        })
      : {
          letter: OCEAN_PLAYTEST_WIRE_LETTER,
          applied: false,
          zeroUiUnavailable: true,
          forcesApplied: 0,
          floatingCount: 0,
          results: [],
        }

  return { displace, buoyancy, fftResolution: opt.fftResolution }
}

export interface OceanPlaytestSoakResult {
  letter: typeof OCEAN_PLAYTEST_WIRE_LETTER
  passed: boolean
  libWired: boolean
  meshDisplaced: boolean
  buoyancyApplied: boolean
  capScoreContrast: boolean
  framesProven: number
  fftResolution: number
  notes: string[]
}

/**
 * Multi-frame soak: FFT mesh vertices move + buoyancy forces applied + CapScore contrast.
 * Gates `oceanViewportReady` (cm deepen of cg viewportOptInReady).
 */
export function proveOceanViewportSoak(capabilityScore = 38): OceanPlaytestSoakResult {
  const notes: string[] = []
  const mock = createOceanViewportMockMesh(8)
  bindOceanViewportMesh(mock.target)

  const opt = planOceanViewportOptIn({
    capabilityScore,
    userEnabled: true,
    applyBuoyancy: true,
  })
  if (!opt.enabled) {
    notes.push('opt-in failed for soak capabilityScore')
    bindOceanViewportMesh(null)
    return {
      letter: OCEAN_PLAYTEST_WIRE_LETTER,
      passed: false,
      libWired: OCEAN_VIEWPORT_WIRE_WIRED,
      meshDisplaced: false,
      buoyancyApplied: false,
      capScoreContrast: false,
      framesProven: 0,
      fftResolution: opt.fftResolution,
      notes,
    }
  }

  let meshDisplaced = false
  let buoyancyApplied = false
  let frames = 0
  let lastPeak = 0
  const appliedForces: Array<{ id: string; y: number }> = []

  const bodies: BuoyancyBodySample[] = [
    {
      id: 'crate',
      position: { x: 0, y: -40, z: 0 },
      volume: 1.5,
      mass: 200,
      explicitVolume: {
        type: 'oceanBuoyancyVolume',
        entityId: 'crate',
        volumeM3: 1.5,
        densityKgPerM3: 200,
      },
    },
    {
      id: 'barrel',
      position: { x: 8, y: -30, z: 4 },
      volume: 0.8,
      mass: 120,
      explicitVolume: {
        type: 'oceanBuoyancyVolume',
        entityId: 'barrel',
        volumeM3: 0.8,
        densityKgPerM3: 150,
      },
    },
  ]

  for (let frame = 0; frame < 4; frame++) {
    const { displace, buoyancy } = tickOceanFromSimulation({
      capabilityScore,
      userEnabled: true,
      applyBuoyancy: true,
      bodies,
      seed: 42 + frame,
      mesh: mock.target,
      applyForce: (id, force) => {
        appliedForces.push({ id, y: force.y })
        return true
      },
    })
    frames += 1
    if (displace.applied && displace.verticesDisplaced > 0 && displace.peakAbs > 0) {
      meshDisplaced = true
      lastPeak = Math.max(lastPeak, displace.peakAbs)
    }
    if (buoyancy.applied && buoyancy.forcesApplied > 0 && buoyancy.floatingCount > 0) {
      buoyancyApplied = true
    }
  }

  // Vertices must have left rest plane.
  let anyNonZeroZ = false
  for (let i = 2; i < mock.positions.length; i += 3) {
    if (mock.positions[i] !== 0) {
      anyNonZeroZ = true
      break
    }
  }
  if (!anyNonZeroZ) {
    meshDisplaced = false
    notes.push('mesh soak failed — vertex Z stayed at rest')
  }

  if (!buoyancyApplied || appliedForces.length === 0) {
    notes.push('buoyancy soak failed — expected addForce on submerged bodies')
  }

  const contrast = proveOceanCapScoreMeshContrast()
  const lowTick = tickOceanViewportDisplacement({
    capabilityScore: 12,
    userEnabled: true,
    seed: 1,
    target: createOceanViewportMockMesh(4).target,
  })
  const highTick = tickOceanViewportDisplacement({
    capabilityScore: 80,
    userEnabled: true,
    seed: 1,
    target: createOceanViewportMockMesh(4).target,
  })
  const capScoreContrast =
    contrast.passed &&
    lowTick.fftResolution < highTick.fftResolution &&
    lowTick.applied &&
    highTick.applied

  if (!capScoreContrast) {
    notes.push('CapScore contrast soak failed — GT730 FFT res should be tighter')
  }

  // Zero-UI when off
  const off = tickOceanFromSimulation({
    capabilityScore,
    userEnabled: false,
    bodies,
    applyForce: () => true,
    mesh: mock.target,
  })
  if (!off.displace.zeroUiUnavailable || off.buoyancy.applied) {
    notes.push('Zero-UI fail — opt-out must silent no-op')
  }

  // Scaffold cg still green
  const fft = proveOceanFft()
  const buoy = proveBuoyancyHelpers()
  if (!fft.passed || !buoy.passed) {
    notes.push('cg scaffold regress')
  }

  // Unbind after soak
  bindOceanViewportMesh(null)

  const zeroUiOk = off.displace.zeroUiUnavailable && !off.buoyancy.applied
  const passed =
    OCEAN_PLAYTEST_WIRE_WIRED &&
    OCEAN_VIEWPORT_WIRE_WIRED &&
    OCEAN_CAPABILITY_BUDGET_WIRED &&
    OCEAN_VIEWPORT_OPTIN_WIRED &&
    meshDisplaced &&
    buoyancyApplied &&
    capScoreContrast &&
    zeroUiOk &&
    fft.passed &&
    buoy.passed &&
    frames >= 4 &&
    lastPeak > 0

  if (passed) {
    notes.push(
      'oceanViewportReady soak CLOSED (letter cm) — FFT mesh + buoyancy apply + CapScore proven',
    )
  }

  return {
    letter: OCEAN_PLAYTEST_WIRE_LETTER,
    passed,
    libWired: OCEAN_VIEWPORT_WIRE_WIRED && OCEAN_PLAYTEST_WIRE_WIRED,
    meshDisplaced,
    buoyancyApplied,
    capScoreContrast,
    framesProven: passed ? frames : 0,
    fftResolution: opt.fftResolution,
    notes,
  }
}
