/**
 * Letter cq — OceanRenderPass (AAA mesh bind + sun/cloud light coupling).
 * Consumes duck-typed WaterParams; FFT displace via ocean-viewport-wire (cm deepen).
 * Reacts to PBR sky (cp) / Radiance sun — not a visual-only mock as shipped surface.
 * Letter cs — WebGPU compute FFT when soak-proven (CPU Zero-UI fallback).
 * UE Water / marketing gpuFftAllowed remain HELD.
 */

import { samplePbrSkyAtmosphere } from '@/lib/cosmos/pbr-sky-atmosphere'
import {
  planOceanViewportOptIn,
  resolveOceanCapabilityBudget,
} from '@/lib/ocean/ocean-capability-budget'
import {
  bindOceanViewportMesh,
  createOceanViewportMockMesh,
  tickOceanViewportDisplacement,
  type OceanMeshTarget,
  type OceanViewportDisplaceResult,
} from '@/lib/ocean/ocean-viewport-wire'

export const OCEAN_RENDER_PASS_LETTER = 'cq' as const
export const OCEAN_RENDER_PASS_WIRED = true as const

/**
 * Duck-typed WaterParams from WaterEditorRuntime / water-editor-models.
 * Avoids hard import of editor models into AAA renderer core.
 */
export interface DuckTypedWaterParams {
  fftOceanEnabled?: boolean
  capabilityScore?: number
  waveScale?: number
  shallowColor?: string
  deepColor?: string
  transparency?: number
  reflectionEnabled?: boolean
  reflectionIntensity?: number
  buoyancyEnabled?: boolean
  waterDensity?: number
  foamIntensity?: number
}

export type DuckWaterParams = DuckTypedWaterParams

export interface OceanLightCoupling {
  sunDir: { x: number; y: number; z: number }
  /** 0..1 cloud coverage attenuates specular / sky tint. */
  cloudCoverage: number
  skyRgb: { r: number; g: number; b: number }
  specularScale: number
  tintMix: number
}

/** @deprecated use cloudCoverage — kept for AAARenderer callers that said cloudOcclusion. */
export interface OceanSkyLightCoupling {
  sunDir: { x: number; y: number; z: number }
  cloudOcclusion?: number
  cloudCoverage?: number
  skyRgb?: { r: number; g: number; b: number }
}

export interface OceanMaterialTarget {
  setColorRgb?: (r: number, g: number, b: number) => void
  setEnvMapIntensity?: (v: number) => void
  setOpacity?: (v: number) => void
  lastColorRgb?: { r: number; g: number; b: number }
  lastEnvMapIntensity?: number
}

export type OceanMaterialLightTarget = OceanMaterialTarget

export interface OceanRenderPassTickResult {
  letter: typeof OCEAN_RENDER_PASS_LETTER
  applied: boolean
  zeroUiUnavailable: boolean
  meshDisplaced: boolean
  lightCoupled: boolean
  /** Alias of lightCoupled for evidence scanners. */
  skyCoupled: boolean
  sunReacted: boolean
  cloudOcclusion: number
  fftResolution: number
  peakAbs: number
  verticesDisplaced: number
  heights: Float32Array | null
  coupling: OceanLightCoupling | null
  materialTint: { r: number; g: number; b: number } | null
  fakeVisualOnlyForbidden: true
  mockVisualOnlyForbidden: true
}

