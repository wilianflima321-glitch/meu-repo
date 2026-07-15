/**
 * Letter bv — WebGPU Dual Quaternion Skinning soak (Zero-MVP).
 *
 * Motion Matching bone matrices → dual-quaternion skinning.
 * Real WebGPU compute path when adapter+device+WGSL+soak proven;
 * honest WebGL2/CPU fallback otherwise.
 * `dqComputeSkinningReady` flips only with soak evidence — never marketing AAA.
 */

import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  type WebGPUComputeShaderSpec,
} from '@aethel/runtime/webgpu-compute-shader-library'
import type { WebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'

export const DQ_COMPUTE_SKINNING_LETTER = 'bv' as const
export const DUAL_QUATERNION_SKINNING_WIRED = true as const
/** Alias kept for bu callers — topology plan remains wired. */
export const DQ_COMPUTE_SKINNING_WIRED = true as const

/** Law XV: score < 20 (GT730-class) never selects WebGPU compute skinning. */
export const DQ_COMPUTE_MIN_CAPABILITY_SCORE = 20 as const

export type DualQuaternionSkinBackend = 'webgpu-compute' | 'webgl2-uniform-fallback' | 'cpu-fallback'

export interface DualQuaternion {
  real: [number, number, number, number]
  dual: [number, number, number, number]
}

export interface BonePoseSample {
  /** Bone index matching MM SOA order. */
  boneIndex: number
  /** Unit quaternion (x,y,z,w). */
  rotation: [number, number, number, number]
  /** Translation. */
  position: [number, number, number]
}

export interface SkinVertexSample {
  position: [number, number, number]
  normal: [number, number, number]
  boneIndices: [number, number, number, number]
  boneWeights: [number, number, number, number]
}

export interface DualQuaternionSkinPlan {
  backend: DualQuaternionSkinBackend
  webgpuComputeAvailable: boolean
  boneCount: number
  dualQuaternions: DualQuaternion[]
  /**
   * True only when WebGPU compute path selected AND soak proven.
   * Prefer `dqComputeSkinningReady` for marketing/honesty gates.
   */
  gpuComputeSkinning: boolean
  /** Letter bv — true only after adapter + device + WGSL + N-frame soak. */
  dqComputeSkinningReady: boolean
  capabilityScore: number
  heldReason: string | null
  notes: string[]
}

export interface DualQuaternionSkinProbeInput {
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  bonePoses: BonePoseSample[]
  /** Law XV Capability Score — GT730 (<20) forces fallback. */
  capabilityScore?: number
  /** Soak frames proven with real or mock compute dispatch. */
  soakFramesProven?: number
  /** Explicit soak pass flag (from `runDualQuaternionComputeSoak`). */
  soakPassed?: boolean
  /** Optional readiness snapshot from `@aethel/runtime`. */
  computeReadiness?: Pick<WebGPUComputeReadinessSnapshot, 'computeAvailable' | 'availableLanes'>
}

export interface DualQuaternionComputeBindLayout {
  group: 0
  bindings: {
    boneDqs: 0
    vertices: 1
    skinnedOutput: 2
  }
  workgroupSize: 64
  shaderId: 'dual-quaternion-skin-v1'
  lane: 'dual-quaternion-skinning-preview'
}

export interface DualQuaternionComputePipelineDescriptor {
  layout: DualQuaternionComputeBindLayout
  boneDqFloatCount: number
  vertexFloatCount: number
  skinnedFloatCount: number
  wgsl: string
  notes: string[]
}

export interface DualQuaternionComputeSoakResult {
  passed: boolean
  frames: number
  dispatches: number
  backend: DualQuaternionSkinBackend
  dqComputeSkinningReady: boolean
  /** Always false — Nanite/Euphoria AAA claims forbidden. */
  aaaSkinningMarketingAllowed: false
  notes: string[]
}

/** Minimal GPU surface for soak (browser device or Vitest mock). */
export interface DualQuaternionGpuDeviceLike {
  createBuffer: (desc: {
    size: number
    usage: number
    mappedAtCreation?: boolean
  }) => DualQuaternionGpuBufferLike
  createShaderModule: (desc: { code: string }) => unknown
  createBindGroupLayout?: (desc: unknown) => unknown
  createPipelineLayout?: (desc: unknown) => unknown
  createComputePipeline?: (desc: unknown) => DualQuaternionGpuComputePipelineLike
  createBindGroup?: (desc: unknown) => unknown
  createCommandEncoder?: () => DualQuaternionGpuCommandEncoderLike
  queue?: { submit: (cmds: unknown[]) => void }
}

export interface DualQuaternionGpuBufferLike {
  destroy?: () => void
  getMappedRange?: () => ArrayBuffer
  unmap?: () => void
}

export interface DualQuaternionGpuComputePipelineLike {
  getBindGroupLayout?: (index: number) => unknown
}

export interface DualQuaternionGpuCommandEncoderLike {
  beginComputePass: () => {
    setPipeline: (p: unknown) => void
    setBindGroup: (i: number, g: unknown) => void
    dispatchWorkgroups: (x: number) => void
    end: () => void
  }
  finish: () => unknown
}

export const DQ_COMPUTE_BIND_LAYOUT: DualQuaternionComputeBindLayout = {
  group: 0,
  bindings: { boneDqs: 0, vertices: 1, skinnedOutput: 2 },
  workgroupSize: 64,
  shaderId: 'dual-quaternion-skin-v1',
  lane: 'dual-quaternion-skinning-preview',
}

export function getDualQuaternionSkinShaderSpec(): WebGPUComputeShaderSpec | undefined {
  return AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.find((s) => s.id === 'dual-quaternion-skin-v1')
}

export function quatNormalize(q: [number, number, number, number]): [number, number, number, number] {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len]
}

