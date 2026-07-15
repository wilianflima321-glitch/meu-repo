/**
 * Letter bt — Radiance Law XV Capability Score budgets (Zero-MVP).
 *
 * GT730 / webgl2 honest: never claim RTX HW RT path. Scales software RT
 * resolution, cascade count, VSM atlas, and volumetric raymarch steps.
 */

export type RadianceTier = 'webgl2' | 'integrated' | 'discrete' | 'enthusiast'

export interface RadianceCapabilityBudget {
  capabilityScore: number
  tier: RadianceTier
  /** Software path-trace resolution scale 0..1 (of viewport). */
  rtResolution: number
  rtSamplesPerPixel: number
  rtMaxBounces: number
  rtDenoiseEnabled: boolean
  /** Allow RayTracingManager in frame loop (software BVH path). */
  rtInFrameAllowed: boolean
  /** Never true on web Capability Score alone — HW RT cores absent. */
  hwRayTracingClaimAllowed: false
  /** Cascade count for cascade+VSM hybrid (1–4). */
  shadowCascades: number
  /** Per-cascade map size; GT730 stays small to avoid VRAM melt. */
  shadowMapSize: number
  /** Virtual shadow atlas edge (0 = cascade-only, no VSM atlas). */
  vsmAtlasSize: number
  shadowTechnique: 'off' | 'cascade' | 'cascade-vsm-hybrid'
  estimatedShadowVramMb: number
  /** Volumetric raymarch primary steps (adaptive). */
  cloudMaxSteps: number
  cloudLightSteps: number
  cloudsInFrameAllowed: boolean
  /** Depth-aware cloud composite against scene depth RT (letter by). */
  depthBlendAllowed: boolean
  /** God-rays post pass — fail-closed on GT730 / webgl2 beauty. */
  godRaysAllowed: boolean
  /** Radial samples for GodRaysPass (Law XV scale). */
  godRaySamples: number
  /** Intensity scale 0..1 for GodRaysPass. */
  godRayIntensity: number
  notes: string[]
}

/** Pure adaptive cloud / god-ray knobs for Vitest (letter by). */
export interface CloudAdaptiveParams {
  capabilityScore: number
  tier: RadianceTier
  cloudMaxSteps: number
  cloudLightSteps: number
  depthBlendAllowed: boolean
  godRaysAllowed: boolean
  godRaySamples: number
  godRayIntensity: number
}

export const RADIANCE_CAPABILITY_BUDGET_WIRED = true as const

export function tierFromRadianceScore(score: number): RadianceTier {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
  if (s >= 75) return 'enthusiast'
  if (s >= 45) return 'discrete'
  if (s >= 20) return 'integrated'
  return 'webgl2'
}

/** Estimate RGBA float shadow atlas VRAM in MiB. */
export function estimateShadowVramMb(cascades: number, mapSize: number, vsmAtlas: number): number {
  const bytesPerTexel = 16 // RGBA Float
  const cascadeBytes = cascades * mapSize * mapSize * bytesPerTexel
  const vsmBytes = vsmAtlas > 0 ? vsmAtlas * vsmAtlas * bytesPerTexel : 0
  return (cascadeBytes + vsmBytes) / (1024 * 1024)
}

/**
 * Law XV degrade: score → radiance knobs.
 * Web ceiling (~62 WebGPU / ~38 WebGL2) never unlocks HW RT marketing.
 */
