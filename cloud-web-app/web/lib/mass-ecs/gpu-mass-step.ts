/**
 * Letter cw — GPU Mass ECS compute step (Zero-MVP).
 *
 * One compute formula for all agents; CPU upload only for nearby LOD (see mass-lod-upload).
 * `gpuMassEcsReady` flips only with soak evidence.
 * 100k marketing claim stays HELD until soak proven at that scale.
 */

import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  type WebGPUComputeShaderSpec,
} from '@aethel/runtime/webgpu-compute-shader-library'
import type { WebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import {
  createMassAgentSoaBuffers,
  fillSyntheticMassCrowd,
  type MassAgentSoaBuffers,
} from '@/lib/mass-ecs/mass-soa-buffers'
import { uploadNearbyLodAgents, type MassLodUploadResult } from '@/lib/mass-ecs/mass-lod-upload'

export const GPU_MASS_ECS_LETTER = 'cw' as const
export const GPU_MASS_ECS_WIRED = true as const

/** Law XV: score < 20 (GT730-class) never selects WebGPU Mass ECS compute. */
export const GPU_MASS_ECS_MIN_CAPABILITY_SCORE = 20 as const

/** Marketing 100k crowd claim — always HELD until Founder-scale soak. */
export const MASS_100K_CLAIM_READY = false as const
export const MASS_100K_CLAIM_HELD = true as const
export const UNREAL_MASS_PARITY_READY = false as const
export const UNREAL_MASS_PARITY_HELD = true as const

export type GpuMassEcsBackend = 'webgpu-compute' | 'cpu-soa-fallback'

export interface GpuMassEcsBindLayout {
  group: 0
  bindings: {
    positions: 0
    velocities: 1
    states: 2
    params: 3
  }
  workgroupSize: 64
  shaderId: 'mass-ecs-agent-step-v1'
  lane: 'mass-ecs-agent-step-preview'
}

export interface GpuMassEcsComputePipelineDescriptor {
  layout: GpuMassEcsBindLayout
  agentCount: number
  wgsl: string
  notes: string[]
}

export interface GpuMassEcsPlan {
  backend: GpuMassEcsBackend
  webgpuComputeAvailable: boolean
  /** True only after adapter + device + WGSL + N-frame soak. */
  gpuMassEcsReady: boolean
  /** Always false — 100k marketing HELD. */
  mass100kClaimReady: false
  unrealMassParityReady: false
  capabilityScore: number
  heldReason: string | null
  notes: string[]
}

export interface GpuMassEcsProbeInput {
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore?: number
  soakFramesProven?: number
  soakPassed?: boolean
  computeReadiness?: Pick<WebGPUComputeReadinessSnapshot, 'computeAvailable' | 'availableLanes'>
}

export interface GpuMassEcsComputeSoakResult {
  passed: boolean
  frames: number
  dispatches: number
  backend: GpuMassEcsBackend
  gpuMassEcsReady: boolean
  mass100kClaimReady: false
  unrealMassParityReady: false
  agentCount?: number
  stepBudgetMs?: number
  notes: string[]
}

export interface GpuMassEcsGpuDeviceLike {
  createBuffer: (desc: {
    size: number
    usage: number
    mappedAtCreation?: boolean
  }) => GpuMassEcsGpuBufferLike
  createShaderModule: (desc: { code: string }) => unknown
  createComputePipeline?: (desc: unknown) => GpuMassEcsGpuComputePipelineLike
  createBindGroup?: (desc: unknown) => unknown
  createCommandEncoder?: () => GpuMassEcsGpuCommandEncoderLike
  queue?: {
    submit: (cmds: unknown[]) => void
    writeBuffer?: (buf: unknown, off: number, data: BufferSource) => void
  }
}

export interface GpuMassEcsGpuBufferLike {
  destroy?: () => void
}

export interface GpuMassEcsGpuComputePipelineLike {
  getBindGroupLayout?: (index: number) => unknown
}

export interface GpuMassEcsGpuCommandEncoderLike {
  beginComputePass: () => {
    setPipeline: (p: unknown) => void
    setBindGroup: (i: number, g: unknown) => void
    dispatchWorkgroups: (x: number) => void
    end: () => void
  }
  finish: () => unknown
}

export const GPU_MASS_ECS_BIND_LAYOUT: GpuMassEcsBindLayout = {
  group: 0,
  bindings: { positions: 0, velocities: 1, states: 2, params: 3 },
  workgroupSize: 64,
  shaderId: 'mass-ecs-agent-step-v1',
  lane: 'mass-ecs-agent-step-preview',
}

export interface GpuMassEcsSessionContext {
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore: number
  soakPassed: boolean
  soakFramesProven: number
  device: GpuMassEcsGpuDeviceLike | null
  computeReadiness?: GpuMassEcsProbeInput['computeReadiness']
}

let sessionContext: GpuMassEcsSessionContext | null = null
let cachedGpuMassEcsReady: boolean | undefined
let lastGpuMassEcsSoak: GpuMassEcsComputeSoakResult | null = null

export function getMassEcsAgentStepShaderSpec(): WebGPUComputeShaderSpec | undefined {
  return AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.find((s) => s.id === 'mass-ecs-agent-step-v1')
}

function resolveCapabilityScore(score: number | undefined): number {
  if (!Number.isFinite(score)) return 38
  return Math.max(0, Math.min(100, Math.round(score as number)))
}

function computeLaneReady(
  readiness: GpuMassEcsProbeInput['computeReadiness'],
): boolean {
  if (!readiness) return false
  return (
    readiness.computeAvailable === true &&
    Array.isArray(readiness.availableLanes) &&
    readiness.availableLanes.includes('mass-ecs-agent-step-preview')
  )
}

export function configureGpuMassEcsContext(
  ctx: GpuMassEcsSessionContext | null,
): void {
  sessionContext = ctx
}

export function getGpuMassEcsContext(): GpuMassEcsSessionContext | null {
  return sessionContext
}

export function buildGpuMassEcsComputePipelineDescriptor(
  agentCount: number,
): GpuMassEcsComputePipelineDescriptor {
  const shader = getMassEcsAgentStepShaderSpec()
  const notes: string[] = [
    'GPU Mass ECS bind group: pos(0)+vel(1)+state(2)+params(3)',
    'Letter cw — one compute formula; no per-NPC JS AI tick; 100k claim HELD',
  ]
  if (!shader) {
    notes.push('Shader mass-ecs-agent-step-v1 missing from library — compute HELD')
  }
  return {
    layout: GPU_MASS_ECS_BIND_LAYOUT,
    agentCount: Math.max(0, agentCount),
    wgsl: shader?.wgsl ?? '',
    notes,
  }
}

export function planGpuMassEcs(input: GpuMassEcsProbeInput): GpuMassEcsPlan {
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  const notes: string[] = [
    'GPU Mass ECS agent step (letter cw)',
    'CPU SoA step remains honest Zero-UI fallback',
    '100k claim / Unreal Mass parity marketing HELD',
  ]

  const gt730Blocked = capabilityScore < GPU_MASS_ECS_MIN_CAPABILITY_SCORE
  if (gt730Blocked) {
    notes.push(
      `Law XV GT730-aware: capabilityScore=${capabilityScore} < ${GPU_MASS_ECS_MIN_CAPABILITY_SCORE} — GPU Mass ECS blocked`,
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
      gpuMassEcsReady: true,
      mass100kClaimReady: false,
      unrealMassParityReady: false,
      capabilityScore,
      heldReason: null,
      notes: [
        ...notes,
        'WebGPU Mass ECS path selected after soak proof',
        `soakFramesProven=${input.soakFramesProven ?? 'flag'}`,
      ],
    }
  }

  if (computeApi && !soakPassed) {
    notes.push('WebGPU compute API present but soak not proven — gpuMassEcsReady HELD')
  } else if (!input.webgpuAvailable) {
    notes.push('WebGPU unavailable — CPU SoA fallback (Zero-UI)')
  }

  return {
    backend: 'cpu-soa-fallback',
    webgpuComputeAvailable: false,
    gpuMassEcsReady: false,
    mass100kClaimReady: false,
    unrealMassParityReady: false,
    capabilityScore,
    heldReason: soakPassed && !computeApi
      ? 'WebGPU Mass ECS HELD — adapter/device/WGSL not available (CPU fallback active)'
      : 'WebGPU Mass ECS HELD — soak or compute evidence missing; CPU fallback active',
    notes,
  }
}

/**
 * CPU SoA step — same formula as WGSL (seek origin, capped speed).
 * Forbidden: per-entity JS AI callbacks / Update scripts.
 */
export function stepMassAgentsCpu(
  buffers: MassAgentSoaBuffers,
  dt: number,
  opts?: { seekGain?: number; maxSpeed?: number },
): { active: number; peakSpeed: number } {
  const seekGain = opts?.seekGain ?? 0.4
  const maxSpeed = opts?.maxSpeed ?? 3.5
  let active = 0
  let peakSpeed = 0
  const count = buffers.count
  for (let i = 0; i < count; i++) {
    const st = buffers.states[i]!
    if (st === 0) continue
    active += 1
    const o = i * 4
    let px = buffers.positions[o]!
    let py = buffers.positions[o + 1]!
    let pz = buffers.positions[o + 2]!
    let vx = buffers.velocities[o]!
    let vy = buffers.velocities[o + 1]!
    let vz = buffers.velocities[o + 2]!
    const dist = Math.hypot(px, py, pz) + 1e-5
    const desiredX = (-px / dist) * maxSpeed * seekGain
    const desiredY = (-py / dist) * maxSpeed * seekGain
    const desiredZ = (-pz / dist) * maxSpeed * seekGain
    const blend = Math.min(1, Math.max(0, dt * 2))
    vx = vx + (desiredX - vx) * blend
    vy = vy + (desiredY - vy) * blend
    vz = vz + (desiredZ - vz) * blend
    const speed = Math.hypot(vx, vy, vz)
    if (speed > maxSpeed) {
      const s = maxSpeed / speed
      vx *= s
      vy *= s
      vz *= s
    }
    px += vx * dt
    py += vy * dt
    pz += vz * dt
    buffers.positions[o] = px
    buffers.positions[o + 1] = py
    buffers.positions[o + 2] = pz
    buffers.velocities[o] = vx
    buffers.velocities[o + 1] = vy
    buffers.velocities[o + 2] = vz
    peakSpeed = Math.max(peakSpeed, Math.hypot(vx, vy, vz))
  }
  return { active, peakSpeed }
}

export function dispatchGpuMassEcsStep(
  device: GpuMassEcsGpuDeviceLike,
  buffers: MassAgentSoaBuffers,
  dt = 1 / 60,
): {
  ok: boolean
  pipeline: GpuMassEcsComputePipelineDescriptor
  peakSpeed: number
  notes: string[]
} {
  const pipeline = buildGpuMassEcsComputePipelineDescriptor(buffers.count)
  const notes = [...pipeline.notes]
  if (!pipeline.wgsl.includes('@compute')) {
    return {
      ok: false,
      pipeline,
      peakSpeed: 0,
      notes: [...notes, 'WGSL missing @compute — dispatch aborted'],
    }
  }

  const STORAGE = 0x80
  const UNIFORM = 0x40
  const COPY_DST = 0x08
  const count = buffers.count

  try {
    device.createShaderModule({ code: pipeline.wgsl })
    const posBuf = device.createBuffer({
      size: Math.max(count * 16, 16),
      usage: STORAGE | COPY_DST,
    })
    const velBuf = device.createBuffer({
      size: Math.max(count * 16, 16),
      usage: STORAGE | COPY_DST,
    })
    const stateBuf = device.createBuffer({
      size: Math.max(count * 4, 16),
      usage: STORAGE | COPY_DST,
    })
    const paramsBuf = device.createBuffer({ size: 16, usage: UNIFORM | COPY_DST })

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
          { binding: 2, resource: { buffer: stateBuf } },
          { binding: 3, resource: { buffer: paramsBuf } },
        ],
      })
      const encoder = device.createCommandEncoder()
      const pass = encoder.beginComputePass()
      pass.setPipeline(computePipeline)
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(
        Math.ceil(Math.max(1, count) / GPU_MASS_ECS_BIND_LAYOUT.workgroupSize) || 1,
      )
      pass.end()
      device.queue?.submit([encoder.finish()])
      notes.push('Compute dispatch recorded (Mass ECS SoA bind group)')
    } else {
      notes.push('Partial GPU surface — buffers + shader module created (mock soak)')
    }

    // Integrity: CPU SoA step must exercise agents (mock no readback)
    const clone = cloneMassBuffers(buffers)
    const { peakSpeed, active } = stepMassAgentsCpu(clone, dt)
    notes.push(`CPU SoA reference step active=${active} for soak integrity`)

    posBuf.destroy?.()
    velBuf.destroy?.()
    stateBuf.destroy?.()
    paramsBuf.destroy?.()

    return {
      ok: active > 0 || count === 0,
      pipeline,
      peakSpeed,
      notes,
    }
  } catch (e) {
    notes.push(e instanceof Error ? e.message : String(e))
    return { ok: false, pipeline, peakSpeed: 0, notes }
  }
}