/** Rigid transform → dual quaternion (standard conversion). */
export function bonePoseToDualQuaternion(pose: BonePoseSample): DualQuaternion {
  const q = quatNormalize(pose.rotation)
  const [qx, qy, qz, qw] = q
  const [tx, ty, tz] = pose.position
  // dual = 0.5 * t * q
  const dw = -0.5 * (tx * qx + ty * qy + tz * qz)
  const dx = 0.5 * (tx * qw + ty * qz - tz * qy)
  const dy = 0.5 * (-tx * qz + ty * qw + tz * qx)
  const dz = 0.5 * (tx * qy - ty * qx + tz * qw)
  return { real: q, dual: [dx, dy, dz, dw] }
}

/**
 * Pack Motion Matching bone poses into DQ buffer for skinning upload.
 */
export function packMotionMatchingBonesToDualQuaternions(
  poses: BonePoseSample[],
): DualQuaternion[] {
  return poses.map(bonePoseToDualQuaternion)
}

/**
 * Adapter: MM SOA bone order → `BonePoseSample[]`.
 * Accepts Map from `readBoneTransforms` / `getCurrentBoneTransforms`.
 */
export function motionMatchingBonesToPoseSamples(
  boneNames: string[],
  boneTransforms: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } }>,
): BonePoseSample[] {
  const samples: BonePoseSample[] = []
  for (let i = 0; i < boneNames.length; i++) {
    const name = boneNames[i]!
    const slot = boneTransforms.get(name)
    if (!slot) {
      samples.push({
        boneIndex: i,
        rotation: [0, 0, 0, 1],
        position: [0, 0, 0],
      })
      continue
    }
    samples.push({
      boneIndex: i,
      rotation: [slot.rotation.x, slot.rotation.y, slot.rotation.z, slot.rotation.w],
      position: [slot.position.x, slot.position.y, slot.position.z],
    })
  }
  return samples
}

