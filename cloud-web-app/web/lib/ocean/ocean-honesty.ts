/**
 * Letter cg — Aethel Ocean honesty (FFT + buoyancy helpers).
 * Letter cm — soak-gated oceanViewportReady (viewport mesh + playtest buoyancy).
 * Letter cq — soak-gated oceanMeshBindReady (OceanRenderPass + explicit volume).
 * Letter cs — soak-gated gpuFftOceanReady (WebGPU compute FFT; gpuFftAllowed HELD).
 */

import { OCEAN_FFT_LETTER, OCEAN_FFT_WIRED, proveOceanFft } from '@/lib/ocean/fft-displacement'
import {
  OCEAN_BUOYANCY_WIRED,
  proveBuoyancyHelpers,
  proveExplicitBuoyancyContrast,
} from '@/lib/ocean/buoyancy'
import { OCEAN_BUOYANCY_VOLUME_WIRED } from '@/lib/ocean/ocean-buoyancy-volume'
import {
  OCEAN_CAPABILITY_BUDGET_WIRED,
  OCEAN_VIEWPORT_OPTIN_WIRED,
  planOceanViewportOptIn,
} from '@/lib/ocean/ocean-capability-budget'
import { OCEAN_VIEWPORT_WIRE_WIRED } from '@/lib/ocean/ocean-viewport-wire'
import {
  OCEAN_PLAYTEST_WIRE_LETTER,
  OCEAN_PLAYTEST_WIRE_WIRED,
  proveOceanViewportSoak,
  type OceanPlaytestSoakResult,
} from '@/lib/ocean/ocean-playtest-wire'
import {
  OCEAN_RENDER_PASS_LETTER,
  OCEAN_RENDER_PASS_WIRED,
  proveOceanMeshBindSoak,
} from '@/lib/ocean/ocean-render-pass'
import {
  GPU_OCEAN_FFT_LETTER,
  GPU_OCEAN_FFT_WIRED,
  getLastGpuOceanFftSoak,
  proveGpuFftOceanReady,
} from '@/lib/ocean/gpu-fft-ocean'

export const OCEAN_WIRED = true as const

let cachedViewportSoak: boolean | undefined
let lastViewportSoak: OceanPlaytestSoakResult | null = null
let cachedMeshBindSoak: boolean | undefined
let lastMeshBindNotes: string[] = []

export interface OceanHonestyReport {
  letter:
    | typeof OCEAN_FFT_LETTER
    | typeof OCEAN_PLAYTEST_WIRE_LETTER
    | typeof OCEAN_RENDER_PASS_LETTER
    | typeof GPU_OCEAN_FFT_LETTER
  wired: boolean
  fftDisplacementReady: boolean
  buoyancyHelpersReady: boolean
  /** cg — planOceanViewportOptIn wiring (not mesh/tick proof). */
  viewportOptInReady: boolean
  /** Soak-gated (cm) — FFT mesh displace + buoyancy apply + CapScore. */
  oceanViewportReady: boolean
  /** Soak-gated (cq) — OceanRenderPass + sun/cloud + explicit buoyancy. */
  oceanMeshBindReady: boolean
  explicitBuoyancyReady: boolean
  /**
   * Soak-gated (cs) — WebGPU compute FFT path proven.
   * Distinct from marketing `gpuFftAllowed` (always false).
   */
  gpuFftOceanReady: boolean
  unrealWaterParityAllowed: false
  /** Marketing / UE Water GPU FFT claim — always HELD. */
  gpuFftAllowed: false
  coinsMarketingAllowed: false
  agonesMarketingAllowed: false
  naniteMarketingAllowed: false
  dlssMarketingAllowed: false
  notes: string[]
}

/**
 * Prove viewport/playtest soak. Letter cm gates oceanViewportReady.
 */
export function proveOceanViewportReady(force = false): boolean {
  if (!force && cachedViewportSoak === true) return true
  const r = proveOceanViewportSoak()
  lastViewportSoak = r
  cachedViewportSoak = r.passed
  return r.passed
}

/**
 * Prove OceanRenderPass mesh bind + light coupling. Letter cq gates oceanMeshBindReady.
 */
export function proveOceanMeshBindReady(force = false): boolean {
  if (!force && cachedMeshBindSoak === true) return true
  const r = proveOceanMeshBindSoak()
  lastMeshBindNotes = r.notes
  cachedMeshBindSoak = r.passed
  return r.passed
}

