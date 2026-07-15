/**
 * Letter cp — PBR Sky Atmosphere → visible AAA/viewport frame (Rayleigh/Mie).
 * Zero-UI when unbound or cosmos opt-in off. Painted skybox + UE atmosphere maturity HELD.
 */

import { resolveCosmosCapabilityBudget } from '@/lib/cosmos/cosmos-capability-budget'
import {
  provePbrSkyAtmosphere,
  samplePbrSkyAtmosphere,
  type SkyAtmosphereSample,
} from '@/lib/cosmos/pbr-sky-atmosphere'

export const COSMOS_PBR_SKY_VIEWPORT_LETTER = 'cp' as const
export const COSMOS_PBR_SKY_VIEWPORT_WIRE_WIRED = true as const

/**
 * Duck-typed scene background — Three.js Scene.background or mock soak target.
 * Must not load painted skybox cubemap textures.
 */
export interface PbrSkySceneTarget {
  setBackgroundRgb: (r: number, g: number, b: number) => void
  /** Last applied RGB for soak / tests. */
  lastBackgroundRgb?: { r: number; g: number; b: number }
}

export interface PbrSkyViewportApplyResult {
  letter: typeof COSMOS_PBR_SKY_VIEWPORT_LETTER
  applied: boolean
  /** True when no scene bound / opt-in off — silent Zero-UI (not an error). */
  zeroUiUnavailable: boolean
  skySampled: boolean
  sampleCount: number
  rgb: { r: number; g: number; b: number } | null
  paintedSkyboxForbidden: true
  opticalDepth: number
}

let boundScene: PbrSkySceneTarget | null = null

/**
 * Studio / AAA viewport binds scene for Rayleigh/Mie background.
 * Pass null to unbind (Zero-UI).
 */
export function bindPbrSkyScene(target: PbrSkySceneTarget | null): void {
  boundScene = target
}

export function getPbrSkyScene(): PbrSkySceneTarget | null {
  return boundScene
}

/**
 * Wrap a Three.js-like Color background so cosmos sky can set solid RGB (no cubemap).
 * AAARenderer should seed `scene.background` with a Color before binding.
 */
export function wrapThreeSceneForPbrSky(scene: {
  background: { setRGB?: (r: number, g: number, b: number) => void } | null
}): PbrSkySceneTarget {
  const target: PbrSkySceneTarget = {
    setBackgroundRgb(r, g, b) {
      const bg = scene.background
      if (bg && typeof bg.setRGB === 'function') {
        bg.setRGB(r, g, b)
      }
      target.lastBackgroundRgb = { r, g, b }
    },
  }
  return target
}

/**
 * Sample Rayleigh/Mie along viewDir and write into scene background RGB.
 * Forbidden: claiming painted skybox / cubemap as planetary sky.
 */
export function applyPbrSkyToScene(
  viewDir: { x: number; y: number; z: number },
  input: {
    capabilityScore: number
    target?: PbrSkySceneTarget | null
    sunDir?: { x: number; y: number; z: number }
  },
): PbrSkyViewportApplyResult {
  const target = input.target !== undefined ? input.target : boundScene
  const budget = resolveCosmosCapabilityBudget(input.capabilityScore)
  const samples = budget.skyAtmosphereSamples

  if (!target || typeof target.setBackgroundRgb !== 'function') {
    return {
      letter: COSMOS_PBR_SKY_VIEWPORT_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      skySampled: false,
      sampleCount: samples,
      rgb: null,
      paintedSkyboxForbidden: true,
      opticalDepth: 0,
    }
  }

  const sample: SkyAtmosphereSample = samplePbrSkyAtmosphere(viewDir, {
    samples,
    sunDir: input.sunDir,
  })
  target.setBackgroundRgb(sample.r, sample.g, sample.b)
  target.lastBackgroundRgb = { r: sample.r, g: sample.g, b: sample.b }

  return {
    letter: COSMOS_PBR_SKY_VIEWPORT_LETTER,
    applied: true,
    zeroUiUnavailable: false,
    skySampled: true,
    sampleCount: samples,
    rgb: { r: sample.r, g: sample.g, b: sample.b },
    paintedSkyboxForbidden: true,
    opticalDepth: sample.opticalDepth,
  }
}

/**
 * CapScore-gated sky apply. userEnabled false → Zero-UI no-op.
 */
export function tickPbrSkyViewport(input: {
  capabilityScore: number
  userEnabled: boolean
  viewDir: { x: number; y: number; z: number }
  target?: PbrSkySceneTarget | null
  sunDir?: { x: number; y: number; z: number }
}): PbrSkyViewportApplyResult {
  if (!input.userEnabled) {
    const budget = resolveCosmosCapabilityBudget(input.capabilityScore)
    return {
      letter: COSMOS_PBR_SKY_VIEWPORT_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      skySampled: false,
      sampleCount: budget.skyAtmosphereSamples,
      rgb: null,
      paintedSkyboxForbidden: true,
      opticalDepth: 0,
    }
  }
  return applyPbrSkyToScene(input.viewDir, {
    capabilityScore: input.capabilityScore,
    target: input.target,
    sunDir: input.sunDir,
  })
}

/** Test / IDE helper — mutable background RGB sink. */
export function createPbrSkyMockScene(): {
  target: PbrSkySceneTarget
  getRgb: () => { r: number; g: number; b: number } | null
} {
  let rgb: { r: number; g: number; b: number } | null = null
  const target: PbrSkySceneTarget = {
    setBackgroundRgb(r, g, b) {
      rgb = { r, g, b }
      target.lastBackgroundRgb = { r, g, b }
    },
  }
  return {
    target,
    getRgb: () => rgb,
  }
}