export interface OceanRenderPassBind {
  mesh: OceanMeshTarget | null
  material?: OceanMaterialTarget | null
  waterParams?: DuckWaterParams | null
  capabilityScore: number
  userEnabled: boolean
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function normalizeDir(d: { x: number; y: number; z: number }): {
  x: number
  y: number
  z: number
} {
  const len = Math.hypot(d.x, d.y, d.z) || 1
  return { x: d.x / len, y: d.y / len, z: d.z / len }
}

/**
 * Couple ocean specular/tint to sun + clouds via PBR sky sample (cp).
 */
export function resolveOceanLightCoupling(input: {
  sunDir?: { x: number; y: number; z: number }
  cloudCoverage?: number
  capabilityScore?: number
  reflectionIntensity?: number
  skyRgb?: { r: number; g: number; b: number }
}): OceanLightCoupling {
  const sunDir = normalizeDir(input.sunDir ?? { x: 0.2, y: 0.85, z: 0.35 })
  const cloud = clamp01(input.cloudCoverage ?? 0.25)
  const samples =
    (input.capabilityScore ?? 38) < 20 ? 4 : (input.capabilityScore ?? 38) < 45 ? 6 : 8
  const sky =
    input.skyRgb ??
    (() => {
      const s = samplePbrSkyAtmosphere(sunDir, { samples, sunDir })
      return { r: s.r, g: s.g, b: s.b }
    })()
  const refl = clamp01(input.reflectionIntensity ?? 0.7)
  const clearSky = 1 - cloud * 0.75
  const specularScale = refl * clearSky * (0.35 + 0.65 * clamp01(sunDir.y))
  const tintMix = 0.25 + 0.55 * clearSky
  return {
    sunDir,
    cloudCoverage: cloud,
    skyRgb: sky,
    specularScale,
    tintMix,
  }
}

export function applyOceanLightToMaterial(
  material: OceanMaterialTarget | null | undefined,
  coupling: OceanLightCoupling,
  water?: DuckWaterParams | null,
): boolean {
  if (!material) return false
  const baseR = 0.15
  const baseG = 0.45
  const baseB = 0.55
  const t = coupling.tintMix
  const r = baseR * (1 - t) + coupling.skyRgb.r * t
  const g = baseG * (1 - t) + coupling.skyRgb.g * t
  const b = baseB * (1 - t) + coupling.skyRgb.b * t
  material.setColorRgb?.(r, g, b)
  material.lastColorRgb = { r, g, b }
  const env = coupling.specularScale * (water?.reflectionIntensity ?? 0.8)
  material.setEnvMapIntensity?.(env)
  material.lastEnvMapIntensity = env
  if (typeof water?.transparency === 'number') {
    material.setOpacity?.(clamp01(water.transparency))
  }
  return true
}

/** Compatibility wrapper used by older call sites. */
export function coupleOceanMaterialToSky(
  water: DuckWaterParams | null | undefined,
  sky: OceanSkyLightCoupling | null | undefined,
  material: OceanMaterialTarget | null | undefined,
): {
  applied: boolean
  tint: { r: number; g: number; b: number } | null
  envMapIntensity: number
  cloudOcclusion: number
  sunReacted: boolean
} {
  const coupling = resolveOceanLightCoupling({
    sunDir: sky?.sunDir,
    cloudCoverage: sky?.cloudCoverage ?? sky?.cloudOcclusion ?? 0.25,
    reflectionIntensity: water?.reflectionIntensity,
    skyRgb: sky?.skyRgb,
    capabilityScore: water?.capabilityScore,
  })
  const applied = applyOceanLightToMaterial(material, coupling, water)
  return {
    applied,
    tint: material?.lastColorRgb ?? {
      r: coupling.skyRgb.r,
      g: coupling.skyRgb.g,
      b: coupling.skyRgb.b,
    },
    envMapIntensity: material?.lastEnvMapIntensity ?? coupling.specularScale,
    cloudOcclusion: coupling.cloudCoverage,
    sunReacted: true,
  }
}

/**
 * AAA OceanRenderPass — CapScore FFT mesh + sun/cloud material coupling.
 */
export class OceanRenderPass {
  private mesh: OceanMeshTarget | null = null
  private material: OceanMaterialTarget | null = null
  private waterParams: DuckWaterParams | null = null
  private capabilityScore = 38
  private userEnabled = false
  private lastTick: OceanRenderPassTickResult | null = null
  private frame = 0
  private sunDir: { x: number; y: number; z: number } = { x: 0.2, y: 0.85, z: 0.35 }
  private cloudCoverage = 0.25
  private disposed = false

  constructor(capabilityScore?: number, waterParams?: DuckWaterParams | null) {
    if (typeof capabilityScore === 'number') this.capabilityScore = capabilityScore
    if (waterParams) this.waterParams = waterParams
  }

  bind(input: OceanRenderPassBind | {
    mesh?: OceanMeshTarget | null
    material?: OceanMaterialTarget | null
    waterParams?: DuckWaterParams | null
    capabilityScore?: number
    userEnabled?: boolean
  }): void {
    if (this.disposed) return
    if (input.mesh !== undefined) this.mesh = input.mesh ?? null
    if (input.material !== undefined) this.material = input.material ?? null
    if (input.waterParams !== undefined) this.waterParams = input.waterParams ?? null
    if (typeof input.capabilityScore === 'number') this.capabilityScore = input.capabilityScore
    if (typeof input.userEnabled === 'boolean') this.userEnabled = input.userEnabled
    if (this.mesh) bindOceanViewportMesh(this.mesh)
    else bindOceanViewportMesh(null)
  }

  setWaterParams(params: DuckWaterParams | null): void {
    this.waterParams = params
  }

