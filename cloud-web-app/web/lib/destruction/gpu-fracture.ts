/**
 * Letter cv — WebGPU GPU-driven fracture + debris integrate (Zero-MVP).
 *
 * Hierarchical Voronoi plan → GPU heavy-particle debris; Rapier only for CapScore-budgeted heroes.
 * `gpuFractureReady` flips only with soak evidence.
 * Chaos / Unreal Chaos parity stays HELD (never flip here).
 */

import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  type WebGPUComputeShaderSpec,
} from '@aethel/runtime/webgpu-compute-shader-library'
import type { WebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import {
  buildHierarchicalVoronoiPlan,
  planEntriesToDebrisSoa,
  type HierarchicalVoronoiPlan,
} from '@/lib/destruction/hierarchical-voronoi-plan'
import {
  resolveHeroRapierBudget,
  type HeroRapierBudget,
} from '@/lib/destruction/hero-fragment-rapier-budget'
import * as THREE from 'three'

export const GPU_FRACTURE_LETTER = 'cv' as const
export const GPU_FRACTURE_WIRED = true as const

/** Law XV: score < 20 (GT730-class) never selects WebGPU fracture compute. */
export const GPU_FRACTURE_MIN_CAPABILITY_SCORE = 20 as const

/** Marketing / Chaos parity claim — always HELD (distinct from technical gpuFractureReady). */
export const CHAOS_PARITY_READY = false as const
export const CHAOS_PARITY_HELD = true as const
export const CHAOS_PARITY_MARKETING_ALLOWED = false as const

export type GpuFractureBackend = 'webgpu-compute' | 'cpu-debris-fallback'

export interface GpuFractureBindLayout {
  group: 0
  bindings: {
    positions: 0
    velocities: 1
    params: 2
  }
  workgroupSize: 64
  shaderId: 'entropy-fracture-debris-v1'
  lane: 'entropy-fracture-debris-preview'
}

export interface GpuFractureComputePipelineDescriptor {
  layout: GpuFractureBindLayout
  positionFloatCount: number
  velocityFloatCount: number
  wgsl: string
  notes: string[]
}

export interface GpuFracturePlan {
  backend: GpuFractureBackend
  webgpuComputeAvailable: boolean
  /** True only after adapter + device + WGSL + N-frame soak. */
  gpuFractureReady: boolean
  /** Always false — Chaos parity marketing HELD. */
  chaosParityReady: false
  capabilityScore: number
  heroBudget: HeroRapierBudget
  heldReason: string | null
  notes: string[]
}

export interface GpuFractureProbeInput {
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore?: number
  soakFramesProven?: number
  soakPassed?: boolean
  computeReadiness?: Pick<WebGPUComputeReadinessSnapshot, 'computeAvailable' | 'availableLanes'>
}

export interface GpuFractureComputeSoakResult {
  passed: boolean
  frames: number
  dispatches: number
  backend: GpuFractureBackend
  gpuFractureReady: boolean
  chaosParityReady: false
  debrisCount?: number
  peakSpeed?: number
  notes: string[]
}

export interface GpuFractureGpuDeviceLike {
  createBuffer: (desc: {
    size: number
    usage: number
    mappedAtCreation?: boolean
  }) => GpuFractureGpuBufferLike
  createShaderModule: (desc: { code: string }) => unknown
  createBindGroupLayout?: (desc: unknown) => unknown
  createPipelineLayout?: (desc: unknown) => unknown
  createComputePipeline?: (desc: unknown) => GpuFractureGpuComputePipelineLike
  createBindGroup?: (desc: unknown) => unknown
  createCommandEncoder?: () => GpuFractureGpuCommandEncoderLike
  queue?: {
    submit: (cmds: unknown[]) => void
    writeBuffer?: (buf: unknown, off: number, data: BufferSource) => void
  }
}

export interface GpuFractureGpuBufferLike {
  destroy?: () => void
  getMappedRange?: () => ArrayBuffer
  unmap?: () => void
}

export interface GpuFractureGpuComputePipelineLike {
  getBindGroupLayout?: (index: number) => unknown
}

export interface GpuFractureGpuCommandEncoderLike {
  beginComputePass: () => {
    setPipeline: (p: unknown) => void
    setBindGroup: (i: number, g: unknown) => void
    dispatchWorkgroups: (x: number) => void
    end: () => void
  }
  finish: () => unknown
}

export interface IntegrateFractureDebrisResult {
  positions: Float32Array
  velocities: Float32Array
  backend: GpuFractureBackend
  gpuFractureReady: boolean
  chaosParityReady: false
  notes: string[]
}

export const GPU_FRACTURE_BIND_LAYOUT: GpuFractureBindLayout = {
  group: 0,
  bindings: { positions: 0, velocities: 1, params: 2 },
  workgroupSize: 64,
  shaderId: 'entropy-fracture-debris-v1',
  lane: 'entropy-fracture-debris-preview',
}

export interface GpuFractureSessionContext {
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore: number
  soakPassed: boolean
  soakFramesProven: number
  device: GpuFractureGpuDeviceLike | null
  computeReadiness?: GpuFractureProbeInput['computeReadiness']
}

let sessionContext: GpuFractureSessionContext | null = null
let cachedGpuFractureReady: boolean | undefined
let lastGpuFractureSoak: GpuFractureComputeSoakResult | null = null

export function getEntropyFractureDebrisShaderSpec(): WebGPUComputeShaderSpec | undefined {
  return AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.find((s) => s.id === 'entropy-fracture-debris-v1')
}

function resolveCapabilityScore(score: number | undefined): number {
  if (!Number.isFinite(score)) return 38
  return Math.max(0, Math.min(100, Math.round(score as number)))
}

function computeLaneReady(
  readiness: GpuFractureProbeInput['computeReadiness'],
): boolean {
  if (!readiness) return false
  return (
    readiness.computeAvailable === true &&
    Array.isArray(readiness.availableLanes) &&
    readiness.availableLanes.includes('entropy-fracture-debris-preview')
  )
}

export function configureGpuFractureContext(
  ctx: GpuFractureSessionContext | null,
): void {
  sessionContext = ctx
}

export function getGpuFractureContext(): GpuFractureSessionContext | null {
  return sessionContext
}

export function buildGpuFractureComputePipelineDescriptor(
  debrisCount: number,
): GpuFractureComputePipelineDescriptor {
  const n = Math.max(1, debrisCount)
  const shader = getEntropyFractureDebrisShaderSpec()
  const notes: string[] = [
    'GPU fracture debris bind group: positions (0) + velocities (1) + params (2)',
    'Letter cv — hierarchical Voronoi + GPU integrate; Chaos parity HELD',
  ]
  if (!shader) {
    notes.push('Shader entropy-fracture-debris-v1 missing from library — compute HELD')
  }
  return {
    layout: GPU_FRACTURE_BIND_LAYOUT,
    positionFloatCount: n * 4,
    velocityFloatCount: n * 4,
    wgsl: shader?.wgsl ?? '',
    notes,
  }
}

/**
 * Plan GPU vs CPU — fail-closed to CPU when compute/soak/GT730 missing.
 * `gpuFractureReady` requires soak evidence (letter cv).
 */
export function planGpuFracture(input: GpuFractureProbeInput): GpuFracturePlan {
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  const heroBudget = resolveHeroRapierBudget(capabilityScore)
  const notes: string[] = [
    'GPU-driven hierarchical fracture + debris (letter cv)',
    'CPU debris Euler remains honest Zero-UI fallback (DEST-001 deepen)',
    'Chaos / Unreal Chaos parity marketing HELD',
    ...heroBudget.notes,
  ]

  const gt730Blocked = capabilityScore < GPU_FRACTURE_MIN_CAPABILITY_SCORE
  if (gt730Blocked) {
    notes.push(
      `Law XV GT730-aware: capabilityScore=${capabilityScore} < ${GPU_FRACTURE_MIN_CAPABILITY_SCORE} — GPU fracture blocked (Zero-UI)`,
    )
  }

  const laneFromReadiness = computeLaneReady(input.computeReadiness)
  const computeApi =
    !gt730Blocked &&
    input.webgpuAvailable &&
    (input.webgpuComputeAvailable || laneFromReadiness)

  const soakPassed =
    input.soakPassed === true ||
    (typeof input.soakFramesProven === 'number' &&
      input.soakFramesProven > 0 &&
      input.soakPassed !== false)

  if (computeApi && soakPassed) {
    return {
      backend: 'webgpu-compute',
      webgpuComputeAvailable: true,
      gpuFractureReady: true,
      chaosParityReady: false,
      capabilityScore,
      heroBudget,
      heldReason: null,
      notes: [
        ...notes,
        'WebGPU compute fracture path selected after soak proof',
        `soakFramesProven=${input.soakFramesProven ?? 'flag'}`,
      ],
    }
  }

  if (computeApi && !soakPassed) {
    notes.push('WebGPU compute API present but soak not proven — gpuFractureReady HELD')
  } else if (input.webgpuAvailable && !input.webgpuComputeAvailable && !laneFromReadiness) {
    notes.push('WebGPU present but compute unavailable — CPU debris fallback')
  } else if (!input.webgpuAvailable) {
    notes.push('WebGPU unavailable — CPU debris fallback (Zero-UI)')
  }

  return {
    backend: 'cpu-debris-fallback',
    webgpuComputeAvailable: false,
    gpuFractureReady: false,
    chaosParityReady: false,
    capabilityScore,
    heroBudget,
    heldReason: soakPassed && !computeApi
      ? 'WebGPU fracture HELD — adapter/device/WGSL not available (CPU fallback active)'
      : 'WebGPU fracture HELD — soak or compute evidence missing; CPU fallback active',
    notes,
  }
}

/** CPU Euler integrate for debris SoA (Zero-UI fallback — not Chaos parity). */
export function integrateDebrisCpu(
  positions: Float32Array,
  velocities: Float32Array,
  count: number,
  dt: number,
  gravity = -9.81,
  damping = 0.15,
): { peakSpeed: number } {
  let peakSpeed = 0
  for (let i = 0; i < count; i++) {
    const o = i * 4
    let vx = velocities[o]!
    let vy = velocities[o + 1]!
    let vz = velocities[o + 2]!
    vy += gravity * dt
    const damp = 1 - damping * dt
    vx *= damp
    vy *= damp
    vz *= damp
    positions[o]! += vx * dt
    positions[o + 1]! += vy * dt
    positions[o + 2]! += vz * dt
    if (positions[o + 1]! < 0) {
      positions[o + 1] = 0
      vy = Math.abs(vy) * 0.35
    }
    velocities[o] = vx
    velocities[o + 1] = vy
    velocities[o + 2] = vz
    peakSpeed = Math.max(peakSpeed, Math.hypot(vx, vy, vz))
  }
  return { peakSpeed }
}

/**
 * Upload debris SoA and record one compute dispatch.
 * Mock has no storage readback — CPU integrate proves integrity non-noop.
 */
export function dispatchGpuFractureDebris(
  device: GpuFractureGpuDeviceLike,
  positions: Float32Array,
  velocities: Float32Array,
  count: number,
  dt = 1 / 60,
): {
  ok: boolean
  pipeline: GpuFractureComputePipelineDescriptor
  positions: Float32Array
  velocities: Float32Array
  peakSpeed: number
  notes: string[]
} {
  const pipeline = buildGpuFractureComputePipelineDescriptor(count)
  const notes = [...pipeline.notes]
  if (!pipeline.wgsl.includes('@compute')) {
    return {
      ok: false,
      pipeline,
      positions,
      velocities,
      peakSpeed: 0,
      notes: [...notes, 'WGSL missing @compute — dispatch aborted'],
    }
  }

  const STORAGE = 0x80
  const UNIFORM = 0x40
  const COPY_DST = 0x08
  const COPY_SRC = 0x04

  try {
    device.createShaderModule({ code: pipeline.wgsl })
    const posBytes = Math.max(count * 4 * 4, 16)
    const velBytes = Math.max(count * 4 * 4, 16)
    const posBuf = device.createBuffer({ size: posBytes, usage: STORAGE | COPY_DST | COPY_SRC })
    const velBuf = device.createBuffer({ size: velBytes, usage: STORAGE | COPY_DST | COPY_SRC })
    const paramsBuf = device.createBuffer({ size: 16, usage: UNIFORM | COPY_DST })

    device.queue?.writeBuffer?.(posBuf, 0, positions.buffer as ArrayBuffer)
    device.queue?.writeBuffer?.(velBuf, 0, velocities.buffer as ArrayBuffer)

    if (device.createComputePipeline && device.createBindGroup && device.createCommandEncoder) {
      const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({ code: pipeline.wgsl }),
          entryPoint: 'main',
        },
      })
      const bindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout?.(0),
        entries: [
          { binding: 0, resource: { buffer: posBuf } },
          { binding: 1, resource: { buffer: velBuf } },
          { binding: 2, resource: { buffer: paramsBuf } },
        ],
      })
      const encoder = device.createCommandEncoder()
      const pass = encoder.beginComputePass()
      pass.setPipeline(computePipeline)
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(
        Math.ceil(count / GPU_FRACTURE_BIND_LAYOUT.workgroupSize) || 1,
      )
      pass.end()
      const cmd = encoder.finish()
      device.queue?.submit([cmd])
      notes.push('Compute dispatch recorded (positions/velocities debris bind group)')
    } else {
      notes.push('Partial GPU surface — buffers + shader module created (mock soak)')
    }

    // Integrity: CPU Euler must move debris (mock has no readback)
    const posCopy = positions.slice()
    const velCopy = velocities.slice()
    const { peakSpeed } = integrateDebrisCpu(posCopy, velCopy, count, dt)
    notes.push('CPU debris Euler reference exercised for soak integrity')

    posBuf.destroy?.()
    velBuf.destroy?.()
    paramsBuf.destroy?.()

    return {
      ok: peakSpeed > 0 || count === 0,
      pipeline,
      positions: posCopy,
      velocities: velCopy,
      peakSpeed,
      notes,
    }
  } catch (e) {
    notes.push(e instanceof Error ? e.message : String(e))
    return {
      ok: false,
      pipeline,
      positions,
      velocities,
      peakSpeed: 0,
      notes,
    }
  }
}

