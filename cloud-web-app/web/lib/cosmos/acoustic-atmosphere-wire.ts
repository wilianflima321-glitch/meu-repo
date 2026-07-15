/**
 * Letter cr — Volumetric Acoustic Atmosphere → playtest/audio bus wire.
 * (Letter cq = Ocean Mesh Bind + Explicit Buoyancy — do not reuse.)
 * Deepen of cn acoustic interface: vacuum silent / hull vibration / density wet air
 * lands on a real bus gain path when cosmos enabled.
 * Zero-UI when unbound, cosmos off, or opt-out. Full HRTF AAA / MetaSounds GPU field HELD.
 */

import {
  proveAcousticAtmosphere,
  traceAcousticRay,
  type AcousticMedium,
  type AcousticRayHit,
  type AcousticSamplePoint,
} from '@/lib/cosmos/acoustic-atmosphere'
import { resolveCosmosCapabilityBudget } from '@/lib/cosmos/cosmos-capability-budget'

export const COSMOS_ACOUSTIC_ATMOSPHERE_LETTER = 'cr' as const
export const COSMOS_ACOUSTIC_ATMOSPHERE_WIRE_WIRED = true as const

/**
 * Duck-typed playtest / Web Audio bus — GainNode-like or mock soak target.
 * Must not claim HRTF AAA / MetaSounds GPU field as shipped.
 */
export interface AcousticAudioBusTarget {
  setTransmissionGain: (gain: number) => void
  setWetGain?: (gain: number) => void
  setStructureBorne?: (structureBorne: boolean) => void
  setMedium?: (medium: AcousticMedium) => void
  lastTransmissionGain?: number
  lastWetGain?: number
  lastStructureBorne?: boolean
  lastMedium?: AcousticMedium
}

export interface AcousticAtmosphereApplyResult {
  letter: typeof COSMOS_ACOUSTIC_ATMOSPHERE_LETTER
  applied: boolean
  /** True when no bus bound / cosmos off / opt-out — silent Zero-UI (not an error). */
  zeroUiUnavailable: boolean
  rayTraced: boolean
  raySteps: number
  transmission: number
  wetGain: number
  structureBorne: boolean
  medium: AcousticMedium | null
  vacuumExplosionForbidden: true
  /** Full HRTF AAA must never be claimed by this wire. */
  hrtfAaaForbidden: true
}

let boundBus: AcousticAudioBusTarget | null = null
let lastApply: AcousticAtmosphereApplyResult | null = null

export function bindAcousticAudioBus(target: AcousticAudioBusTarget | null): void {
  boundBus = target
}

export function getAcousticAudioBus(): AcousticAudioBusTarget | null {
  return boundBus
}

export function getLastAcousticAtmosphereApply(): AcousticAtmosphereApplyResult | null {
  return lastApply
}

/** Map ray hit → dry transmission + wet/air send (atmosphere denser → wetter). */
export function mapAcousticHitToGains(hit: AcousticRayHit): {
  transmission: number
  wetGain: number
} {
  if (hit.medium === 'vacuum') {
    return { transmission: 0, wetGain: 0 }
  }
  if (hit.medium === 'hull-structure') {
    return {
      transmission: hit.transmission,
      wetGain: Math.min(0.08, hit.transmission * 0.1),
    }
  }
  return {
    transmission: hit.transmission,
    wetGain: Math.min(0.55, hit.transmission * 0.4),
  }
}

/**
 * Wrap a Web Audio GainNode (or GainNode-like) so cosmos acoustic can set transmission.
 * Optional wetGainParam maps atmosphere density → reverb/wet send.
 */
export function wrapWebAudioGainForAcoustic(
  gainParam: { value: number },
  wetGainParam?: { value: number } | null,
): AcousticAudioBusTarget {
  const target: AcousticAudioBusTarget = {
    setTransmissionGain(gain) {
      const g = Math.max(0, Math.min(1, gain))
      gainParam.value = g
      target.lastTransmissionGain = g
    },
    setWetGain(gain) {
      const g = Math.max(0, Math.min(1, gain))
      if (wetGainParam) wetGainParam.value = g
      target.lastWetGain = g
    },
    setStructureBorne(structureBorne) {
      target.lastStructureBorne = structureBorne
    },
    setMedium(medium) {
      target.lastMedium = medium
    },
  }
  return target
}

