/**
 * Letter cm — Ocean FFT → visible mesh (R3F / Three / AAA duck-typed).
 * Letter cs — optional WebGPU compute FFT when soak+adapter (CPU Zero-UI fallback).
 * Zero-UI when unbound or opt-in off. UE Water parity HELD.
 */

import {
  generateOceanHeightField,
  sampleOceanHeight,
  type OceanSpectrumParams,
} from '@/lib/ocean/fft-displacement'
import {
  generateOceanHeightFieldGpuOrCpu,
  getGpuOceanFftContext,
  type GpuOceanFftBackend,
} from '@/lib/ocean/gpu-fft-ocean'
import {
  planOceanViewportOptIn,
  resolveOceanCapabilityBudget,
} from '@/lib/ocean/ocean-capability-budget'

export const OCEAN_VIEWPORT_WIRE_LETTER = 'cm' as const
export const OCEAN_VIEWPORT_WIRE_WIRED = true as const

/**
 * Duck-typed mesh positions — PlaneGeometry XY layout with height on Z
 * (WaterSurface rotates −π/2 so Z becomes world Y).
 */
export interface OceanMeshTarget {
  positions: Float32Array
  originalPositions: Float32Array
  setNeedsUpdate: () => void
  /** World XZ extent mapped into FFT UV (default 100 — WaterSurface plane). */
  worldSize?: number
}

export interface OceanViewportDisplaceResult {
  letter: typeof OCEAN_VIEWPORT_WIRE_LETTER
  applied: boolean
  /** True when no mesh bound / opt-in off — silent Zero-UI (not an error). */
  zeroUiUnavailable: boolean
  verticesDisplaced: number
  fftResolution: number
  peakAbs: number
  /** Letter cs — which FFT backend produced heights (cpu default). */
  fftBackend?: GpuOceanFftBackend
}

let boundMesh: OceanMeshTarget | null = null

/**
 * Studio / AAA viewport binds mesh for FFT displacement.
 * Pass null to unbind (Zero-UI — playtest may still tick buoyancy).
 */
export function bindOceanViewportMesh(target: OceanMeshTarget | null): void {
  boundMesh = target
}

export function getOceanViewportMesh(): OceanMeshTarget | null {
  return boundMesh
}

/**
 * Sample FFT heights into mesh vertex Z (height axis before WaterSurface rotation).
 */
export function applyOceanHeightsToMesh(
  heights: Float32Array,
  resolution: number,
  target: OceanMeshTarget | null | undefined = boundMesh,
  waveScale = 1,
): OceanViewportDisplaceResult {
  if (!target || !target.positions || !target.originalPositions) {
    return {
      letter: OCEAN_VIEWPORT_WIRE_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      verticesDisplaced: 0,
      fftResolution: resolution,
      peakAbs: 0,
    }
  }

  const worldSize = target.worldSize ?? 100
  const positions = target.positions
  const originals = target.originalPositions
  let verticesDisplaced = 0
  let peakAbs = 0

  for (let i = 0; i < positions.length; i += 3) {
    const x = originals[i]!
    const y = originals[i + 1]!
    const u = x / worldSize + 0.5
    const v = y / worldSize + 0.5
    const h = sampleOceanHeight(heights, resolution, u, v) * waveScale
    positions[i + 2] = h
    peakAbs = Math.max(peakAbs, Math.abs(h))
    verticesDisplaced += 1
  }

  target.setNeedsUpdate()

  return {
    letter: OCEAN_VIEWPORT_WIRE_LETTER,
    applied: verticesDisplaced > 0,
    zeroUiUnavailable: false,
    verticesDisplaced,
    fftResolution: resolution,
    peakAbs,
  }
}

/**
 * CapScore-gated FFT generate + displace into bound/explicit mesh.
 * userEnabled false → Zero-UI no-op.
 * Letter cs: uses WebGPU compute when session context soak-proven; else CPU.
 */
export function tickOceanViewportDisplacement(input: {
  capabilityScore: number
  userEnabled: boolean
  seed?: number
  waveScale?: number
  windSpeed?: number
  windAngle?: number
  amplitude?: number
  target?: OceanMeshTarget | null
}): OceanViewportDisplaceResult & {
  heights: Float32Array | null
  fftBackend: GpuOceanFftBackend
} {
  const opt = planOceanViewportOptIn({
    capabilityScore: input.capabilityScore,
    userEnabled: input.userEnabled,
  })
  if (!opt.enabled) {
    return {
      letter: OCEAN_VIEWPORT_WIRE_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      verticesDisplaced: 0,
      fftResolution: opt.fftResolution,
      peakAbs: 0,
      heights: null,
      fftBackend: 'cpu-fft-fallback',
    }
  }

  const params: OceanSpectrumParams = {
    resolution: opt.fftResolution,
    windSpeed: input.windSpeed ?? 12,
    windAngle: input.windAngle ?? 0.4,
    amplitude: input.amplitude ?? 0.5,
    seed: input.seed ?? 42,
  }

  const ctx = getGpuOceanFftContext()
  let heights: Float32Array
  let fftBackend: GpuOceanFftBackend = 'cpu-fft-fallback'
  if (ctx) {
    const generated = generateOceanHeightFieldGpuOrCpu({
      params,
      capabilityScore: input.capabilityScore,
      webgpuAvailable: ctx.webgpuAvailable,
      webgpuComputeAvailable: ctx.webgpuComputeAvailable,
      soakPassed: ctx.soakPassed,
      soakFramesProven: ctx.soakFramesProven,
      device: ctx.device,
      computeReadiness: ctx.computeReadiness,
    })
    heights = generated.heights
    fftBackend = generated.backend
  } else {
    heights = generateOceanHeightField(params)
  }

  const displace = applyOceanHeightsToMesh(
    heights,
    params.resolution,
    input.target ?? boundMesh,
    input.waveScale ?? 1,
  )
  return { ...displace, heights, fftBackend }
}

/** Test / IDE helper — mutable plane-like position buffers. */
export function createOceanViewportMockMesh(segments = 8): {
  target: OceanMeshTarget
  positions: Float32Array
  originalPositions: Float32Array
} {
  const verts = (segments + 1) * (segments + 1)
  const positions = new Float32Array(verts * 3)
  const originalPositions = new Float32Array(verts * 3)
  const half = 50
  let vi = 0
  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const x = -half + (ix / segments) * half * 2
      const y = -half + (iy / segments) * half * 2
      originalPositions[vi] = x
      originalPositions[vi + 1] = y
      originalPositions[vi + 2] = 0
      positions[vi] = x
      positions[vi + 1] = y
      positions[vi + 2] = 0
      vi += 3
    }
  }
  let needsUpdate = false
  const target: OceanMeshTarget = {
    positions,
    originalPositions,
    worldSize: 100,
    setNeedsUpdate() {
      needsUpdate = true
      ;(target as { _needsUpdate?: boolean })._needsUpdate = needsUpdate
    },
  }
  return { target, positions, originalPositions }
}

/** CapScore contrast helper for soak — low vs high fftResolution. */
export function proveOceanCapScoreMeshContrast(): {
  passed: boolean
  lowRes: number
  highRes: number
} {
  const low = resolveOceanCapabilityBudget(12)
  const high = resolveOceanCapabilityBudget(80)
  return {
    passed: low.fftResolution < high.fftResolution && low.fftResolution === 16,
    lowRes: low.fftResolution,
    highRes: high.fftResolution,
  }
}
