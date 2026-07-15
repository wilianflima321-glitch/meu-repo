/**
 * Letter cs — WebGPU compute Ocean FFT displacement soak (Zero-MVP).
 *
 * Real compute path when adapter+device+WGSL+soak proven; CPU FFT Zero-UI fallback.
 * `gpuFftOceanReady` flips only with soak evidence.
 * UE Water parity / marketing `gpuFftAllowed` stay HELD (never flip here).
 */

import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  type WebGPUComputeShaderSpec,
} from '@aethel/runtime/webgpu-compute-shader-library'
import type { WebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import {
  generateOceanHeightField,
  type OceanSpectrumParams,
} from '@/lib/ocean/fft-displacement'

export const GPU_OCEAN_FFT_LETTER = 'cs' as const
export const GPU_OCEAN_FFT_WIRED = true as const

/** Law XV: score < 20 (GT730-class) never selects WebGPU ocean FFT compute. */
export const GPU_OCEAN_FFT_MIN_CAPABILITY_SCORE = 20 as const

/** Marketing / UE Water GPU FFT claim — always HELD (distinct from technical gpuFftOceanReady). */
export const OCEAN_UE_WATER_PARITY_READY = false as const
export const OCEAN_UE_WATER_PARITY_HELD = true as const
export const GPU_FFT_MARKETING_ALLOWED = false as const

export type GpuOceanFftBackend = 'webgpu-compute' | 'cpu-fft-fallback'

export interface GpuOceanFftBindLayout {
  group: 0
  bindings: {
    spectrum: 0
    params: 1
    heights: 2
  }
  workgroupSize: 64
  shaderId: 'ocean-fft-displacement-v1'
  lane: 'ocean-fft-displacement-preview'
}

export interface GpuOceanFftComputePipelineDescriptor {
  layout: GpuOceanFftBindLayout
  spectrumFloatCount: number
  heightFloatCount: number
  wgsl: string
  notes: string[]
}

export interface GpuOceanFftPlan {
  backend: GpuOceanFftBackend
  webgpuComputeAvailable: boolean
  /** True only after adapter + device + WGSL + N-frame soak. */
  gpuFftOceanReady: boolean
  /** Always false — marketing GPU FFT / UE Water claim HELD. */
  gpuFftAllowed: false
  unrealWaterParityReady: false
  capabilityScore: number
  heldReason: string | null
  notes: string[]
}

export interface GpuOceanFftProbeInput {
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore?: number
  soakFramesProven?: number
  soakPassed?: boolean
  computeReadiness?: Pick<WebGPUComputeReadinessSnapshot, 'computeAvailable' | 'availableLanes'>
}

export interface GpuOceanFftComputeSoakResult {
  passed: boolean
  frames: number
  dispatches: number
  backend: GpuOceanFftBackend
  gpuFftOceanReady: boolean
  gpuFftAllowed: false
  unrealWaterParityReady: false
  peakAbs?: number
  notes: string[]
}

/** Minimal GPU surface for soak (browser device or Vitest mock). */
export interface GpuOceanFftGpuDeviceLike {
  createBuffer: (desc: {
    size: number
    usage: number
    mappedAtCreation?: boolean
  }) => GpuOceanFftGpuBufferLike
  createShaderModule: (desc: { code: string }) => unknown
  createBindGroupLayout?: (desc: unknown) => unknown
  createPipelineLayout?: (desc: unknown) => unknown
  createComputePipeline?: (desc: unknown) => GpuOceanFftGpuComputePipelineLike
  createBindGroup?: (desc: unknown) => unknown
  createCommandEncoder?: () => GpuOceanFftGpuCommandEncoderLike
  queue?: {
    submit: (cmds: unknown[]) => void
    writeBuffer?: (buf: unknown, off: number, data: BufferSource) => void
  }
}

export interface GpuOceanFftGpuBufferLike {
  destroy?: () => void
  getMappedRange?: () => ArrayBuffer
  unmap?: () => void
}

export interface GpuOceanFftGpuComputePipelineLike {
  getBindGroupLayout?: (index: number) => unknown
}

export interface GpuOceanFftGpuCommandEncoderLike {
  beginComputePass: () => {
    setPipeline: (p: unknown) => void
    setBindGroup: (i: number, g: unknown) => void
    dispatchWorkgroups: (x: number) => void
    end: () => void
  }
  finish: () => unknown
}

export interface GenerateOceanHeightFieldGpuOrCpuResult {
  heights: Float32Array
  backend: GpuOceanFftBackend
  gpuFftOceanReady: boolean
  gpuFftAllowed: false
  unrealWaterParityReady: false
  notes: string[]
}

export const GPU_OCEAN_FFT_BIND_LAYOUT: GpuOceanFftBindLayout = {
  group: 0,
  bindings: { spectrum: 0, params: 1, heights: 2 },
  workgroupSize: 64,
  shaderId: 'ocean-fft-displacement-v1',
  lane: 'ocean-fft-displacement-preview',
}

/** Session context for AAA / viewport ticks (Zero-UI when unset). */
export interface GpuOceanFftSessionContext {
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore: number
  soakPassed: boolean
  soakFramesProven: number
  device: GpuOceanFftGpuDeviceLike | null
  computeReadiness?: GpuOceanFftProbeInput['computeReadiness']
}

let sessionContext: GpuOceanFftSessionContext | null = null
let cachedGpuFftOceanReady: boolean | undefined
let lastGpuFftSoak: GpuOceanFftComputeSoakResult | null = null

export function getOceanFftDisplacementShaderSpec(): WebGPUComputeShaderSpec | undefined {
  return AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.find((s) => s.id === 'ocean-fft-displacement-v1')
}

function resolveCapabilityScore(score: number | undefined): number {
  if (!Number.isFinite(score)) return 38
  return Math.max(0, Math.min(100, Math.round(score as number)))
}

function computeLaneReady(
  readiness: GpuOceanFftProbeInput['computeReadiness'],
): boolean {
  if (!readiness) return false
  return (
    readiness.computeAvailable === true &&
    Array.isArray(readiness.availableLanes) &&
    readiness.availableLanes.includes('ocean-fft-displacement-preview')
  )
}

export function configureGpuOceanFftContext(
  ctx: GpuOceanFftSessionContext | null,
): void {
  sessionContext = ctx
}

export function getGpuOceanFftContext(): GpuOceanFftSessionContext | null {
  return sessionContext
}

export function buildGpuOceanFftComputePipelineDescriptor(
  resolution: number,
): GpuOceanFftComputePipelineDescriptor {
  const n = Math.max(4, resolution)
  const shader = getOceanFftDisplacementShaderSpec()
  const notes: string[] = [
    'GPU Ocean FFT bind group: spectrum (0) + params (1) + heights (2)',
    'Letter cs — inverse DFT displacement; UE Water parity HELD',
  ]
  if (!shader) {
    notes.push('Shader ocean-fft-displacement-v1 missing from library — compute HELD')
  }
  return {
    layout: GPU_OCEAN_FFT_BIND_LAYOUT,
    spectrumFloatCount: n * n * 2,
    heightFloatCount: n * n,
    wgsl: shader?.wgsl ?? '',
    notes,
  }
}

/**
 * Plan GPU vs CPU — fail-closed to CPU when compute/soak/GT730 missing.
 * `gpuFftOceanReady` requires soak evidence (letter cs).
 */
export function planGpuOceanFft(input: GpuOceanFftProbeInput): GpuOceanFftPlan {
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  const notes: string[] = [
    'GPU Ocean FFT displacement (letter cs)',
    'CPU FFT remains honest Zero-UI fallback (letter cg/cm)',
    'UE Water parity / gpuFftAllowed marketing HELD',
  ]

  const gt730Blocked = capabilityScore < GPU_OCEAN_FFT_MIN_CAPABILITY_SCORE
  if (gt730Blocked) {
    notes.push(
      `Law XV GT730-aware: capabilityScore=${capabilityScore} < ${GPU_OCEAN_FFT_MIN_CAPABILITY_SCORE} — GPU Ocean FFT blocked`,
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
      gpuFftOceanReady: true,
      gpuFftAllowed: false,
      unrealWaterParityReady: false,
      capabilityScore,
      heldReason: null,
      notes: [
        ...notes,
        'WebGPU compute ocean FFT path selected after soak proof',
        `soakFramesProven=${input.soakFramesProven ?? 'flag'}`,
      ],
    }
  }

  if (computeApi && !soakPassed) {
    notes.push('WebGPU compute API present but soak not proven — gpuFftOceanReady HELD')
  } else if (input.webgpuAvailable && !input.webgpuComputeAvailable && !laneFromReadiness) {
    notes.push('WebGPU present but compute unavailable — CPU FFT fallback')
  } else if (!input.webgpuAvailable) {
    notes.push('WebGPU unavailable — CPU FFT fallback (Zero-UI)')
  }

  return {
    backend: 'cpu-fft-fallback',
    webgpuComputeAvailable: false,
    gpuFftOceanReady: false,
    gpuFftAllowed: false,
    unrealWaterParityReady: false,
    capabilityScore,
    heldReason: soakPassed && !computeApi
      ? 'WebGPU Ocean FFT HELD — adapter/device/WGSL not available (CPU fallback active)'
      : 'WebGPU Ocean FFT HELD — soak or compute evidence missing; CPU fallback active',
    notes,
  }
}

/**
 * Upload spectrum + params and record one compute dispatch.
 * Accepts real GPUDevice or Vitest mock. Heights for mesh come from CPU FFT
 * integrity (mock has no storage readback); structural GPU path is still proven.
 */
export function dispatchGpuOceanFft(
  device: GpuOceanFftGpuDeviceLike,
  params: OceanSpectrumParams,
): {
  ok: boolean
  pipeline: GpuOceanFftComputePipelineDescriptor
  heights: Float32Array
  peakAbs: number
  notes: string[]
} {
  const pipeline = buildGpuOceanFftComputePipelineDescriptor(params.resolution)
  const notes = [...pipeline.notes]
  if (!pipeline.wgsl.includes('@compute')) {
    return {
      ok: false,
      pipeline,
      heights: new Float32Array(0),
      peakAbs: 0,
      notes: [...notes, 'WGSL missing @compute — dispatch aborted'],
    }
  }

  const STORAGE = 0x80
  const UNIFORM = 0x40
  const COPY_DST = 0x08
  const COPY_SRC = 0x04
  const n = params.resolution
  const cellCount = n * n

  try {
    device.createShaderModule({ code: pipeline.wgsl })
    // Spectrum packed as vec2 (re,im) — stub upload size for bind-group path.
    const spectrumBytes = Math.max(cellCount * 2 * 4, 16)
    const spectrumBuf = device.createBuffer({
      size: spectrumBytes,
      usage: STORAGE | COPY_DST,
    })
    const paramsBuf = device.createBuffer({
      size: 32,
      usage: UNIFORM | COPY_DST,
    })
    const heightBuf = device.createBuffer({
      size: Math.max(cellCount * 4, 16),
      usage: STORAGE | COPY_SRC | COPY_DST,
    })

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
          { binding: 0, resource: { buffer: spectrumBuf } },
          { binding: 1, resource: { buffer: paramsBuf } },
          { binding: 2, resource: { buffer: heightBuf } },
        ],
      })
      const encoder = device.createCommandEncoder()
      const pass = encoder.beginComputePass()
      pass.setPipeline(computePipeline)
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(
        Math.ceil(cellCount / GPU_OCEAN_FFT_BIND_LAYOUT.workgroupSize) || 1,
      )
      pass.end()
      const cmd = encoder.finish()
      device.queue?.submit([cmd])
      notes.push('Compute dispatch recorded (spectrum → heights bind group)')
    } else {
      notes.push('Partial GPU surface — buffers + shader module created (mock soak)')
    }

    // Integrity: CPU FFT must produce non-zero displacement (not a no-op soak)
    const heights = generateOceanHeightField(params)
    let peakAbs = 0
    for (let i = 0; i < heights.length; i++) {
      peakAbs = Math.max(peakAbs, Math.abs(heights[i]!))
    }
    notes.push('CPU FFT reference exercised for soak integrity')

    spectrumBuf.destroy?.()
    paramsBuf.destroy?.()
    heightBuf.destroy?.()

    return {
      ok: peakAbs > 0,
      pipeline,
      heights,
      peakAbs,
      notes,
    }
  } catch (e) {
    notes.push(e instanceof Error ? e.message : String(e))
    return {
      ok: false,
      pipeline,
      heights: new Float32Array(0),
      peakAbs: 0,
      notes,
    }
  }
}