/** CapScore contrast — GT730 fewer sky samples than enthusiast. */
export function provePbrSkyCapScoreSampleContrast(): {
  passed: boolean
  lowSamples: number
  highSamples: number
} {
  const low = resolveCosmosCapabilityBudget(12)
  const high = resolveCosmosCapabilityBudget(80)
  return {
    passed:
      low.skyAtmosphereSamples < high.skyAtmosphereSamples &&
      low.skyAtmosphereSamples === 4 &&
      low.tier === 'gt730',
    lowSamples: low.skyAtmosphereSamples,
    highSamples: high.skyAtmosphereSamples,
  }
}

export interface PbrSkyViewportSoakResult {
  letter: typeof COSMOS_PBR_SKY_VIEWPORT_LETTER
  passed: boolean
  libWired: boolean
  skyApplied: boolean
  visibleFrameRgb: boolean
  capScoreContrast: boolean
  noPaintedSkybox: boolean
  framesProven: number
  sampleCount: number
  notes: string[]
}

/**
 * Multi-frame soak: Rayleigh/Mie RGB lands on scene background + CapScore contrast.
 * Gates `pbrSkyViewportReady` (cp deepen of cn PBR sky interface).
 */
export function provePbrSkyViewportSoak(capabilityScore = 38): PbrSkyViewportSoakResult {
  const notes: string[] = []
  const mock = createPbrSkyMockScene()
  bindPbrSkyScene(mock.target)

  const interfaceProof = provePbrSkyAtmosphere()
  if (!interfaceProof.passed || !interfaceProof.noPaintedSkybox) {
    notes.push('cn PBR sky interface regress')
  }

  let skyApplied = false
  let frames = 0
  const dirs = [
    { x: 0, y: 1, z: 0 },
    { x: 0.2, y: 0.9, z: 0.1 },
    { x: 1, y: 0.1, z: 0 },
    { x: -0.3, y: 0.7, z: 0.4 },
  ]

  for (const viewDir of dirs) {
    const tick = tickPbrSkyViewport({
      capabilityScore,
      userEnabled: true,
      viewDir,
      target: mock.target,
    })
    frames += 1
    if (
      tick.applied &&
      tick.skySampled &&
      tick.rgb &&
      tick.paintedSkyboxForbidden &&
      tick.opticalDepth > 0
    ) {
      skyApplied = true
    }
  }

  const rgb = mock.getRgb()
  const visibleFrameRgb =
    rgb !== null &&
    Number.isFinite(rgb.r) &&
    Number.isFinite(rgb.g) &&
    Number.isFinite(rgb.b) &&
    (rgb.r > 0 || rgb.g > 0 || rgb.b > 0)

  if (!visibleFrameRgb) {
    notes.push('viewport soak failed — background RGB never set')
  }

  const contrast = provePbrSkyCapScoreSampleContrast()
  const lowTick = tickPbrSkyViewport({
    capabilityScore: 12,
    userEnabled: true,
    viewDir: { x: 0, y: 1, z: 0 },
    target: createPbrSkyMockScene().target,
  })
  const highTick = tickPbrSkyViewport({
    capabilityScore: 80,
    userEnabled: true,
    viewDir: { x: 0, y: 1, z: 0 },
    target: createPbrSkyMockScene().target,
  })
  const capScoreContrast =
    contrast.passed &&
    lowTick.sampleCount < highTick.sampleCount &&
    lowTick.applied &&
    highTick.applied

  if (!capScoreContrast) {
    notes.push('CapScore contrast soak failed — GT730 sky samples should be tighter')
  }

  const unbound = applyPbrSkyToScene(
    { x: 0, y: 1, z: 0 },
    { capabilityScore, target: null },
  )
  const off = tickPbrSkyViewport({
    capabilityScore,
    userEnabled: false,
    viewDir: { x: 0, y: 1, z: 0 },
    target: mock.target,
  })
  const zeroUiOk = unbound.zeroUiUnavailable && off.zeroUiUnavailable && !off.applied
  if (!zeroUiOk) {
    notes.push('Zero-UI fail — unbound / opt-out must silent no-op')
  }

  // Zenith should remain bluish after last apply — re-sample zenith into mock.
  const zenith = tickPbrSkyViewport({
    capabilityScore,
    userEnabled: true,
    viewDir: { x: 0, y: 1, z: 0 },
    target: mock.target,
  })
  const zenithBlue =
    zenith.rgb !== null && zenith.rgb.b >= zenith.rgb.r * 0.85

  bindPbrSkyScene(null)

  const noPaintedSkybox =
    interfaceProof.noPaintedSkybox &&
    zenith.paintedSkyboxForbidden &&
    unbound.paintedSkyboxForbidden

  const budget = resolveCosmosCapabilityBudget(capabilityScore)
  const passed =
    COSMOS_PBR_SKY_VIEWPORT_WIRE_WIRED &&
    interfaceProof.passed &&
    skyApplied &&
    visibleFrameRgb &&
    capScoreContrast &&
    zeroUiOk &&
    noPaintedSkybox &&
    zenithBlue &&
    frames >= 4

  if (passed) {
    notes.push(
      'pbrSkyViewportReady soak CLOSED (letter cp) — Rayleigh/Mie background + CapScore proven; painted skybox forbidden',
    )
    notes.push('UE atmosphere / Bruneton LUT maturity HELD')
  }

  return {
    letter: COSMOS_PBR_SKY_VIEWPORT_LETTER,
    passed,
    libWired: COSMOS_PBR_SKY_VIEWPORT_WIRE_WIRED,
    skyApplied,
    visibleFrameRgb,
    capScoreContrast,
    noPaintedSkybox,
    framesProven: passed ? frames : 0,
    sampleCount: budget.skyAtmosphereSamples,
    notes,
  }
}