function emptyResult(steps: number): AcousticAtmosphereApplyResult {
  return {
    letter: COSMOS_ACOUSTIC_ATMOSPHERE_LETTER,
    applied: false,
    zeroUiUnavailable: true,
    rayTraced: false,
    raySteps: steps,
    transmission: 0,
    wetGain: 0,
    structureBorne: false,
    medium: null,
    vacuumExplosionForbidden: true,
    hrtfAaaForbidden: true,
  }
}

/**
 * Trace acoustic path and write transmission (+ wet) into the audio bus.
 * Forbidden: Earth-explosion-in-space / vacuum air blast as default.
 */
export function applyAcousticToBus(input: {
  capabilityScore: number
  samples: AcousticSamplePoint[]
  sourceInHull: boolean
  listenerInHull: boolean
  target?: AcousticAudioBusTarget | null
}): AcousticAtmosphereApplyResult {
  const target = input.target !== undefined ? input.target : boundBus
  const budget = resolveCosmosCapabilityBudget(input.capabilityScore)
  const steps = budget.acousticRaySteps

  if (!target || typeof target.setTransmissionGain !== 'function') {
    const r = emptyResult(steps)
    lastApply = r
    return r
  }

  const hit: AcousticRayHit = traceAcousticRay({
    samples: input.samples,
    sourceInHull: input.sourceInHull,
    listenerInHull: input.listenerInHull,
    steps,
  })
  const { transmission, wetGain } = mapAcousticHitToGains(hit)

  target.setTransmissionGain(transmission)
  target.lastTransmissionGain = transmission
  target.setWetGain?.(wetGain)
  target.lastWetGain = wetGain
  target.setStructureBorne?.(hit.structureBorne)
  target.lastStructureBorne = hit.structureBorne
  target.setMedium?.(hit.medium)
  target.lastMedium = hit.medium

  const result: AcousticAtmosphereApplyResult = {
    letter: COSMOS_ACOUSTIC_ATMOSPHERE_LETTER,
    applied: true,
    zeroUiUnavailable: false,
    rayTraced: true,
    raySteps: steps,
    transmission,
    wetGain,
    structureBorne: hit.structureBorne,
    medium: hit.medium,
    vacuumExplosionForbidden: true,
    hrtfAaaForbidden: true,
  }
  lastApply = result
  return result
}

/**
 * CapScore-gated acoustic apply. userEnabled/cosmosEnabled false → Zero-UI no-op.
 */
export function tickAcousticAtmosphere(input: {
  capabilityScore: number
  userEnabled: boolean
  cosmosEnabled: boolean
  samples: AcousticSamplePoint[]
  sourceInHull: boolean
  listenerInHull: boolean
  target?: AcousticAudioBusTarget | null
}): AcousticAtmosphereApplyResult {
  if (!input.userEnabled || !input.cosmosEnabled) {
    const budget = resolveCosmosCapabilityBudget(input.capabilityScore)
    const r = emptyResult(budget.acousticRaySteps)
    lastApply = r
    return r
  }
  return applyAcousticToBus({
    capabilityScore: input.capabilityScore,
    samples: input.samples,
    sourceInHull: input.sourceInHull,
    listenerInHull: input.listenerInHull,
    target: input.target,
  })
}

/** Test / IDE helper — mutable transmission + wet sink (no AudioContext required). */
export function createAcousticMockBus(): {
  target: AcousticAudioBusTarget
  getGain: () => number | null
  getWet: () => number | null
  getStructureBorne: () => boolean | null
  getMedium: () => AcousticMedium | null
} {
  let gain: number | null = null
  let wet: number | null = null
  let structureBorne: boolean | null = null
  let medium: AcousticMedium | null = null
  const target: AcousticAudioBusTarget = {
    setTransmissionGain(g) {
      gain = g
      target.lastTransmissionGain = g
    },
    setWetGain(g) {
      wet = g
      target.lastWetGain = g
    },
    setStructureBorne(s) {
      structureBorne = s
      target.lastStructureBorne = s
    },
    setMedium(m) {
      medium = m
      target.lastMedium = m
    },
  }
  return {
    target,
    getGain: () => gain,
    getWet: () => wet,
    getStructureBorne: () => structureBorne,
    getMedium: () => medium,
  }
}

export function buildVacuumAcousticSamples(): AcousticSamplePoint[] {
  return [
    { x: 0, y: 0, z: 0, density: 0, inHull: false },
    { x: 1, y: 0, z: 0, density: 0, inHull: false },
    { x: 2, y: 0, z: 0, density: 0, inHull: false },
    { x: 3, y: 0, z: 0, density: 0, inHull: false },
  ]
}