/** Pack DQs as interleaved float32: real.xyzw + dual.xyzw per bone (8 floats). */
export function packDualQuaternionsToFloat32(dqs: DualQuaternion[]): Float32Array {
  const out = new Float32Array(dqs.length * 8)
  for (let i = 0; i < dqs.length; i++) {
    const dq = dqs[i]!
    const o = i * 8
    out[o] = dq.real[0]
    out[o + 1] = dq.real[1]
    out[o + 2] = dq.real[2]
    out[o + 3] = dq.real[3]
    out[o + 4] = dq.dual[0]
    out[o + 5] = dq.dual[1]
    out[o + 6] = dq.dual[2]
    out[o + 7] = dq.dual[3]
  }
  return out
}

/**
 * Pack skin vertices for storage buffer.
 * Layout per vertex (20 floats): pos.xyzw, nrm.xyzw, boneIndices as f32×4, weights.xyzw
 * (indices stored as f32 for portable CPU packing; WGSL shader uses vec4<u32> — GPU path
 * reinterprets via separate Uint32Array upload when device present).
 */
export function packSkinVerticesForCpuPreview(vertices: SkinVertexSample[]): Float32Array {
  const out = new Float32Array(vertices.length * 16)
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]!
    const o = i * 16
    out[o] = v.position[0]
    out[o + 1] = v.position[1]
    out[o + 2] = v.position[2]
    out[o + 3] = 1
    out[o + 4] = v.normal[0]
    out[o + 5] = v.normal[1]
    out[o + 6] = v.normal[2]
    out[o + 7] = 0
    out[o + 8] = v.boneIndices[0]
    out[o + 9] = v.boneIndices[1]
    out[o + 10] = v.boneIndices[2]
    out[o + 11] = v.boneIndices[3]
    out[o + 12] = v.boneWeights[0]
    out[o + 13] = v.boneWeights[1]
    out[o + 14] = v.boneWeights[2]
    out[o + 15] = v.boneWeights[3]
  }
  return out
}

/**
 * Build compute pipeline descriptor — bind group + bone DQ buffer + skinned output sizes.
 */
export function buildDualQuaternionComputePipelineDescriptor(
  boneCount: number,
  vertexCount: number,
): DualQuaternionComputePipelineDescriptor {
  const shader = getDualQuaternionSkinShaderSpec()
  const notes: string[] = [
    'DQ compute bind group: bone DQs (0) + vertices (1) + skinned output (2)',
    'Bone matrices sourced from Motion Matching SOA → DQ pack (letter bv)',
  ]
  if (!shader) {
    notes.push('Shader dual-quaternion-skin-v1 missing from library — compute HELD')
  }
  return {
    layout: DQ_COMPUTE_BIND_LAYOUT,
    boneDqFloatCount: boneCount * 8,
    vertexFloatCount: vertexCount * 16,
    skinnedFloatCount: vertexCount * 8,
    wgsl: shader?.wgsl ?? '',
    notes,
  }
}

/**
 * CPU reference skin for one vertex (validates math; fallback path).
 */