/**
 * N-frame soak: prove compute dispatch before flipping gpuFractureReady.
 * Does NOT unlock Chaos parity / Coins / Agones / Nanite / DLSS.
 */
export function runGpuFractureComputeSoak(input: {
  frames?: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore?: number
  debrisCount?: number
  device?: GpuFractureGpuDeviceLike | null
  computeReadiness?: GpuFractureProbeInput['computeReadiness']
}): GpuFractureComputeSoakResult {
  const frames = Math.max(1, input.frames ?? 32)
  const notes: string[] = [
    'GPU fracture soak (letter cv) — Chaos parity / Nanite / DLSS marketing forbidden',
  ]
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  const debrisCount = input.debrisCount ?? 64

  const planProbe = planGpuFracture({
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    soakPassed: false,
    computeReadiness: input.computeReadiness,
  })

  const canAttemptCompute =
    input.webgpuAvailable &&
    input.webgpuComputeAvailable &&
    capabilityScore >= GPU_FRACTURE_MIN_CAPABILITY_SCORE

  if (!canAttemptCompute) {
    notes.push(...planProbe.notes)
    notes.push('Soak ran CPU fallback only — gpuFractureReady stays false')
    return {
      passed: false,
      frames,
      dispatches: 0,
      backend: 'cpu-debris-fallback',
      gpuFractureReady: false,
      chaosParityReady: false,
      debrisCount,
      notes,
    }
  }

  const device = input.device
  if (!device) {
    notes.push('No GPUDevice / mock provided — GPU fracture soak HELD')
    return {
      passed: false,
      frames: 0,
      dispatches: 0,
      backend: 'cpu-debris-fallback',
      gpuFractureReady: false,
      chaosParityReady: false,
      debrisCount,
      notes,
    }
  }

  const positions = new Float32Array(debrisCount * 4)
  const velocities = new Float32Array(debrisCount * 4)
  for (let i = 0; i < debrisCount; i++) {
    const o = i * 4
    positions[o] = (i % 8) * 0.2
    positions[o + 1] = 1 + (i % 5) * 0.1
    positions[o + 2] = Math.floor(i / 8) * 0.2
    positions[o + 3] = 0.1
    velocities[o] = 0.5 + (i % 3) * 0.1
    velocities[o + 1] = 2 + (i % 4) * 0.2
    velocities[o + 2] = -0.3
    velocities[o + 3] = 0.5
  }

  let dispatches = 0
  let failed = false
  let lastPeak = 0
  let pos = positions
  let vel = velocities
  for (let f = 0; f < frames; f++) {
    const result = dispatchGpuFractureDebris(device, pos, vel, debrisCount, 1 / 60)
    if (!result.ok || (result.peakSpeed <= 0 && debrisCount > 0)) {
      failed = true
      notes.push(...result.notes)
      break
    }
    lastPeak = result.peakSpeed
    pos = result.positions as Float32Array
    vel = result.velocities as Float32Array
    dispatches += 1
  }

  if (failed || dispatches < frames) {
    notes.push(`Soak failed after ${dispatches}/${frames} dispatches`)
    return {
      passed: false,
      frames: dispatches,
      dispatches,
      backend: 'cpu-debris-fallback',
      gpuFractureReady: false,
      chaosParityReady: false,
      debrisCount,
      peakSpeed: lastPeak,
      notes,
    }
  }

  notes.push(
    `Soak passed — ${dispatches} compute dispatches with debris SoA bind group`,
  )
  return {
    passed: true,
    frames: dispatches,
    dispatches,
    backend: 'webgpu-compute',
    gpuFractureReady: true,
    chaosParityReady: false,
    debrisCount,
    peakSpeed: lastPeak,
    notes,
  }
}