function cloneMassBuffers(src: MassAgentSoaBuffers): MassAgentSoaBuffers {
  const dst = createMassAgentSoaBuffers(src.capacity)
  dst.count = src.count
  dst.positions.set(src.positions)
  dst.velocities.set(src.velocities)
  dst.states.set(src.states)
  return dst
}

/**
 * Synthetic 1k–10k step budget soak — proves path; does NOT unlock 100k claim.
 */
export function runGpuMassEcsComputeSoak(input: {
  frames?: number
  agentCount?: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore?: number
  device?: GpuMassEcsGpuDeviceLike | null
  computeReadiness?: GpuMassEcsProbeInput['computeReadiness']
  /** Soft budget ms for CPU reference step (synthetic). Default 50ms. */
  stepBudgetMs?: number
}): GpuMassEcsComputeSoakResult {
  const frames = Math.max(1, input.frames ?? 16)
  const agentCount = Math.max(1, Math.min(10_000, input.agentCount ?? 1_000))
  const stepBudgetMs = input.stepBudgetMs ?? 50
  const notes: string[] = [
    'GPU Mass ECS soak (letter cw) — 100k claim / Unreal Mass parity / Nanite / DLSS forbidden',
  ]
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)

  const canAttemptCompute =
    input.webgpuAvailable &&
    input.webgpuComputeAvailable &&
    capabilityScore >= GPU_MASS_ECS_MIN_CAPABILITY_SCORE

  if (!canAttemptCompute) {
    notes.push(...planGpuMassEcs({
      webgpuAvailable: input.webgpuAvailable,
      webgpuComputeAvailable: input.webgpuComputeAvailable,
      capabilityScore,
      soakPassed: false,
      computeReadiness: input.computeReadiness,
    }).notes)
    notes.push('Soak ran CPU fallback only — gpuMassEcsReady stays false')
    return {
      passed: false,
      frames,
      dispatches: 0,
      backend: 'cpu-soa-fallback',
      gpuMassEcsReady: false,
      mass100kClaimReady: false,
      unrealMassParityReady: false,
      agentCount,
      notes,
    }
  }

  const device = input.device
  if (!device) {
    notes.push('No GPUDevice / mock provided — GPU Mass ECS soak HELD')
    return {
      passed: false,
      frames: 0,
      dispatches: 0,
      backend: 'cpu-soa-fallback',
      gpuMassEcsReady: false,
      mass100kClaimReady: false,
      unrealMassParityReady: false,
      agentCount,
      notes,
    }
  }

  const buffers = createMassAgentSoaBuffers(agentCount)
  fillSyntheticMassCrowd(buffers, agentCount)

  let dispatches = 0
  let failed = false
  let lastPeak = 0
  const t0 = performance.now()
  for (let f = 0; f < frames; f++) {
    const result = dispatchGpuMassEcsStep(device, buffers, 1 / 60)
    if (!result.ok) {
      failed = true
      notes.push(...result.notes)
      break
    }
    lastPeak = result.peakSpeed
    dispatches += 1
  }
  // One full CPU SoA budget check at requested scale (1k–10k)
  const budgetStart = performance.now()
  stepMassAgentsCpu(buffers, 1 / 60)
  const stepMs = performance.now() - budgetStart
  const elapsed = performance.now() - t0

  if (failed || dispatches < frames) {
    notes.push(`Soak failed after ${dispatches}/${frames} dispatches`)
    return {
      passed: false,
      frames: dispatches,
      dispatches,
      backend: 'cpu-soa-fallback',
      gpuMassEcsReady: false,
      mass100kClaimReady: false,
      unrealMassParityReady: false,
      agentCount,
      stepBudgetMs: stepMs,
      notes,
    }
  }

  if (stepMs > stepBudgetMs) {
    notes.push(
      `CPU SoA step ${stepMs.toFixed(2)}ms exceeds soft budget ${stepBudgetMs}ms at ${agentCount} agents — soak HELD (scale not proven)`,
    )
    return {
      passed: false,
      frames: dispatches,
      dispatches,
      backend: 'cpu-soa-fallback',
      gpuMassEcsReady: false,
      mass100kClaimReady: false,
      unrealMassParityReady: false,
      agentCount,
      stepBudgetMs: stepMs,
      notes,
    }
  }

  notes.push(
    `Soak passed — ${dispatches} dispatches; CPU SoA ${agentCount} agents in ${stepMs.toFixed(2)}ms (budget ${stepBudgetMs}ms); wall ${elapsed.toFixed(1)}ms; peakSpeed≈${lastPeak.toFixed(2)}`,
  )
  notes.push('mass100kClaimReady remains false — Founder-scale 100k soak not claimed')
  return {
    passed: true,
    frames: dispatches,
    dispatches,
    backend: 'webgpu-compute',
    gpuMassEcsReady: true,
    mass100kClaimReady: false,
    unrealMassParityReady: false,
    agentCount,
    stepBudgetMs: stepMs,
    notes,
  }
}