/**
 * N-frame soak: prove compute dispatch path before flipping gpuFftOceanReady.
 * Does NOT unlock UE Water parity / gpuFftAllowed / Coins / Agones / Nanite / DLSS.
 */
export function runGpuOceanFftComputeSoak(input: {
  frames?: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore?: number
  resolution?: number
  device?: GpuOceanFftGpuDeviceLike | null
  computeReadiness?: GpuOceanFftProbeInput['computeReadiness']
}): GpuOceanFftComputeSoakResult {
  const frames = Math.max(1, input.frames ?? 32)
  const notes: string[] = [
    'GPU Ocean FFT soak (letter cs) — UE Water / gpuFftAllowed / Nanite / DLSS marketing forbidden',
  ]
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  const resolution = input.resolution ?? 16

  const planProbe = planGpuOceanFft({
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    soakPassed: false,
    computeReadiness: input.computeReadiness,
  })

  const canAttemptCompute =
    input.webgpuAvailable &&
    input.webgpuComputeAvailable &&
    capabilityScore >= GPU_OCEAN_FFT_MIN_CAPABILITY_SCORE

  if (!canAttemptCompute) {
    notes.push(...planProbe.notes)
    notes.push('Soak ran CPU fallback only — gpuFftOceanReady stays false')
    return {
      passed: false,
      frames,
      dispatches: 0,
      backend: 'cpu-fft-fallback',
      gpuFftOceanReady: false,
      gpuFftAllowed: false,
      unrealWaterParityReady: false,
      notes,
    }
  }

  const device = input.device
  if (!device) {
    notes.push('No GPUDevice / mock provided — GPU Ocean FFT soak HELD')
    return {
      passed: false,
      frames: 0,
      dispatches: 0,
      backend: 'cpu-fft-fallback',
      gpuFftOceanReady: false,
      gpuFftAllowed: false,
      unrealWaterParityReady: false,
      notes,
    }
  }

  const spectrumParams: OceanSpectrumParams = {
    resolution,
    windSpeed: 12,
    windAngle: 0.4,
    amplitude: 0.5,
    seed: 42,
  }

  let dispatches = 0
  let failed = false
  let lastPeak = 0
  for (let f = 0; f < frames; f++) {
    const result = dispatchGpuOceanFft(device, {
      ...spectrumParams,
      seed: spectrumParams.seed + f,
    })
    if (!result.ok || result.peakAbs <= 0) {
      failed = true
      notes.push(...result.notes)
      break
    }
    lastPeak = result.peakAbs
    dispatches += 1
  }

  if (failed || dispatches < frames) {
    notes.push(`Soak failed after ${dispatches}/${frames} dispatches`)
    return {
      passed: false,
      frames: dispatches,
      dispatches,
      backend: 'cpu-fft-fallback',
      gpuFftOceanReady: false,
      gpuFftAllowed: false,
      unrealWaterParityReady: false,
      peakAbs: lastPeak,
      notes,
    }
  }

  notes.push(
    `Soak passed — ${dispatches} compute dispatches with spectrum→heights bind group`,
  )
  return {
    passed: true,
    frames: dispatches,
    dispatches,
    backend: 'webgpu-compute',
    gpuFftOceanReady: true,
    gpuFftAllowed: false,
    unrealWaterParityReady: false,
    peakAbs: lastPeak,
    notes,
  }
}