export function resolveRadianceCapabilityBudget(capabilityScore: number): RadianceCapabilityBudget {
  const score = Number.isFinite(capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(capabilityScore)))
    : 0
  const tier = tierFromRadianceScore(score)
  const notes: string[] = [
    'HW ray tracing claim forbidden on web Capability Score (Law XV / Platform Reality)',
    'GT730 / low score uses adaptive steps + tiny cascades — no VRAM melt',
  ]

  if (tier === 'webgl2') {
    const cascades = 1
    const mapSize = 512
    const vsm = 0
    return {
      capabilityScore: score,
      tier,
      rtResolution: 0.2,
      rtSamplesPerPixel: 1,
      rtMaxBounces: 1,
      rtDenoiseEnabled: false,
      rtInFrameAllowed: false,
      hwRayTracingClaimAllowed: false,
      shadowCascades: cascades,
      shadowMapSize: mapSize,
      vsmAtlasSize: vsm,
      shadowTechnique: 'cascade',
      estimatedShadowVramMb: estimateShadowVramMb(cascades, mapSize, vsm),
      cloudMaxSteps: 8,
      cloudLightSteps: 2,
      cloudsInFrameAllowed: true,
      depthBlendAllowed: true,
      godRaysAllowed: false,
      godRaySamples: 0,
      godRayIntensity: 0,
      notes: [...notes, 'webgl2: RT+god-rays fail-closed; depth blend on; clouds ultra-cheap; single 512 cascade'],
    }
  }

  if (tier === 'integrated') {
    const cascades = 2
    const mapSize = 1024
    const vsm = 0
    return {
      capabilityScore: score,
      tier,
      rtResolution: 0.35,
      rtSamplesPerPixel: 1,
      rtMaxBounces: 2,
      rtDenoiseEnabled: true,
      rtInFrameAllowed: true,
      hwRayTracingClaimAllowed: false,
      shadowCascades: cascades,
      shadowMapSize: mapSize,
      vsmAtlasSize: vsm,
      shadowTechnique: 'cascade',
      estimatedShadowVramMb: estimateShadowVramMb(cascades, mapSize, vsm),
      cloudMaxSteps: 16,
      cloudLightSteps: 3,
      cloudsInFrameAllowed: true,
      depthBlendAllowed: true,
      godRaysAllowed: false,
      godRaySamples: 0,
      godRayIntensity: 0,
      notes: [...notes, 'integrated: software RT low-res + depth blend; god-rays fail-closed (beauty)'],
    }
  }

  if (tier === 'discrete') {
    const cascades = 3
    const mapSize = 1024
    const vsm = 1024
    return {
      capabilityScore: score,
      tier,
      rtResolution: 0.5,
      rtSamplesPerPixel: 1,
      rtMaxBounces: 3,
      rtDenoiseEnabled: true,
      rtInFrameAllowed: true,
      hwRayTracingClaimAllowed: false,
      shadowCascades: cascades,
      shadowMapSize: mapSize,
      vsmAtlasSize: vsm,
      shadowTechnique: 'cascade-vsm-hybrid',
      estimatedShadowVramMb: estimateShadowVramMb(cascades, mapSize, vsm),
      cloudMaxSteps: 32,
      cloudLightSteps: 4,
      cloudsInFrameAllowed: true,
      depthBlendAllowed: true,
      godRaysAllowed: true,
      godRaySamples: 48,
      godRayIntensity: 0.45,
      notes: [...notes, 'discrete: cascade+VSM hybrid + depth blend + adaptive god-rays'],
    }
  }

  // enthusiast (desktop-native scores only — web never reaches here via honest probe)
  const cascades = 4
  const mapSize = 2048
  const vsm = 2048
  return {
    capabilityScore: score,
    tier,
    rtResolution: 0.75,
    rtSamplesPerPixel: 2,
    rtMaxBounces: 4,
    rtDenoiseEnabled: true,
    rtInFrameAllowed: true,
    hwRayTracingClaimAllowed: false,
    shadowCascades: cascades,
    shadowMapSize: mapSize,
    vsmAtlasSize: vsm,
    shadowTechnique: 'cascade-vsm-hybrid',
    estimatedShadowVramMb: estimateShadowVramMb(cascades, mapSize, vsm),
    cloudMaxSteps: 64,
    cloudLightSteps: 6,
    cloudsInFrameAllowed: true,
    depthBlendAllowed: true,
    godRaysAllowed: true,
    godRaySamples: 80,
    godRayIntensity: 0.65,
    notes: [...notes, 'enthusiast budget; HW RT still false; full volumetric AAA marketing forbidden'],
  }
}

/** Extract cloud adaptive slice — Vitest / honesty without GPU. */
export function resolveCloudAdaptiveParams(capabilityScore: number): CloudAdaptiveParams {
  const b = resolveRadianceCapabilityBudget(capabilityScore)
  return {
    capabilityScore: b.capabilityScore,
    tier: b.tier,
    cloudMaxSteps: b.cloudMaxSteps,
    cloudLightSteps: b.cloudLightSteps,
    depthBlendAllowed: b.depthBlendAllowed,
    godRaysAllowed: b.godRaysAllowed,
    godRaySamples: b.godRaySamples,
    godRayIntensity: b.godRayIntensity,
  }
}