export function probeOceanHonesty(input?: {
  fftPassed?: boolean
  buoyancyPassed?: boolean
  viewportSoakPassed?: boolean
  meshBindSoakPassed?: boolean
  explicitBuoyancyPassed?: boolean
  gpuFftOceanSoakPassed?: boolean
}): OceanHonestyReport {
  const fft = input?.fftPassed ?? proveOceanFft().passed
  const buoyancy = input?.buoyancyPassed ?? proveBuoyancyHelpers().passed
  const explicit = input?.explicitBuoyancyPassed ?? proveExplicitBuoyancyContrast().passed
  const optIn = planOceanViewportOptIn({
    capabilityScore: 38,
    userEnabled: true,
  })
  const oceanViewportReady =
    input?.viewportSoakPassed ??
    (cachedViewportSoak === undefined ? proveOceanViewportReady() : cachedViewportSoak)
  const oceanMeshBindReady =
    input?.meshBindSoakPassed ??
    (cachedMeshBindSoak === undefined ? proveOceanMeshBindReady() : cachedMeshBindSoak)
  const gpuFftOceanReady =
    input?.gpuFftOceanSoakPassed ??
    (getLastGpuOceanFftSoak()?.passed === true || proveGpuFftOceanReady())
  const letter = gpuFftOceanReady
    ? GPU_OCEAN_FFT_LETTER
    : oceanMeshBindReady
      ? OCEAN_RENDER_PASS_LETTER
      : oceanViewportReady
        ? OCEAN_PLAYTEST_WIRE_LETTER
        : OCEAN_FFT_LETTER
  const lastGpuNotes = getLastGpuOceanFftSoak()?.notes ?? []
  return {
    letter,
    wired:
      OCEAN_WIRED &&
      OCEAN_FFT_WIRED &&
      OCEAN_BUOYANCY_WIRED &&
      OCEAN_BUOYANCY_VOLUME_WIRED &&
      OCEAN_CAPABILITY_BUDGET_WIRED &&
      OCEAN_VIEWPORT_OPTIN_WIRED &&
      OCEAN_VIEWPORT_WIRE_WIRED &&
      OCEAN_PLAYTEST_WIRE_WIRED &&
      OCEAN_RENDER_PASS_WIRED &&
      GPU_OCEAN_FFT_WIRED,
    fftDisplacementReady: fft,
    buoyancyHelpersReady: buoyancy,
    viewportOptInReady: OCEAN_VIEWPORT_OPTIN_WIRED && optIn.enabled,
    oceanViewportReady,
    oceanMeshBindReady,
    explicitBuoyancyReady: explicit,
    gpuFftOceanReady,
    unrealWaterParityAllowed: false,
    gpuFftAllowed: false,
    coinsMarketingAllowed: false,
    agonesMarketingAllowed: false,
    naniteMarketingAllowed: false,
    dlssMarketingAllowed: false,
    notes: [
      ...(lastViewportSoak?.notes ?? []),
      ...lastMeshBindNotes,
      ...lastGpuNotes,
      'Aethel Ocean FFT + buoyancy helpers CLOSED (letter cg)',
      oceanViewportReady
        ? 'oceanViewportReady CLOSED (letter cm) — FFT mesh + Rapier buoyancy playtest soak'
        : 'oceanViewportReady pending soak — cg viewportOptInReady is plan-only',
      oceanMeshBindReady
        ? 'oceanMeshBindReady CLOSED (letter cq) — OceanRenderPass + sun/cloud + OceanBuoyancyVolume'
        : 'oceanMeshBindReady pending soak',
      gpuFftOceanReady
        ? 'gpuFftOceanReady CLOSED (letter cs) — WebGPU compute FFT soak; CPU fallback when GT730/no adapter'
        : 'gpuFftOceanReady pending soak — CPU FFT Zero-UI active',
      'Missing OceanBuoyancyVolume → fail-closed Zero-UI (AABB heuristic HELD)',
      'Gerstner WaterEditor preview remains when FFT opt-in off (Zero-UI)',
      'Honest competitor: Unreal Water / FFT GPU still more mature',
      'gpuFftAllowed marketing + UE Water parity HELD',
      'Coins / Agones / Nanite / DLSS marketing HELD',
    ],
  }
}
