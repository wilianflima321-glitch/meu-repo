/**
 * Letter cy — GPU Fracture + Mass ECS playtest wire (Zero-MVP).
 *
 * Opt-in SimulationTick / GameLoop ticks that run cv fracture debris integrate
 * + cw Mass ECS SoA step on the playtest hot path (not lib-only).
 * WebGPU when CapScore + device allow; CPU Zero-UI fallback otherwise.
 *
 * Honesty probe `fractureMassPlaytestReady` is DISTINCT from cv `gpuFractureReady`
 * and cw `gpuMassEcsReady`. Chaos / 100k / Unreal Mass stay HELD.
 */

import * as THREE from 'three'
import {
  GPU_FRACTURE_MIN_CAPABILITY_SCORE,
  GPU_FRACTURE_WIRED,
  buildHierarchicalVoronoiPlan,
  createMockGpuFractureDevice,
  fractureAndIntegrate,
  planGpuFracture,
  type GpuFractureBackend,
  type GpuFractureGpuDeviceLike,
  type IntegrateFractureDebrisResult,
} from '@/lib/destruction'
import {
  GPU_MASS_ECS_WIRED,
  createMassAgentSoaBuffers,
  createMockGpuMassEcsDevice,
  fillSyntheticMassCrowd,
  planGpuMassEcs,
  stepMassEcsGpuOrCpu,
  type GpuMassEcsBackend,
  type GpuMassEcsGpuDeviceLike,
  type MassAgentSoaBuffers,
} from '@/lib/mass-ecs'

export const FRACTURE_MASS_PLAYTEST_LETTER = 'cy' as const
export const FRACTURE_MASS_PLAYTEST_WIRED = true as const

/** Playtest agent count — small hot-path crowd (cw library soak stays 1k–10k). */
export const FRACTURE_MASS_PLAYTEST_AGENT_COUNT = 128 as const
export const FRACTURE_MASS_PLAYTEST_DEBRIS_LEVELS = 2 as const

export interface FractureMassPlaytestSession {
  capabilityScore: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  /** Library soak evidence (cv) — optional; playtest can still run CPU. */
  fractureSoakPassed: boolean
  /** Library soak evidence (cw) — optional; playtest can still run CPU. */
  massSoakPassed: boolean
  fractureDevice: GpuFractureGpuDeviceLike | null
  massDevice: GpuMassEcsGpuDeviceLike | null
  massBuffers: MassAgentSoaBuffers
  seed: number
  impactForce: number
}

export interface FractureMassTickResult {
  letter: typeof FRACTURE_MASS_PLAYTEST_LETTER
  applied: boolean
  zeroUiUnavailable: boolean
  fractureBackend: GpuFractureBackend
  massBackend: GpuMassEcsBackend
  debrisMoved: boolean
  massAgentsActive: number
  massLodUploaded: number
  peakDebrisSpeed: number
  notes: string[]
  integrate: IntegrateFractureDebrisResult | null
}

export function createFractureMassPlaytestSession(input?: {
  capabilityScore?: number
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  fractureSoakPassed?: boolean
  massSoakPassed?: boolean
  fractureDevice?: GpuFractureGpuDeviceLike | null
  massDevice?: GpuMassEcsGpuDeviceLike | null
  agentCount?: number
  seed?: number
}): FractureMassPlaytestSession {
  const capabilityScore = resolveScore(input?.capabilityScore)
  const agentCount = Math.max(
    8,
    Math.min(512, input?.agentCount ?? FRACTURE_MASS_PLAYTEST_AGENT_COUNT),
  )
  const buffers = createMassAgentSoaBuffers(agentCount)
  fillSyntheticMassCrowd(buffers, agentCount)
  return {
    capabilityScore,
    webgpuAvailable: input?.webgpuAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    fractureSoakPassed: input?.fractureSoakPassed === true,
    massSoakPassed: input?.massSoakPassed === true,
    fractureDevice: input?.fractureDevice ?? null,
    massDevice: input?.massDevice ?? null,
    massBuffers: buffers,
    seed: input?.seed ?? 42,
    impactForce: 12,
  }
}

function resolveScore(score: number | undefined): number {
  if (!Number.isFinite(score)) return 38
  return Math.max(0, Math.min(100, Math.round(score as number)))
}

/**
 * One playtest tick: hierarchical fracture integrate + Mass ECS SoA step.
 * `enabled === false` / null session → Zero-UI silent no-op.
 */
