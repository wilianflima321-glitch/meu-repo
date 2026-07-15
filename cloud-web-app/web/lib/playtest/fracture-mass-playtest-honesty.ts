/**
 * Letter cy — Fracture + Mass ECS playtest honesty.
 * `fractureMassPlaytestReady` flips only after playtest soak evidence
 * (distinct from cv `gpuFractureReady` / cw `gpuMassEcsReady`).
 * Chaos / 100k / Unreal Mass / Coins / Agones / Nanite / DLSS always HELD.
 */

import {
  FRACTURE_MASS_PLAYTEST_LETTER,
  FRACTURE_MASS_PLAYTEST_WIRED,
  proveFractureMassPlaytestSoak,
  type FractureMassPlaytestSoakResult,
} from '@/lib/playtest/fracture-mass-playtest-wire'
import { GPU_FRACTURE_WIRED } from '@/lib/destruction/gpu-fracture'
import { GPU_MASS_ECS_WIRED } from '@/lib/mass-ecs/gpu-mass-step'

export const FRACTURE_MASS_PLAYTEST_HONESTY_LETTER = FRACTURE_MASS_PLAYTEST_LETTER
export const FRACTURE_MASS_PLAYTEST_HONESTY_WIRED = FRACTURE_MASS_PLAYTEST_WIRED

export interface FractureMassPlaytestHonestyInput {
  fractureMassPlaytestSoakPassed?: boolean
}

export interface FractureMassPlaytestHonestyReport {
  letter: typeof FRACTURE_MASS_PLAYTEST_LETTER
  wired: typeof FRACTURE_MASS_PLAYTEST_WIRED
  /** Soak-gated — playtest hot path ran fracture + mass steps. */
  fractureMassPlaytestReady: boolean
  /** Letter cv library flag (not playtest evidence). */
  gpuFractureLibWired: boolean
  /** Letter cw library flag (not playtest evidence). */
  gpuMassEcsLibWired: boolean
  chaosParityAllowed: false
  mass100kClaimAllowed: false
  unrealMassParityAllowed: false
  coinsReady: false
  agonesReady: false
  naniteReady: false
  dlssReady: false
  zeroUiWhenUnavailable: true
  soak: FractureMassPlaytestSoakResult | null
  notes: string[]
}

let cachedPlaytestSoak: boolean | null = null
let lastSoak: FractureMassPlaytestSoakResult | null = null

export function proveFractureMassPlaytestWire(input?: {
  capabilityScore?: number
  withGpuMocks?: boolean
}): {
  passed: boolean
  letter: typeof FRACTURE_MASS_PLAYTEST_LETTER
  soak: FractureMassPlaytestSoakResult
} {
  const soak = proveFractureMassPlaytestSoak({
    capabilityScore: input?.capabilityScore ?? 38,
    withGpuMocks: input?.withGpuMocks,
    frames: 4,
  })
  if (soak.passed) cachedPlaytestSoak = true
  else if (cachedPlaytestSoak !== true) cachedPlaytestSoak = false
  lastSoak = soak
  return {
    passed: soak.passed,
    letter: FRACTURE_MASS_PLAYTEST_LETTER,
    soak,
  }
}

export function proveFractureMassPlaytestReady(force = false): boolean {
  if (!force && cachedPlaytestSoak === true) return true
  if (!force && lastSoak) return lastSoak.passed
  const { passed } = proveFractureMassPlaytestWire()
  return passed
}

export function probeFractureMassPlaytestHonesty(
  input: FractureMassPlaytestHonestyInput = {},
): FractureMassPlaytestHonestyReport {
  if (
    input.fractureMassPlaytestSoakPassed === undefined &&
    cachedPlaytestSoak === null
  ) {
    proveFractureMassPlaytestWire()
  }

  const fractureMassPlaytestReady =
    input.fractureMassPlaytestSoakPassed ?? cachedPlaytestSoak ?? false

  return {
    letter: FRACTURE_MASS_PLAYTEST_LETTER,
    wired: FRACTURE_MASS_PLAYTEST_WIRED,
    fractureMassPlaytestReady,
    gpuFractureLibWired: GPU_FRACTURE_WIRED,
    gpuMassEcsLibWired: GPU_MASS_ECS_WIRED,
    chaosParityAllowed: false,
    mass100kClaimAllowed: false,
    unrealMassParityAllowed: false,
    coinsReady: false,
    agonesReady: false,
    naniteReady: false,
    dlssReady: false,
    zeroUiWhenUnavailable: true,
    soak: lastSoak,
    notes: [
      ...(lastSoak?.notes ?? []),
      fractureMassPlaytestReady
        ? 'fractureMassPlaytestReady CLOSED (letter cy) — SimulationTick/GameLoop fracture+mass playtest path'
        : 'fractureMassPlaytestReady pending soak',
      'Distinct from cv gpuFractureReady / cw gpuMassEcsReady — library soaks unchanged',
      'Chaos parity HELD — Fortune 3D / Niagara not claimed',
      '100k / Unreal Mass parity HELD',
      'Coins / Agones / Nanite / DLSS HELD',
      'Zero-UI when playtest flag off / CapScore GT730 CPU fallback',
    ],
  }
}

/** Test helper — clear soak cache between suites. */
export function resetFractureMassPlaytestHonestyCache(): void {
  cachedPlaytestSoak = null
  lastSoak = null
}