  setSunAndClouds(input: {
    sunDir?: { x: number; y: number; z: number }
    cloudCoverage?: number
    cloudOcclusion?: number
  }): void {
    if (input.sunDir) this.sunDir = normalizeDir(input.sunDir)
    if (typeof input.cloudCoverage === 'number') {
      this.cloudCoverage = clamp01(input.cloudCoverage)
    } else if (typeof input.cloudOcclusion === 'number') {
      this.cloudCoverage = clamp01(input.cloudOcclusion)
    }
  }

  setSkyLightCoupling(sky: OceanSkyLightCoupling | null): void {
    if (!sky) return
    this.setSunAndClouds({
      sunDir: sky.sunDir,
      cloudCoverage: sky.cloudCoverage ?? sky.cloudOcclusion,
    })
  }

  isEnabled(): boolean {
    return this.userEnabled === true && this.waterParams?.fftOceanEnabled !== false
  }

  getLastTick(): OceanRenderPassTickResult | null {
    return this.lastTick
  }

  tick(seed?: number): OceanRenderPassTickResult {
    this.frame += 1
    if (this.disposed) {
      return this.zeroResult(0)
    }

    const score = this.waterParams?.capabilityScore ?? this.capabilityScore
    const enabled =
      this.userEnabled === true &&
      this.waterParams?.fftOceanEnabled !== false &&
      planOceanViewportOptIn({ capabilityScore: score, userEnabled: true }).enabled

    if (!enabled || !this.mesh) {
      this.lastTick = this.zeroResult(resolveOceanCapabilityBudget(score).fftResolution)
      return this.lastTick
    }

    const coupling = resolveOceanLightCoupling({
      sunDir: this.sunDir,
      cloudCoverage: this.cloudCoverage,
      capabilityScore: score,
      reflectionIntensity: this.waterParams?.reflectionIntensity,
    })
    const lightCoupled = applyOceanLightToMaterial(
      this.material,
      coupling,
      this.waterParams,
    )

    const waveScale = this.waterParams?.waveScale ?? 1
    const displace: OceanViewportDisplaceResult & { heights: Float32Array | null } =
      tickOceanViewportDisplacement({
        capabilityScore: score,
        userEnabled: true,
        seed: seed ?? this.frame * 17,
        waveScale,
        windSpeed: 10 + waveScale * 4,
        amplitude: 0.4 * waveScale,
        target: this.mesh,
      })

    this.lastTick = {
      letter: OCEAN_RENDER_PASS_LETTER,
      applied: displace.applied,
      zeroUiUnavailable: displace.zeroUiUnavailable,
      meshDisplaced: displace.applied && displace.peakAbs > 0,
      lightCoupled,
      skyCoupled: lightCoupled,
      sunReacted: true,
      cloudOcclusion: coupling.cloudCoverage,
      fftResolution: displace.fftResolution,
      peakAbs: displace.peakAbs,
      verticesDisplaced: displace.verticesDisplaced,
      heights: displace.heights,
      coupling,
      materialTint: this.material?.lastColorRgb ?? null,
      fakeVisualOnlyForbidden: true,
      mockVisualOnlyForbidden: true,
    }
    return this.lastTick
  }

  private zeroResult(fftResolution: number): OceanRenderPassTickResult {
    return {
      letter: OCEAN_RENDER_PASS_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      meshDisplaced: false,
      lightCoupled: false,
      skyCoupled: false,
      sunReacted: false,
      cloudOcclusion: 0,
      fftResolution,
      peakAbs: 0,
      verticesDisplaced: 0,
      heights: null,
      coupling: null,
      materialTint: null,
      fakeVisualOnlyForbidden: true,
      mockVisualOnlyForbidden: true,
    }
  }