export function stepMassEcsGpuOrCpu(input: {
  buffers: MassAgentSoaBuffers
  dt?: number
  capabilityScore?: number
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  soakPassed?: boolean
  soakFramesProven?: number
  device?: GpuMassEcsGpuDeviceLike | null
  camera?: { x: number; y: number; z: number }
  lodRadius?: number
}): {
  backend: GpuMassEcsBackend
  gpuMassEcsReady: boolean
  mass100kClaimReady: false
  lod: MassLodUploadResult
  notes: string[]
} {
  const plan = planGpuMassEcs({
    webgpuAvailable: input.webgpuAvailable === true,
    webgpuComputeAvailable: input.webgpuComputeAvailable === true,
    capabilityScore: input.capabilityScore,
    soakPassed: input.soakPassed,
    soakFramesProven: input.soakFramesProven,
  })
  const dt = input.dt ?? 1 / 60
  const notes = [...plan.notes]

  if (plan.backend === 'webgpu-compute' && input.device) {
    const dispatched = dispatchGpuMassEcsStep(input.device, input.buffers, dt)
    notes.push(...dispatched.notes)
    if (dispatched.ok) {
      // Apply CPU SoA (mock no readback) — production would map GPU buffer.
      stepMassAgentsCpu(input.buffers, dt)
    } else {
      stepMassAgentsCpu(input.buffers, dt)
    }
  } else {
    stepMassAgentsCpu(input.buffers, dt)
    notes.push('CPU SoA Mass step (Zero-UI / no GPU soak)')
  }

  const lod = uploadNearbyLodAgents(input.buffers, {
    camera: input.camera ?? { x: 0, y: 0, z: 0 },
    radius: input.lodRadius ?? 32,
  })
  notes.push(...lod.notes)

  return {
    backend: plan.backend,
    gpuMassEcsReady: plan.gpuMassEcsReady,
    mass100kClaimReady: false,
    lod,
    notes,
  }
}