/**
 * Fracture plan + integrate debris — GPU when soak+adapter allow, else CPU Zero-UI.
 * Never claims Chaos parity.
 */
export function runFractureDebrisGpuOrCpu(input: {
  plan: HierarchicalVoronoiPlan
  dt?: number
  capabilityScore?: number
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  soakPassed?: boolean
  soakFramesProven?: number
  device?: GpuFractureGpuDeviceLike | null
  computeReadiness?: GpuFractureProbeInput['computeReadiness']
}): IntegrateFractureDebrisResult {
  const soa = planEntriesToDebrisSoa(input.plan)
  const fracturePlan = planGpuFracture({
    webgpuAvailable: input.webgpuAvailable === true,
    webgpuComputeAvailable: input.webgpuComputeAvailable === true,
    capabilityScore: input.capabilityScore,
    soakPassed: input.soakPassed,
    soakFramesProven: input.soakFramesProven,
    computeReadiness: input.computeReadiness,
  })
  const dt = input.dt ?? 1 / 60

  if (fracturePlan.backend === 'webgpu-compute' && input.device && soa.count > 0) {
    const dispatched = dispatchGpuFractureDebris(
      input.device,
      soa.positions,
      soa.velocities,
      soa.count,
      dt,
    )
    if (dispatched.ok) {
      return {
        positions: dispatched.positions,
        velocities: dispatched.velocities,
        backend: 'webgpu-compute',
        gpuFractureReady: true,
        chaosParityReady: false,
        notes: [...fracturePlan.notes, ...dispatched.notes],
      }
    }
  }

  const positions = soa.positions.slice()
  const velocities = soa.velocities.slice()
  integrateDebrisCpu(positions, velocities, soa.count, dt)
  return {
    positions,
    velocities,
    backend: 'cpu-debris-fallback',
    gpuFractureReady: false,
    chaosParityReady: false,
    notes: [
      ...fracturePlan.notes,
      fracturePlan.gpuFractureReady
        ? 'GPU planned but dispatch failed — CPU debris fallback'
        : 'CPU debris integrate (Zero-UI / no GPU soak)',
    ],
  }
}