export function buildAtmosphereAcousticSamples(density = 1): AcousticSamplePoint[] {
  const d = Math.max(0, Math.min(1, density))
  return [
    { x: 0, y: 0, z: 0, density: d, inHull: false },
    { x: 1, y: 0, z: 0, density: d, inHull: false },
    { x: 2, y: 0, z: 0, density: d * 0.95, inHull: false },
    { x: 3, y: 0, z: 0, density: d * 0.9, inHull: false },
  ]
}

export function buildHullAcousticSamples(): AcousticSamplePoint[] {
  return [
    { x: 0, y: 0, z: 0, density: 0, inHull: true },
    { x: 1, y: 0, z: 0, density: 0, inHull: true },
    { x: 2, y: 0, z: 0, density: 0, inHull: true },
    { x: 3, y: 0, z: 0, density: 0, inHull: true },
  ]
}

/** CapScore contrast — GT730 fewer acoustic ray steps than enthusiast. */
export function proveAcousticCapScoreStepContrast(): {
  passed: boolean
  lowSteps: number
  highSteps: number
} {
  const low = resolveCosmosCapabilityBudget(12)
  const high = resolveCosmosCapabilityBudget(80)
  return {
    passed:
      low.acousticRaySteps < high.acousticRaySteps &&
      low.acousticRaySteps === 4 &&
      low.tier === 'gt730',
    lowSteps: low.acousticRaySteps,
    highSteps: high.acousticRaySteps,
  }
}

export interface AcousticAtmosphereSoakResult {
  letter: typeof COSMOS_ACOUSTIC_ATMOSPHERE_LETTER
  passed: boolean
  libWired: boolean
  vacuumSilentOnBus: boolean
  hullCarriesOnBus: boolean
  atmosphereWetOnBus: boolean
  capScoreContrast: boolean
  noSpaceExplosion: boolean
  framesProven: number
  raySteps: number
  notes: string[]
}

/**
 * Multi-frame soak: vacuum/hull/atmosphere transmission lands on audio bus + CapScore.
 * Gates `acousticAtmosphereReady` (cr deepen of cn acoustic interface).
 */