export function tickFractureMassPlaytest(input: {
  session: FractureMassPlaytestSession | null | undefined
  enabled?: boolean
  dt?: number
}): FractureMassTickResult {
  const notes: string[] = []
  if (input.enabled === false || !input.session) {
    return {
      letter: FRACTURE_MASS_PLAYTEST_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      fractureBackend: 'cpu-debris-fallback',
      massBackend: 'cpu-soa-fallback',
      debrisMoved: false,
      massAgentsActive: 0,
      massLodUploaded: 0,
      peakDebrisSpeed: 0,
      notes: ['Zero-UI — fracture/mass playtest off or unbound'],
      integrate: null,
    }
  }

  const session = input.session
  const dt = input.dt ?? 1 / 60
  session.seed += 1

  const bounds = new THREE.Box3(
    new THREE.Vector3(-1, 0, -1),
    new THREE.Vector3(1, 2, 1),
  )
  const impact = new THREE.Vector3(
    Math.sin(session.seed * 0.17) * 0.3,
    0.5,
    Math.cos(session.seed * 0.13) * 0.3,
  )

  const { integrate, plan } = fractureAndIntegrate({
    bounds,
    impactPoint: impact,
    impactForce: session.impactForce,
    levels: FRACTURE_MASS_PLAYTEST_DEBRIS_LEVELS,
    fragmentsPerLevel: 4,
    seed: session.seed,
    capabilityScore: session.capabilityScore,
    webgpuAvailable: session.webgpuAvailable,
    webgpuComputeAvailable: session.webgpuComputeAvailable,
    soakPassed: session.fractureSoakPassed,
    device: session.fractureDevice,
    dt,
  })
  void plan

  let peakDebrisSpeed = 0
  let debrisMoved = false
  for (let i = 0; i < integrate.positions.length; i += 4) {
    const vx = integrate.velocities[i] ?? 0
    const vy = integrate.velocities[i + 1] ?? 0
    const vz = integrate.velocities[i + 2] ?? 0
    const speed = Math.hypot(vx, vy, vz)
    peakDebrisSpeed = Math.max(peakDebrisSpeed, speed)
    if (
      Math.abs(integrate.positions[i] ?? 0) > 1e-6 ||
      Math.abs(integrate.positions[i + 1] ?? 0) > 1e-6 ||
      Math.abs(integrate.positions[i + 2] ?? 0) > 1e-6
    ) {
      debrisMoved = true
    }
  }
  if (peakDebrisSpeed > 0) debrisMoved = true
  notes.push(...integrate.notes)

  const mass = stepMassEcsGpuOrCpu({
    buffers: session.massBuffers,
    dt,
    capabilityScore: session.capabilityScore,
    webgpuAvailable: session.webgpuAvailable,
    webgpuComputeAvailable: session.webgpuComputeAvailable,
    soakPassed: session.massSoakPassed,
    device: session.massDevice,
    camera: { x: 0, y: 0, z: 0 },
    lodRadius: 48,
  })
  notes.push(...mass.notes)

  let massAgentsActive = 0
  for (let i = 0; i < session.massBuffers.count; i++) {
    if (session.massBuffers.states[i] !== 0) massAgentsActive += 1
  }

  return {
    letter: FRACTURE_MASS_PLAYTEST_LETTER,
    applied: debrisMoved && massAgentsActive > 0,
    zeroUiUnavailable: false,
    fractureBackend: integrate.backend,
    massBackend: mass.backend,
    debrisMoved,
    massAgentsActive,
    massLodUploaded: mass.lod.uploadedCount,
    peakDebrisSpeed,
    notes,
    integrate,
  }
}

export interface FractureMassPlaytestSoakResult {
  letter: typeof FRACTURE_MASS_PLAYTEST_LETTER
  passed: boolean
  libWired: boolean
  framesProven: number
  fractureStepped: boolean
  massStepped: boolean
  gpuPathWhenAvailable: boolean
  cpuFallbackGt730: boolean
  zeroUiOptOut: boolean
  /** Distinct from cv/cw library readiness — playtest hot path only. */
  fractureMassPlaytestReady: boolean
  notes: string[]
}

/**
 * Multi-frame soak for `fractureMassPlaytestReady`.
 * Does NOT flip cv `gpuFractureReady` / cw `gpuMassEcsReady` / Chaos / 100k.
 */