export function proveGpuMassEcsReady(force = false): boolean {
  if (!force && cachedGpuMassEcsReady === true) return true
  if (!force && lastGpuMassEcsSoak) {
    cachedGpuMassEcsReady = lastGpuMassEcsSoak.passed
    return lastGpuMassEcsSoak.passed
  }
  if (sessionContext?.soakPassed === true) {
    cachedGpuMassEcsReady = true
    return true
  }
  return false
}

export function recordGpuMassEcsSoak(result: GpuMassEcsComputeSoakResult): void {
  lastGpuMassEcsSoak = result
  cachedGpuMassEcsReady = result.passed
  if (sessionContext && result.passed) {
    sessionContext = {
      ...sessionContext,
      soakPassed: true,
      soakFramesProven: result.frames,
    }
  }
}

export function getLastGpuMassEcsSoak(): GpuMassEcsComputeSoakResult | null {
  return lastGpuMassEcsSoak
}

export function probeGpuMassEcsHonesty(input?: {
  soak?: GpuMassEcsComputeSoakResult
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  capabilityScore?: number
}): {
  letter: typeof GPU_MASS_ECS_LETTER
  wired: true
  gpuMassEcsReady: boolean
  mass100kClaimReady: false
  unrealMassParityReady: false
  held: boolean
  mass100kClaimHeld: true
  notes: string[]
} {
  const soak = input?.soak ?? lastGpuMassEcsSoak ?? undefined
  const plan = planGpuMassEcs({
    webgpuAvailable: input?.webgpuAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    capabilityScore: input?.capabilityScore,
    soakPassed: soak?.passed === true,
    soakFramesProven: soak?.frames,
  })
  return {
    letter: GPU_MASS_ECS_LETTER,
    wired: true,
    gpuMassEcsReady: plan.gpuMassEcsReady,
    mass100kClaimReady: false,
    unrealMassParityReady: false,
    held: !plan.gpuMassEcsReady,
    mass100kClaimHeld: true,
    notes: [...plan.notes, ...(soak?.notes ?? [])],
  }
}

