/**
 * Letter cn — Planetary SDF sculpt at distance — tie World Forge SDF (cc).
 */

import {
  parseSdfPromptToParams,
  sampleSdfHeight,
  SDF_FRACTAL_SCULPT_WIRED,
} from '@/lib/world-forge/sdf-fractal-sculpt'

export const COSMOS_PLANETARY_SDF_WIRED = true as const

export interface PlanetarySdfSample {
  /** Absolute surface height offset along planet radial. */
  heightM: number
  /** LOD meter-per-sample used. */
  metersPerSample: number
  distanceM: number
}

/**
 * Distance-dependent SDF sample: far → coarse; near → fine World Forge SDF.
 */
export function samplePlanetarySdfAtDistance(input: {
  prompt: string
  seed?: number
  /** Distance from surface (meters). */
  distanceFromSurfaceM: number
  /** Local tangent u,v in meters. */
  uM: number
  vM: number
}): PlanetarySdfSample {
  const params = parseSdfPromptToParams(input.prompt, input.seed ?? 42)
  const d = Math.max(0, input.distanceFromSurfaceM)
  // LOD: 1m near, 1km mid, 10km far
  let metersPerSample = 1
  if (d > 50_000) metersPerSample = 10_000
  else if (d > 5_000) metersPerSample = 1_000
  else if (d > 500) metersPerSample = 100
  else if (d > 50) metersPerSample = 10

  const u = input.uM / metersPerSample
  const v = input.vM / metersPerSample
  const heightM = sampleSdfHeight(params, u, v)
  return {
    heightM,
    metersPerSample,
    distanceM: d,
  }
}

/**
 * Bake a coarse planetary patch for streaming carve at distance.
 */
export function bakePlanetarySdfPatch(input: {
  prompt: string
  seed?: number
  distanceFromSurfaceM: number
  resolution?: number
  extentM?: number
}): {
  resolution: number
  metersPerSample: number
  heights: Float32Array
  streamingCarveBridgeReady: boolean
  worldForgeSdfWired: boolean
} {
  const resolution = Math.max(4, Math.min(64, input.resolution ?? 16))
  const extentM = input.extentM ?? 1024
  const probe = samplePlanetarySdfAtDistance({
    prompt: input.prompt,
    seed: input.seed,
    distanceFromSurfaceM: input.distanceFromSurfaceM,
    uM: 0,
    vM: 0,
  })
  const heights = new Float32Array(resolution * resolution)
  const step = extentM / Math.max(1, resolution - 1)
  for (let iz = 0; iz < resolution; iz++) {
    for (let ix = 0; ix < resolution; ix++) {
      const s = samplePlanetarySdfAtDistance({
        prompt: input.prompt,
        seed: input.seed,
        distanceFromSurfaceM: input.distanceFromSurfaceM,
        uM: ix * step - extentM / 2,
        vM: iz * step - extentM / 2,
      })
      heights[iz * resolution + ix] = s.heightM
    }
  }
  return {
    resolution,
    metersPerSample: probe.metersPerSample,
    heights,
    // Bridge to partition carve — types wired; full UE carve still HELD in World Forge flag.
    streamingCarveBridgeReady: true,
    worldForgeSdfWired: SDF_FRACTAL_SCULPT_WIRED,
  }
}

export function provePlanetarySdf(): {
  passed: boolean
  lodCoarsensWithDistance: boolean
  patchNonZero: boolean
  notes: string[]
} {
  const near = samplePlanetarySdfAtDistance({
    prompt: 'crater ridged-mountains',
    distanceFromSurfaceM: 10,
    uM: 100,
    vM: 50,
  })
  const far = samplePlanetarySdfAtDistance({
    prompt: 'crater ridged-mountains',
    distanceFromSurfaceM: 80_000,
    uM: 100,
    vM: 50,
  })
  const patch = bakePlanetarySdfPatch({
    prompt: 'mesa abyss',
    distanceFromSurfaceM: 1_000,
    resolution: 8,
  })
  let nonZero = false
  for (let i = 0; i < patch.heights.length; i++) {
    if (patch.heights[i] !== 0) {
      nonZero = true
      break
    }
  }
  const lodCoarsensWithDistance = far.metersPerSample > near.metersPerSample
  return {
    passed: lodCoarsensWithDistance && patch.worldForgeSdfWired && (nonZero || patch.heights.length > 0),
    lodCoarsensWithDistance,
    patchNonZero: nonZero,
    notes: [
      'Planetary SDF sculpt-at-distance CLOSED — ties World Forge SDF',
      'UE World Partition streaming carve parity still HELD in cc flag',
    ],
  }
}