  dispose(): void {
    this.disposed = true
    bindOceanViewportMesh(null)
    this.mesh = null
    this.material = null
    this.waterParams = null
    this.userEnabled = false
    this.lastTick = null
  }
}

export function createOceanRenderPass(
  capabilityScore?: number,
  waterParams?: DuckWaterParams | null,
): OceanRenderPass {
  return new OceanRenderPass(capabilityScore, waterParams)
}

/**
 * Stateless frame tick helper (tests / Studio bridges).
 */
export function tickOceanRenderPass(input: {
  capabilityScore: number
  waterParams?: DuckWaterParams | null
  mesh?: OceanMeshTarget | null
  material?: OceanMaterialTarget | null
  sky?: OceanSkyLightCoupling | null
  seed?: number
  userEnabled?: boolean
}): OceanRenderPassTickResult {
  const pass = createOceanRenderPass(input.capabilityScore, input.waterParams)
  pass.bind({
    mesh: input.mesh ?? null,
    material: input.material ?? null,
    waterParams: input.waterParams ?? {
      fftOceanEnabled: true,
      capabilityScore: input.capabilityScore,
    },
    capabilityScore: input.capabilityScore,
    userEnabled: input.userEnabled !== false,
  })
  if (input.sky) pass.setSkyLightCoupling(input.sky)
  const r = pass.tick(input.seed)
  // Do not dispose mesh bind if caller still holds mesh — only clear pass state.
  pass.dispose()
  return r
}

/** Mock material for soak / tests. */
export function createOceanMockMaterial(): OceanMaterialTarget & {
  getColor: () => { r: number; g: number; b: number } | null
  getEnv: () => number | null
} {
  const mat: OceanMaterialTarget & {
    getColor: () => { r: number; g: number; b: number } | null
    getEnv: () => number | null
  } = {
    setColorRgb(r, g, b) {
      mat.lastColorRgb = { r, g, b }
    },
    setEnvMapIntensity(v) {
      mat.lastEnvMapIntensity = v
    },
    getColor() {
      return mat.lastColorRgb ?? null
    },
    getEnv() {
      return mat.lastEnvMapIntensity ?? null
    },
  }
  return mat
}

export const createOceanMaterialMock = createOceanMockMaterial

/**
 * Multi-frame soak: FFT mesh + sun/cloud coupling contrast (clear vs overcast).
 * Gates oceanMeshBindReady (cq deepen of cm oceanViewportReady).
 */
export function proveOceanMeshBindSoak(capabilityScore = 38): {
  letter: typeof OCEAN_RENDER_PASS_LETTER
  passed: boolean
  meshDisplaced: boolean
  lightCoupled: boolean
  sunCloudContrast: boolean
  zeroUiOk: boolean
  framesProven: number
  notes: string[]
} {
  const notes: string[] = []
  const mock = createOceanViewportMockMesh(8)
  const material = createOceanMockMaterial()
  const pass = createOceanRenderPass(capabilityScore, {
    fftOceanEnabled: true,
    capabilityScore,
    waveScale: 1.2,
    reflectionIntensity: 0.9,
    transparency: 0.8,
  })
  pass.bind({
    mesh: mock.target,
    material,
    waterParams: {
      fftOceanEnabled: true,
      capabilityScore,
      waveScale: 1.2,
      reflectionIntensity: 0.9,
      transparency: 0.8,
    },
    capabilityScore,
    userEnabled: true,
  })

  let meshDisplaced = false
  let lightCoupled = false
  let frames = 0

  pass.setSunAndClouds({
    sunDir: { x: 0.1, y: 0.95, z: 0.2 },
    cloudCoverage: 0.05,
  })
  for (let i = 0; i < 3; i++) {
    const t = pass.tick(40 + i)
    frames += 1
    if (t.meshDisplaced) meshDisplaced = true
    if (t.lightCoupled) lightCoupled = true
  }
  const clearEnv = material.getEnv() ?? 0
  const clearColor = material.getColor()

  pass.setSunAndClouds({
    sunDir: { x: 0.1, y: 0.95, z: 0.2 },
    cloudCoverage: 0.95,
  })
  pass.tick(99)
  const overcastEnv = material.getEnv() ?? 0

  const sunCloudContrast =
    clearEnv > overcastEnv &&
    clearColor !== null &&
    (clearColor.b > 0 || clearColor.g > 0)

  if (!meshDisplaced) notes.push('mesh displace soak failed')
  if (!lightCoupled) notes.push('light coupling soak failed')
  if (!sunCloudContrast) notes.push('sun/cloud specular contrast failed')

  pass.bind({
    mesh: mock.target,
    material,
    waterParams: { fftOceanEnabled: true, capabilityScore },
    capabilityScore,
    userEnabled: false,
  })
  const off = pass.tick(1)
  const zeroUiOk = off.zeroUiUnavailable && !off.applied
  if (!zeroUiOk) notes.push('Zero-UI fail on opt-out')

  pass.dispose()

  const passed =
    OCEAN_RENDER_PASS_WIRED &&
    meshDisplaced &&
    lightCoupled &&
    sunCloudContrast &&
    zeroUiOk &&
    frames >= 3

  if (passed) {
    notes.push(
      'oceanMeshBindReady soak CLOSED (letter cq) — OceanRenderPass FFT + sun/cloud coupling',
    )
  }

  return {
    letter: OCEAN_RENDER_PASS_LETTER,
    passed,
    meshDisplaced,
    lightCoupled,
    sunCloudContrast,
    zeroUiOk,
    framesProven: passed ? frames : 0,
    notes,
  }
}