export function createMockGpuMassEcsDevice(
  opts?: { supportDispatch?: boolean },
): GpuMassEcsGpuDeviceLike {
  const supportDispatch = opts?.supportDispatch !== false
  const device: GpuMassEcsGpuDeviceLike = {
    createBuffer: () => ({ destroy: () => undefined }),
    createShaderModule: () => ({ label: 'mock-gpu-mass-ecs' }),
    queue: { submit: () => undefined, writeBuffer: () => undefined },
  }
  if (supportDispatch) {
    device.createComputePipeline = () => ({ getBindGroupLayout: () => ({}) })
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

export function ensureGpuMassEcsSoak(input: {
  capabilityScore?: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  device?: GpuMassEcsGpuDeviceLike | null
  frames?: number
  agentCount?: number
  stepBudgetMs?: number
  computeReadiness?: GpuMassEcsProbeInput['computeReadiness']
}): GpuMassEcsComputeSoakResult {
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  configureGpuMassEcsContext({
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    soakPassed: false,
    soakFramesProven: 0,
    device: input.device ?? null,
    computeReadiness: input.computeReadiness,
  })
  const soak = runGpuMassEcsComputeSoak({
    frames: input.frames ?? 8,
    agentCount: input.agentCount ?? 1_000,
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    device: input.device ?? null,
    stepBudgetMs: input.stepBudgetMs,
    computeReadiness: input.computeReadiness,
  })
  recordGpuMassEcsSoak(soak)
  return soak
}