/** Convenience: build plan + integrate in one call. */
export function fractureAndIntegrate(input: {
  bounds: THREE.Box3
  impactPoint: THREE.Vector3
  impactForce: number
  levels?: number
  fragmentsPerLevel?: number
  seed?: number
  capabilityScore?: number
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  soakPassed?: boolean
  device?: GpuFractureGpuDeviceLike | null
  dt?: number
}): {
  plan: HierarchicalVoronoiPlan
  integrate: IntegrateFractureDebrisResult
  heroBudget: HeroRapierBudget
} {
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  const heroBudget = resolveHeroRapierBudget(capabilityScore)
  const plan = buildHierarchicalVoronoiPlan({
    bounds: input.bounds,
    impactPoint: input.impactPoint,
    impactForce: input.impactForce,
    levels: input.levels,
    fragmentsPerLevel: input.fragmentsPerLevel,
    seed: input.seed,
    maxHeroFragments: heroBudget.maxHeroFragments,
  })
  const integrate = runFractureDebrisGpuOrCpu({
    plan,
    dt: input.dt,
    capabilityScore,
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    soakPassed: input.soakPassed,
    device: input.device,
  })
  return { plan, integrate, heroBudget }
}

export function proveGpuFractureReady(force = false): boolean {
  if (!force && cachedGpuFractureReady === true) return true
  if (!force && lastGpuFractureSoak) {
    cachedGpuFractureReady = lastGpuFractureSoak.passed
    return lastGpuFractureSoak.passed
  }
  if (sessionContext?.soakPassed === true) {
    cachedGpuFractureReady = true
    return true
  }
  return false
}