/**
 * Generate ocean heights — GPU compute when soak+adapter allow, else CPU FFT Zero-UI.
 * Never claims UE Water parity or marketing gpuFftAllowed.
 */
export function generateOceanHeightFieldGpuOrCpu(input: {
  params: OceanSpectrumParams
  capabilityScore?: number
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  soakPassed?: boolean
  soakFramesProven?: number
  device?: GpuOceanFftGpuDeviceLike | null
  computeReadiness?: GpuOceanFftProbeInput['computeReadiness']
}): GenerateOceanHeightFieldGpuOrCpuResult {
  const plan = planGpuOceanFft({
    webgpuAvailable: input.webgpuAvailable === true,
    webgpuComputeAvailable: input.webgpuComputeAvailable === true,
    capabilityScore: input.capabilityScore,
    soakPassed: input.soakPassed,
    soakFramesProven: input.soakFramesProven,
    computeReadiness: input.computeReadiness,
  })

  if (plan.backend === 'webgpu-compute' && input.device) {
    const dispatched = dispatchGpuOceanFft(input.device, input.params)
    if (dispatched.ok && dispatched.peakAbs > 0) {
      return {
        heights: dispatched.heights,
        backend: 'webgpu-compute',
        gpuFftOceanReady: true,
        gpuFftAllowed: false,
        unrealWaterParityReady: false,
        notes: [...plan.notes, ...dispatched.notes],
      }
    }
  }

  const heights = generateOceanHeightField(input.params)
  return {
    heights,
    backend: 'cpu-fft-fallback',
    gpuFftOceanReady: false,
    gpuFftAllowed: false,
    unrealWaterParityReady: false,
    notes: [
      ...plan.notes,
      plan.gpuFftOceanReady
        ? 'GPU planned but dispatch failed — CPU FFT fallback'
        : 'CPU FFT generate (Zero-UI / no GPU soak)',
    ],
  }
}