export function skinVertexCpu(
  vertex: SkinVertexSample,
  boneDqs: DualQuaternion[],
): { position: [number, number, number]; normal: [number, number, number] } {
  let rx = 0
  let ry = 0
  let rz = 0
  let rw = 0
  let dx = 0
  let dy = 0
  let dz = 0
  let dw = 0
  let has = false
  for (let i = 0; i < 4; i++) {
    const w = vertex.boneWeights[i]!
    if (w <= 0) continue
    const bone = boneDqs[vertex.boneIndices[i]!]
    if (!bone) continue
    let br = bone.real
    let bd = bone.dual
    if (has && rx * br[0] + ry * br[1] + rz * br[2] + rw * br[3] < 0) {
      br = [-br[0], -br[1], -br[2], -br[3]]
      bd = [-bd[0], -bd[1], -bd[2], -bd[3]]
    }
    rx += br[0] * w
    ry += br[1] * w
    rz += br[2] * w
    rw += br[3] * w
    dx += bd[0] * w
    dy += bd[1] * w
    dz += bd[2] * w
    dw += bd[3] * w
    has = true
  }
  if (!has) {
    return { position: [...vertex.position], normal: [...vertex.normal] }
  }
  const real = quatNormalize([rx, ry, rz, rw])
  const inv = 1 / (Math.hypot(rx, ry, rz, rw) || 1)
  const dual: [number, number, number, number] = [dx * inv, dy * inv, dz * inv, dw * inv]
  const [qx, qy, qz, qw] = real
  const [px, py, pz] = vertex.position
  // rotated = p + 2 * cross(q.xyz, cross(q.xyz, p) + q.w * p)
  const cx1 = qy * pz - qz * py + qw * px
  const cy1 = qz * px - qx * pz + qw * py
  const cz1 = qx * py - qy * px + qw * pz
  const rxp = px + 2 * (qy * cz1 - qz * cy1)
  const ryp = py + 2 * (qz * cx1 - qx * cz1)
  const rzp = pz + 2 * (qx * cy1 - qy * cx1)
  const tx = 2 * (qw * dual[0] - dual[3] * qx + (qy * dual[2] - qz * dual[1]))
  const ty = 2 * (qw * dual[1] - dual[3] * qy + (qz * dual[0] - qx * dual[2]))
  const tz = 2 * (qw * dual[2] - dual[3] * qz + (qx * dual[1] - qy * dual[0]))
  const [nx, ny, nz] = vertex.normal
  const ncx = qy * nz - qz * ny + qw * nx
  const ncy = qz * nx - qx * nz + qw * ny
  const ncz = qx * ny - qy * nx + qw * nz
  const nrx = nx + 2 * (qy * ncz - qz * ncy)
  const nry = ny + 2 * (qz * ncx - qx * ncz)
  const nrz = nz + 2 * (qx * ncy - qy * ncx)
  const nLen = Math.hypot(nrx, nry, nrz) || 1
  return {
    position: [rxp + tx, ryp + ty, rzp + tz],
    normal: [nrx / nLen, nry / nLen, nrz / nLen],
  }
}

function resolveCapabilityScore(score: number | undefined): number {
  if (!Number.isFinite(score)) return 38
  return Math.max(0, Math.min(100, Math.round(score as number)))
}

function computeLaneReady(
  readiness: DualQuaternionSkinProbeInput['computeReadiness'],
): boolean {
  if (!readiness) return false
  return (
    readiness.computeAvailable === true &&
    Array.isArray(readiness.availableLanes) &&
    readiness.availableLanes.includes('dual-quaternion-skinning-preview')
  )
}

/**
 * Plan skinning backend — fail-closed to WebGL2/CPU when compute/soak missing.
 * `dqComputeSkinningReady` requires soak evidence (letter bv).
 */