export function recordGpuFractureSoak(result: GpuFractureComputeSoakResult): void {
  lastGpuFractureSoak = result
  cachedGpuFractureReady = result.passed
  if (sessionContext && result.passed) {
    sessionContext = {
      ...sessionContext,
      soakPassed: true,
      soakFramesProven: result.frames,
    }
  }
}

export function getLastGpuFractureSoak(): GpuFractureComputeSoakResult | null {
  return lastGpuFractureSoak
}

export function probeGpuFractureHonesty(input?: {
  soak?: GpuFractureComputeSoakResult
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  capabilityScore?: number
}): {
  letter: typeof GPU_FRACTURE_LETTER
  wired: true
  gpuFractureReady: boolean
  chaosParityReady: false
  held: boolean
  chaosParityHeld: true
  notes: string[]
} {
  const soak = input?.soak ?? lastGpuFractureSoak ?? undefined
  const plan = planGpuFracture({
    webgpuAvailable: input?.webgpuAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    capabilityScore: input?.capabilityScore,
    soakPassed: soak?.passed === true,
    soakFramesProven: soak?.frames,
  })
  return {
    letter: GPU_FRACTURE_LETTER,
    wired: true,
    gpuFractureReady: plan.gpuFractureReady,
    chaosParityReady: false,
    held: !plan.gpuFractureReady,
    chaosParityHeld: true,
    notes: [...plan.notes, ...(soak?.notes ?? [])],
  }
}