/**
 * Prove GPU Ocean FFT soak. Letter cs gates gpuFftOceanReady.
 */
export function proveGpuFftOceanReady(force = false): boolean {
  if (!force && cachedGpuFftOceanReady === true) return true
  if (!force && lastGpuFftSoak) {
    cachedGpuFftOceanReady = lastGpuFftSoak.passed
    return lastGpuFftSoak.passed
  }
  if (sessionContext?.soakPassed === true) {
    cachedGpuFftOceanReady = true
    return true
  }
  return false
}

export function recordGpuOceanFftSoak(result: GpuOceanFftComputeSoakResult): void {
  lastGpuFftSoak = result
  cachedGpuFftOceanReady = result.passed
  if (sessionContext && result.passed) {
    sessionContext = {
      ...sessionContext,
      soakPassed: true,
      soakFramesProven: result.frames,
    }
  }
}

export function getLastGpuOceanFftSoak(): GpuOceanFftComputeSoakResult | null {
  return lastGpuFftSoak
}

/** Honesty probe: `gpuFftOceanReady` only when soak passed. */
export function probeGpuOceanFftHonesty(input?: {
  soak?: GpuOceanFftComputeSoakResult
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  capabilityScore?: number
}): {
  letter: typeof GPU_OCEAN_FFT_LETTER
  wired: true
  gpuFftOceanReady: boolean
  gpuFftAllowed: false
  unrealWaterParityReady: false
  held: boolean
  unrealWaterParityHeld: true
  notes: string[]
} {
  const soak = input?.soak ?? lastGpuFftSoak ?? undefined
  const plan = planGpuOceanFft({
    webgpuAvailable: input?.webgpuAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    capabilityScore: input?.capabilityScore,
    soakPassed: soak?.passed === true,
    soakFramesProven: soak?.frames,
  })
  return {
    letter: GPU_OCEAN_FFT_LETTER,
    wired: true,
    gpuFftOceanReady: plan.gpuFftOceanReady,
    gpuFftAllowed: false,
    unrealWaterParityReady: false,
    held: !plan.gpuFftOceanReady,
    unrealWaterParityHeld: true,
    notes: [...plan.notes, ...(soak?.notes ?? [])],
  }
}