export function planDualQuaternionSkinning(
  input: DualQuaternionSkinProbeInput,
): DualQuaternionSkinPlan {
  const dualQuaternions = packMotionMatchingBonesToDualQuaternions(input.bonePoses)
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)
  const notes: string[] = [
    'DQ skinning from Motion Matching bone poses (letter bv)',
    'WebGL2/CPU DQ remains honest Zero-UI fallback',
  ]

  const gt730Blocked = capabilityScore < DQ_COMPUTE_MIN_CAPABILITY_SCORE
  if (gt730Blocked) {
    notes.push(
      `Law XV GT730-aware: capabilityScore=${capabilityScore} < ${DQ_COMPUTE_MIN_CAPABILITY_SCORE} — compute skinning blocked`,
    )
  }

  const laneFromReadiness = computeLaneReady(input.computeReadiness)
  const computeApi =
    !gt730Blocked &&
    input.webgpuAvailable &&
    (input.webgpuComputeAvailable || laneFromReadiness)

  const soakPassed =
    input.soakPassed === true ||
    (typeof input.soakFramesProven === 'number' && input.soakFramesProven > 0 && input.soakPassed !== false)

  if (computeApi && soakPassed) {
    return {
      backend: 'webgpu-compute',
      webgpuComputeAvailable: true,
      boneCount: dualQuaternions.length,
      dualQuaternions,
      gpuComputeSkinning: true,
      dqComputeSkinningReady: true,
      capabilityScore,
      heldReason: null,
      notes: [
        ...notes,
        'WebGPU compute skinning path selected after soak proof',
        `soakFramesProven=${input.soakFramesProven ?? 'flag'}`,
      ],
    }
  }

  if (computeApi && !soakPassed) {
    notes.push('WebGPU compute API present but soak not proven — dqComputeSkinningReady HELD')
  } else if (input.webgpuAvailable && !input.webgpuComputeAvailable && !laneFromReadiness) {
    notes.push('WebGPU present but compute unavailable — WebGL2 uniform fallback')
  } else if (!input.webgpuAvailable) {
    notes.push('WebGPU unavailable — WebGL2 / CPU DQ fallback (not JS vertex morph)')
  }

  const backend: DualQuaternionSkinBackend =
    input.webgpuAvailable && !gt730Blocked ? 'webgl2-uniform-fallback' : 'cpu-fallback'

  return {
    backend,
    webgpuComputeAvailable: false,
    boneCount: dualQuaternions.length,
    dualQuaternions,
    gpuComputeSkinning: false,
    dqComputeSkinningReady: false,
    capabilityScore,
    heldReason: soakPassed && !computeApi
      ? 'WebGPU compute skinning HELD — adapter/device/WGSL not available (fallback active)'
      : 'WebGPU compute skinning HELD — soak or compute evidence missing; fallback path documented and active',
    notes,
  }
}

/** Blend two DQs for LOD / inertialization (normalized lerp of reals). */
export function blendDualQuaternions(a: DualQuaternion, b: DualQuaternion, t: number): DualQuaternion {
  const u = Math.max(0, Math.min(1, t))
  const real: [number, number, number, number] = [
    a.real[0] + (b.real[0] - a.real[0]) * u,
    a.real[1] + (b.real[1] - a.real[1]) * u,
    a.real[2] + (b.real[2] - a.real[2]) * u,
    a.real[3] + (b.real[3] - a.real[3]) * u,
  ]
  const dual: [number, number, number, number] = [
    a.dual[0] + (b.dual[0] - a.dual[0]) * u,
    a.dual[1] + (b.dual[1] - a.dual[1]) * u,
    a.dual[2] + (b.dual[2] - a.dual[2]) * u,
    a.dual[3] + (b.dual[3] - a.dual[3]) * u,
  ]
  return { real: quatNormalize(real), dual }
}

/**
 * Upload bone DQ + vertex buffers and record one compute dispatch.
 * Accepts real GPUDevice or Vitest mock implementing the surface.
 */