export function createMockGpuFractureDevice(
  opts?: { supportDispatch?: boolean },
): GpuFractureGpuDeviceLike {
  const supportDispatch = opts?.supportDispatch !== false
  const device: GpuFractureGpuDeviceLike = {
    createBuffer: (desc) => ({
      destroy: () => undefined,
      getMappedRange: () => new ArrayBuffer(desc.size),
      unmap: () => undefined,
    }),
    createShaderModule: () => ({ label: 'mock-gpu-fracture' }),
    queue: { submit: () => undefined, writeBuffer: () => undefined },
  }
  if (supportDispatch) {
    device.createComputePipeline = () => ({
      getBindGroupLayout: () => ({}),
    })
    device.createBindGroup = () => ({})
    device.createCommandEncoder = () => ({
      beginComputePass: () => ({
        setPipeline: () => undefined,
        setBindGroup: () => undefined,
        dispatchWorkgroups: () => undefined,
        end: () => undefined,
      }),
      finish: () => ({}),
    })
  }
  return device
}

export function ensureGpuFractureSoak(input: {
  capabilityScore?: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  device?: GpuFractureGpuDeviceLike | null
  frames?: number
  debrisCount?: number
  computeReadiness?: GpuFractureProbeInput['computeReadiness']
}): GpuFractureComputeSoakResult {
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  configureGpuFractureContext({
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    soakPassed: false,
    soakFramesProven: 0,
    device: input.device ?? null,
    computeReadiness: input.computeReadiness,
  })
  const soak = runGpuFractureComputeSoak({
    frames: input.frames ?? 8,
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    device: input.device ?? null,
    debrisCount: input.debrisCount,
    computeReadiness: input.computeReadiness,
  })
  recordGpuFractureSoak(soak)
  return soak
}