export function proveFractureMassPlaytestSoak(input?: {
  capabilityScore?: number
  frames?: number
  withGpuMocks?: boolean
}): FractureMassPlaytestSoakResult {
  const notes: string[] = []
  const frames = Math.max(2, input?.frames ?? 4)
  const capabilityScore = resolveScore(input?.capabilityScore ?? 38)
  const withGpu = input?.withGpuMocks !== false
  const gt730 = capabilityScore < GPU_FRACTURE_MIN_CAPABILITY_SCORE

  const fractureDevice = withGpu && !gt730 ? createMockGpuFractureDevice() : null
  const massDevice = withGpu && !gt730 ? createMockGpuMassEcsDevice() : null

  const session = createFractureMassPlaytestSession({
    capabilityScore,
    webgpuAvailable: withGpu && !gt730,
    webgpuComputeAvailable: withGpu && !gt730,
    // Playtest soak does not require library GPU soak — CPU path still counts.
    fractureSoakPassed: withGpu && !gt730,
    massSoakPassed: withGpu && !gt730,
    fractureDevice,
    massDevice,
    agentCount: 64,
    seed: 7,
  })

  let fractureStepped = false
  let massStepped = false
  let framesProven = 0
  let sawGpuFracture = false
  let sawGpuMass = false

  for (let f = 0; f < frames; f++) {
    const tick = tickFractureMassPlaytest({ session, enabled: true, dt: 1 / 60 })
    framesProven += 1
    if (tick.debrisMoved && tick.peakDebrisSpeed > 0) fractureStepped = true
    if (tick.massAgentsActive > 0) massStepped = true
    if (tick.fractureBackend === 'webgpu-compute') sawGpuFracture = true
    if (tick.massBackend === 'webgpu-compute') sawGpuMass = true
  }

  if (!fractureStepped) notes.push('fracture soak failed — debris did not move')
  if (!massStepped) notes.push('mass soak failed — no active agents after step')

  // CapScore GT730: must select CPU backends (Zero-UI GPU blocked) while still stepping.
  const lowSession = createFractureMassPlaytestSession({
    capabilityScore: 12,
    webgpuAvailable: true,
    webgpuComputeAvailable: true,
    fractureSoakPassed: true,
    massSoakPassed: true,
    fractureDevice: createMockGpuFractureDevice(),
    massDevice: createMockGpuMassEcsDevice(),
    agentCount: 32,
  })
  const lowTick = tickFractureMassPlaytest({
    session: lowSession,
    enabled: true,
  })
  const fracturePlanLow = planGpuFracture({
    webgpuAvailable: true,
    webgpuComputeAvailable: true,
    capabilityScore: 12,
    soakPassed: true,
  })
  const massPlanLow = planGpuMassEcs({
    webgpuAvailable: true,
    webgpuComputeAvailable: true,
    capabilityScore: 12,
    soakPassed: true,
  })
  const cpuFallbackGt730 =
    fracturePlanLow.backend === 'cpu-debris-fallback' &&
    massPlanLow.backend === 'cpu-soa-fallback' &&
    lowTick.fractureBackend === 'cpu-debris-fallback' &&
    lowTick.massBackend === 'cpu-soa-fallback' &&
    lowTick.debrisMoved &&
    lowTick.massAgentsActive > 0

  if (!cpuFallbackGt730) {
    notes.push('GT730 CapScore CPU fallback soak failed')
  }

  const off = tickFractureMassPlaytest({ session, enabled: false })
  const zeroUiOptOut = off.zeroUiUnavailable === true && off.applied === false
  if (!zeroUiOptOut) notes.push('Zero-UI opt-out failed')

  const unbound = tickFractureMassPlaytest({ session: null, enabled: true })
  if (!unbound.zeroUiUnavailable) notes.push('null session must Zero-UI')

  const gpuPathWhenAvailable =
    gt730 || !withGpu ? true : sawGpuFracture && sawGpuMass

  if (!gpuPathWhenAvailable) {
    notes.push('expected webgpu-compute backends when mocks + CapScore allow')
  }

  // Prove Voronoi plan still builds (cv lib not regressing).
  const planSmoke = buildHierarchicalVoronoiPlan({
    bounds: new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1)),
    impactPoint: new THREE.Vector3(0, 0.5, 0),
    impactForce: 8,
    levels: 1,
    fragmentsPerLevel: 4,
    seed: 1,
  })
  if (planSmoke.entries.length === 0) {
    notes.push('cv Voronoi plan regress — empty entries')
  }

  const libWired =
    GPU_FRACTURE_WIRED === true &&
    GPU_MASS_ECS_WIRED === true &&
    FRACTURE_MASS_PLAYTEST_WIRED === true

  const passed =
    libWired &&
    fractureStepped &&
    massStepped &&
    cpuFallbackGt730 &&
    zeroUiOptOut &&
    unbound.zeroUiUnavailable &&
    gpuPathWhenAvailable &&
    framesProven >= frames &&
    planSmoke.entries.length > 0

  if (passed) {
    notes.push(
      'fractureMassPlaytestReady soak CLOSED (letter cy) — SimulationTick fracture+mass path; distinct from cv/cw library readiness',
    )
  } else {
    notes.unshift('fractureMassPlaytestReady pending — playtest soak incomplete')
  }

  return {
    letter: FRACTURE_MASS_PLAYTEST_LETTER,
    passed,
    libWired,
    framesProven: passed ? framesProven : 0,
    fractureStepped,
    massStepped,
    gpuPathWhenAvailable,
    cpuFallbackGt730,
    zeroUiOptOut,
    fractureMassPlaytestReady: passed,
    notes,
  }
}