export function proveAcousticAtmosphereSoak(
  capabilityScore = 38,
): AcousticAtmosphereSoakResult {
  const notes: string[] = []
  const mock = createAcousticMockBus()
  bindAcousticAudioBus(mock.target)

  const interfaceProof = proveAcousticAtmosphere()
  if (!interfaceProof.passed || !interfaceProof.noSpaceExplosion) {
    notes.push('cn acoustic interface regress')
  }

  let frames = 0
  let vacuumSilentOnBus = false
  let hullCarriesOnBus = false
  let atmosphereWetOnBus = false

  const vacuumTick = tickAcousticAtmosphere({
    capabilityScore,
    userEnabled: true,
    cosmosEnabled: true,
    samples: buildVacuumAcousticSamples(),
    sourceInHull: false,
    listenerInHull: false,
    target: mock.target,
  })
  frames += 1
  if (
    vacuumTick.applied &&
    vacuumTick.rayTraced &&
    vacuumTick.transmission === 0 &&
    vacuumTick.wetGain === 0 &&
    vacuumTick.medium === 'vacuum' &&
    mock.getGain() === 0
  ) {
    vacuumSilentOnBus = true
  }

  const hullTick = tickAcousticAtmosphere({
    capabilityScore,
    userEnabled: true,
    cosmosEnabled: true,
    samples: buildHullAcousticSamples(),
    sourceInHull: true,
    listenerInHull: true,
    target: mock.target,
  })
  frames += 1
  if (
    hullTick.applied &&
    hullTick.structureBorne &&
    hullTick.transmission > 0.3 &&
    hullTick.medium === 'hull-structure' &&
    (mock.getGain() ?? 0) > 0.3
  ) {
    hullCarriesOnBus = true
  }

  const airTick = tickAcousticAtmosphere({
    capabilityScore,
    userEnabled: true,
    cosmosEnabled: true,
    samples: buildAtmosphereAcousticSamples(1),
    sourceInHull: false,
    listenerInHull: false,
    target: mock.target,
  })
  frames += 1
  if (
    airTick.applied &&
    airTick.medium === 'atmosphere' &&
    airTick.transmission > 0.5 &&
    airTick.wetGain > 0 &&
    !airTick.structureBorne &&
    (mock.getGain() ?? 0) > 0.5
  ) {
    atmosphereWetOnBus = true
  }

  const thinTick = tickAcousticAtmosphere({
    capabilityScore,
    userEnabled: true,
    cosmosEnabled: true,
    samples: buildAtmosphereAcousticSamples(0.4),
    sourceInHull: false,
    listenerInHull: false,
    target: mock.target,
  })
  frames += 1
  if (!(thinTick.applied && thinTick.vacuumExplosionForbidden)) {
    notes.push('thin atmosphere must remain vacuumExplosionForbidden')
  }

  if (!vacuumSilentOnBus) {
    notes.push('bus soak failed — vacuum must write transmission 0')
  }
  if (!hullCarriesOnBus) {
    notes.push('bus soak failed — hull must carry structure-borne gain')
  }
  if (!atmosphereWetOnBus) {
    notes.push('bus soak failed — atmosphere must write wet air transmission')
  }

  const contrast = proveAcousticCapScoreStepContrast()
  const lowTick = tickAcousticAtmosphere({
    capabilityScore: 12,
    userEnabled: true,
    cosmosEnabled: true,
    samples: buildAtmosphereAcousticSamples(1),
    sourceInHull: false,
    listenerInHull: false,
    target: createAcousticMockBus().target,
  })
  const highTick = tickAcousticAtmosphere({
    capabilityScore: 80,
    userEnabled: true,
    cosmosEnabled: true,
    samples: buildAtmosphereAcousticSamples(1),
    sourceInHull: false,
    listenerInHull: false,
    target: createAcousticMockBus().target,
  })
  const capScoreContrast =
    contrast.passed &&
    lowTick.raySteps < highTick.raySteps &&
    lowTick.applied &&
    highTick.applied

  if (!capScoreContrast) {
    notes.push('CapScore contrast soak failed — GT730 acousticRaySteps should be tighter')
  }

  const unbound = applyAcousticToBus({
    capabilityScore,
    samples: buildVacuumAcousticSamples(),
    sourceInHull: false,
    listenerInHull: false,
    target: null,
  })
  const off = tickAcousticAtmosphere({
    capabilityScore,
    userEnabled: false,
    cosmosEnabled: true,
    samples: buildAtmosphereAcousticSamples(1),
    sourceInHull: false,
    listenerInHull: false,
    target: mock.target,
  })
  const cosmosOff = tickAcousticAtmosphere({
    capabilityScore,
    userEnabled: true,
    cosmosEnabled: false,
    samples: buildAtmosphereAcousticSamples(1),
    sourceInHull: false,
    listenerInHull: false,
    target: mock.target,
  })
  const zeroUiOk =
    unbound.zeroUiUnavailable &&
    off.zeroUiUnavailable &&
    !off.applied &&
    cosmosOff.zeroUiUnavailable &&
    !cosmosOff.applied
  if (!zeroUiOk) {
    notes.push('Zero-UI fail — unbound / opt-out / cosmos-off must silent no-op')
  }

  bindAcousticAudioBus(null)

  const noSpaceExplosion =
    interfaceProof.noSpaceExplosion &&
    vacuumTick.vacuumExplosionForbidden &&
    hullTick.vacuumExplosionForbidden &&
    airTick.vacuumExplosionForbidden &&
    unbound.hrtfAaaForbidden

  const budget = resolveCosmosCapabilityBudget(capabilityScore)
  const passed =
    COSMOS_ACOUSTIC_ATMOSPHERE_WIRE_WIRED &&
    interfaceProof.passed &&
    vacuumSilentOnBus &&
    hullCarriesOnBus &&
    atmosphereWetOnBus &&
    capScoreContrast &&
    zeroUiOk &&
    noSpaceExplosion &&
    frames >= 4

  if (passed) {
    notes.push(
      'acousticAtmosphereReady soak CLOSED (letter cr) — vacuum/hull/atmosphere bus gain + CapScore proven; space explosion forbidden',
    )
    notes.push('Full HRTF AAA / MetaSounds GPU acoustic field HELD')
  }

  return {
    letter: COSMOS_ACOUSTIC_ATMOSPHERE_LETTER,
    passed,
    libWired: COSMOS_ACOUSTIC_ATMOSPHERE_WIRE_WIRED,
    vacuumSilentOnBus,
    hullCarriesOnBus,
    atmosphereWetOnBus,
    capScoreContrast,
    noSpaceExplosion,
    framesProven: passed ? frames : 0,
    raySteps: budget.acousticRaySteps,
    notes,
  }
}