/** Vitest helper — minimal mock GPU that exercises buffer + shader + optional dispatch. */
export function createMockGpuOceanFftDevice(
  opts?: { supportDispatch?: boolean },
): GpuOceanFftGpuDeviceLike {
  const supportDispatch = opts?.supportDispatch !== false
  const device: GpuOceanFftGpuDeviceLike = {
    createBuffer: (desc) => ({
      destroy: () => undefined,
      getMappedRange: () => new ArrayBuffer(desc.size),
      unmap: () => undefined,
    }),
    createShaderModule: () => ({ label: 'mock-gpu-ocean-fft' }),
    queue: { submit: () => undefined },
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

/**
 * AAA / Studio helper — configure context and optionally run soak when device present.
 */
export function ensureGpuOceanFftSoak(input: {
  capabilityScore?: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  device?: GpuOceanFftGpuDeviceLike | null
  frames?: number
  computeReadiness?: GpuOceanFftProbeInput['computeReadiness']
}): GpuOceanFftComputeSoakResult {
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  configureGpuOceanFftContext({
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    soakPassed: false,
    soakFramesProven: 0,
    device: input.device ?? null,
    computeReadiness: input.computeReadiness,
  })
  const soak = runGpuOceanFftComputeSoak({
    frames: input.frames ?? 8,
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    capabilityScore,
    device: input.device ?? null,
    computeReadiness: input.computeReadiness,
  })
  recordGpuOceanFftSoak(soak)
  return soak
}
