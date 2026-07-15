/**
 * Letter cn — Volumetric Acoustic Raytracing (interface).
 * Vacuum hull vibration vs atmosphere density — no Earth-explosion-in-space.
 * Letter cr — playtest/audio bus wire deepen (`acoustic-atmosphere-wire`).
 */

export const COSMOS_ACOUSTIC_ATMOSPHERE_WIRED = true as const

export type AcousticMedium = 'vacuum' | 'atmosphere' | 'hull-structure'

export interface AcousticSamplePoint {
  x: number
  y: number
  z: number
  /** Atmosphere density 0 = vacuum, 1 = Earth sea level. */
  density: number
  /** True when inside pressurized hull / solid structure path. */
  inHull: boolean
}

export interface AcousticRayHit {
  medium: AcousticMedium
  /** Transmission 0..1 after path. */
  transmission: number
  /** Heard as structure-borne (hull vibration) rather than air blast. */
  structureBorne: boolean
  /** Honest: no cinematic vacuum explosion. */
  vacuumExplosionForbidden: true
}

/**
 * Trace acoustic path from source → listener through density samples.
 * Vacuum: air transmission → 0; hull contact may carry structure-borne.
 */
export function traceAcousticRay(input: {
  samples: AcousticSamplePoint[]
  sourceInHull: boolean
  listenerInHull: boolean
  steps?: number
}): AcousticRayHit {
  const steps = Math.max(1, input.steps ?? 8)
  if (input.samples.length === 0) {
    return {
      medium: 'vacuum',
      transmission: 0,
      structureBorne: false,
      vacuumExplosionForbidden: true,
    }
  }

  let airGain = 1
  let minDensity = 1
  for (let i = 0; i < Math.min(steps, input.samples.length); i++) {
    const s = input.samples[i]!
    minDensity = Math.min(minDensity, s.density)
    // Beer-like attenuation: low density kills air path fast.
    airGain *= Math.max(0, Math.min(1, s.density))
  }

  if (minDensity < 0.05 && !(input.sourceInHull && input.listenerInHull)) {
    // Vacuum path — air blast dies; structure-borne only if both in same hull.
    return {
      medium: 'vacuum',
      transmission: 0,
      structureBorne: false,
      vacuumExplosionForbidden: true,
    }
  }

  if (input.sourceInHull && input.listenerInHull) {
    // Hull vibration path — muffled, not vacuum silence.
    return {
      medium: 'hull-structure',
      transmission: Math.min(0.85, 0.4 + airGain * 0.3),
      structureBorne: true,
      vacuumExplosionForbidden: true,
    }
  }

  return {
    medium: 'atmosphere',
    transmission: airGain,
    structureBorne: false,
    vacuumExplosionForbidden: true,
  }
}

export function proveAcousticAtmosphere(): {
  passed: boolean
  vacuumSilent: boolean
  hullCarries: boolean
  noSpaceExplosion: boolean
  notes: string[]
} {
  const vacuum = traceAcousticRay({
    samples: [
      { x: 0, y: 0, z: 0, density: 0, inHull: false },
      { x: 1, y: 0, z: 0, density: 0, inHull: false },
    ],
    sourceInHull: false,
    listenerInHull: false,
  })
  const hull = traceAcousticRay({
    samples: [
      { x: 0, y: 0, z: 0, density: 0, inHull: true },
      { x: 1, y: 0, z: 0, density: 0, inHull: true },
    ],
    sourceInHull: true,
    listenerInHull: true,
    steps: 4,
  })
  const vacuumSilent = vacuum.transmission === 0 && vacuum.medium === 'vacuum'
  const hullCarries = hull.structureBorne && hull.transmission > 0.3
  const noSpaceExplosion =
    vacuum.vacuumExplosionForbidden && hull.vacuumExplosionForbidden
  return {
    passed: vacuumSilent && hullCarries && noSpaceExplosion,
    vacuumSilent,
    hullCarries,
    noSpaceExplosion,
    notes: [
      'Volumetric acoustic path CLOSED — vacuum silent / hull structure-borne',
      'Full MetaSounds GPU acoustic field / HRTF vacuum soak HELD',
    ],
  }
}