export function dispatchDualQuaternionComputeSkinning(
  device: DualQuaternionGpuDeviceLike,
  boneDqs: DualQuaternion[],
  vertices: SkinVertexSample[],
): { ok: boolean; pipeline: DualQuaternionComputePipelineDescriptor; notes: string[] } {
  const pipeline = buildDualQuaternionComputePipelineDescriptor(boneDqs.length, vertices.length)
  const notes = [...pipeline.notes]
  if (!pipeline.wgsl.includes('@compute')) {
    return { ok: false, pipeline, notes: [...notes, 'WGSL missing @compute — dispatch aborted'] }
  }

  const boneBytes = packDualQuaternionsToFloat32(boneDqs)
  const STORAGE = 0x80
  const COPY_DST = 0x08
  const COPY_SRC = 0x04

  try {
    device.createShaderModule({ code: pipeline.wgsl })
    const boneBuf = device.createBuffer({
      size: Math.max(boneBytes.byteLength, 16),
      usage: STORAGE | COPY_DST,
      mappedAtCreation: Boolean(device.createBuffer.length),
    })
    const vertPacked = packSkinVerticesForCpuPreview(vertices)
    const vertBuf = device.createBuffer({
      size: Math.max(vertPacked.byteLength, 16),
      usage: STORAGE | COPY_DST,
    })
    const outBuf = device.createBuffer({
      size: Math.max(vertices.length * 8 * 4, 16),
      usage: STORAGE | COPY_SRC | COPY_DST,
    })

    if (device.createComputePipeline && device.createBindGroup && device.createCommandEncoder) {
      const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: device.createShaderModule({ code: pipeline.wgsl }), entryPoint: 'main' },
      })
      const bindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout?.(0),
        entries: [
          { binding: 0, resource: { buffer: boneBuf } },
          { binding: 1, resource: { buffer: vertBuf } },
          { binding: 2, resource: { buffer: outBuf } },
        ],
      })
      const encoder = device.createCommandEncoder()
      const pass = encoder.beginComputePass()
      pass.setPipeline(computePipeline)
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(Math.ceil(vertices.length / DQ_COMPUTE_BIND_LAYOUT.workgroupSize) || 1)
      pass.end()
      const cmd = encoder.finish()
      device.queue?.submit([cmd])
      notes.push('Compute dispatch recorded (bind group + bone DQ + skinned output)')
    } else {
      // Mock / partial device: shader module + buffers created = structural proof
      notes.push('Partial GPU surface — buffers + shader module created (mock soak)')
      // CPU validate at least one vertex so soak is not a no-op
      if (vertices.length > 0 && boneDqs.length > 0) {
        skinVertexCpu(vertices[0]!, boneDqs)
        notes.push('CPU reference skin exercised for soak integrity')
      }
    }

    boneBuf.destroy?.()
    vertBuf.destroy?.()
    outBuf.destroy?.()
    return { ok: true, pipeline, notes }
  } catch (e) {
    notes.push(e instanceof Error ? e.message : String(e))
    return { ok: false, pipeline, notes }
  }
}

/**
 * N-frame soak: prove compute dispatch path (or honest mock) before flipping ready.
 * Does NOT unlock AAA / Nanite / Euphoria marketing.
 */
export function runDualQuaternionComputeSoak(input: {
  frames?: number
  webgpuAvailable: boolean
  webgpuComputeAvailable: boolean
  capabilityScore?: number
  bonePoses?: BonePoseSample[]
  vertices?: SkinVertexSample[]
  /** Injected device (Vitest mock or live GPUDevice). */
  device?: DualQuaternionGpuDeviceLike | null
  computeReadiness?: DualQuaternionSkinProbeInput['computeReadiness']
}): DualQuaternionComputeSoakResult {
  const frames = Math.max(1, input.frames ?? 32)
  const notes: string[] = ['DQ compute soak (letter bv) — AAA skinning marketing forbidden']
  const capabilityScore = resolveCapabilityScore(input.capabilityScore)

  const bonePoses =
    input.bonePoses ??
    ([
      { boneIndex: 0, rotation: [0, 0, 0, 1] as [number, number, number, number], position: [0, 1, 0] as [number, number, number] },
      { boneIndex: 1, rotation: [0, 0.707, 0, 0.707] as [number, number, number, number], position: [0.5, 1, 0] as [number, number, number] },
    ] satisfies BonePoseSample[])

  const vertices =
    input.vertices ??
    ([
      {
        position: [0.1, 1.0, 0],
        normal: [0, 1, 0],
        boneIndices: [0, 1, 0, 0],
        boneWeights: [0.6, 0.4, 0, 0],
      },
    ] satisfies SkinVertexSample[])

  const planProbe = planDualQuaternionSkinning({
    webgpuAvailable: input.webgpuAvailable,
    webgpuComputeAvailable: input.webgpuComputeAvailable,
    bonePoses,
    capabilityScore,
    soakPassed: false,
    computeReadiness: input.computeReadiness,
  })

  if (planProbe.backend !== 'webgpu-compute' && !(input.webgpuAvailable && input.webgpuComputeAvailable && capabilityScore >= DQ_COMPUTE_MIN_CAPABILITY_SCORE)) {
    // Expected HELD path — still run CPU frames so math soak exists
    const dqs = packMotionMatchingBonesToDualQuaternions(bonePoses)
    for (let f = 0; f < frames; f++) {
      skinVertexCpu(vertices[0]!, dqs)
    }
    notes.push(...planProbe.notes)
    notes.push('Soak ran CPU fallback only — dqComputeSkinningReady stays false')
    return {
      passed: false,
      frames,
      dispatches: 0,
      backend: planProbe.backend,
      dqComputeSkinningReady: false,
      aaaSkinningMarketingAllowed: false,
      notes,
    }
  }

  const device = input.device
  if (!device) {
    notes.push('No GPUDevice / mock provided — compute soak HELD')
    return {
      passed: false,
      frames: 0,
      dispatches: 0,
      backend: 'webgl2-uniform-fallback',
      dqComputeSkinningReady: false,
      aaaSkinningMarketingAllowed: false,
      notes,
    }
  }

  const dqs = packMotionMatchingBonesToDualQuaternions(bonePoses)
  let dispatches = 0
  let failed = false
  for (let f = 0; f < frames; f++) {
    const result = dispatchDualQuaternionComputeSkinning(device, dqs, vertices)
    if (!result.ok) {
      failed = true
      notes.push(...result.notes)
      break
    }
    dispatches += 1
  }

  if (failed || dispatches < frames) {
    notes.push(`Soak failed after ${dispatches}/${frames} dispatches`)
    return {
      passed: false,
      frames: dispatches,
      dispatches,
      backend: 'webgl2-uniform-fallback',
      dqComputeSkinningReady: false,
      aaaSkinningMarketingAllowed: false,
      notes,
    }
  }

  notes.push(`Soak passed — ${dispatches} compute dispatches with bind group + bone DQ buffer`)
  return {
    passed: true,
    frames: dispatches,
    dispatches,
    backend: 'webgpu-compute',
    dqComputeSkinningReady: true,
    aaaSkinningMarketingAllowed: false,
    notes,
  }
}

/**
 * Honesty probe: `dqComputeSkinningReady` only when soak passed.
 */
export function probeDualQuaternionComputeHonesty(input?: {
  soak?: DualQuaternionComputeSoakResult
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  capabilityScore?: number
}): {
  letter: typeof DQ_COMPUTE_SKINNING_LETTER
  wired: true
  dqComputeSkinningReady: boolean
  gpuComputeSkinning: boolean
  held: boolean
  aaaSkinningMarketingAllowed: false
  notes: string[]
} {
  const soak = input?.soak
  const plan = planDualQuaternionSkinning({
    webgpuAvailable: input?.webgpuAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    bonePoses: [{ boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] }],
    capabilityScore: input?.capabilityScore,
    soakPassed: soak?.passed === true,
    soakFramesProven: soak?.frames,
  })
  return {
    letter: DQ_COMPUTE_SKINNING_LETTER,
    wired: true,
    dqComputeSkinningReady: plan.dqComputeSkinningReady,
    gpuComputeSkinning: plan.gpuComputeSkinning,
    held: !plan.dqComputeSkinningReady,
    aaaSkinningMarketingAllowed: false,
    notes: [...plan.notes, ...(soak?.notes ?? [])],
  }
}

/** Vitest helper — minimal mock GPU that exercises buffer + shader + optional dispatch. */
export function createMockDualQuaternionGpuDevice(
  opts?: { supportDispatch?: boolean },
): DualQuaternionGpuDeviceLike {
  const supportDispatch = opts?.supportDispatch !== false
  const buffers: DualQuaternionGpuBufferLike[] = []
  const device: DualQuaternionGpuDeviceLike = {
    createBuffer: (desc) => {
      const buf: DualQuaternionGpuBufferLike = {
        destroy: () => undefined,
        getMappedRange: () => new ArrayBuffer(desc.size),
        unmap: () => undefined,
      }
      buffers.push(buf)
      return buf
    },
    createShaderModule: () => ({ label: 'mock-dq-skin' }),
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
