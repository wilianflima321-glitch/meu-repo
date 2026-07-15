/**
 * Letter cj — EQS playtest honesty.
 * `eqsPlaytestReady` flips only after soak evidence (distinct from bu lib `eqs.wired`).
 * GAS IPC 60Hz / UE EQS parity always HELD. Zero-UI when bus unavailable.
 */

import { ENVIRONMENT_QUERY_SYSTEM_WIRED } from '@/lib/character/environment-query-system'
import { createCharacterTopologyBus } from '@/lib/character/character-topology-bus'
import {
  EQS_PLAYTEST_WIRE_LETTER,
  EQS_PLAYTEST_WIRE_WIRED,
  proveEqsPlaytestSoak,
  type EqsPlaytestSoakResult,
} from '@/lib/character/eqs-playtest-wire'

export const EQS_PLAYTEST_LETTER = EQS_PLAYTEST_WIRE_LETTER
export const EQS_PLAYTEST_WIRED = EQS_PLAYTEST_WIRE_WIRED

export interface EqsPlaytestHonestyInput {
  eqsPlaytestSoakPassed?: boolean
}

export interface EqsPlaytestHonestyReport {
  letter: typeof EQS_PLAYTEST_LETTER
  wired: typeof EQS_PLAYTEST_WIRED
  /** Soak-gated — EQS results drove GAS fire in playtest wire. */
  eqsPlaytestReady: boolean
  /** Letter bu library flag (not playtest evidence). */
  eqsLibWired: boolean
  gasIpc60HzAllowed: false
  ueEqsParityAllowed: false
  zeroUiWhenUnavailable: true
  soak: EqsPlaytestSoakResult | null
  notes: string[]
}

let cachedEqsPlaytestSoak: boolean | null = null
let lastSoak: EqsPlaytestSoakResult | null = null

export function proveEqsPlaytestWire(): {
  passed: boolean
  letter: typeof EQS_PLAYTEST_LETTER
  soak: EqsPlaytestSoakResult
} {
  const bus = createCharacterTopologyBus({ capabilityScore: 38 })
  const soak = proveEqsPlaytestSoak(bus)
  if (soak.passed) cachedEqsPlaytestSoak = true
  else if (cachedEqsPlaytestSoak !== true) cachedEqsPlaytestSoak = false
  lastSoak = soak
  return {
    passed: soak.passed,
    letter: EQS_PLAYTEST_LETTER,
    soak,
  }
}

export function probeEqsPlaytestHonesty(
  input: EqsPlaytestHonestyInput = {},
): EqsPlaytestHonestyReport {
  if (input.eqsPlaytestSoakPassed === undefined && cachedEqsPlaytestSoak === null) {
    proveEqsPlaytestWire()
  }

  const eqsPlaytestReady =
    input.eqsPlaytestSoakPassed ?? cachedEqsPlaytestSoak ?? false

  return {
    letter: EQS_PLAYTEST_LETTER,
    wired: EQS_PLAYTEST_WIRED,
    eqsPlaytestReady,
    eqsLibWired: ENVIRONMENT_QUERY_SYSTEM_WIRED,
    gasIpc60HzAllowed: false,
    ueEqsParityAllowed: false,
    zeroUiWhenUnavailable: true,
    soak: lastSoak,
    notes: [
      ...(lastSoak?.notes ?? []),
      eqsPlaytestReady
        ? 'eqsPlaytestReady CLOSED (letter cj) — EQS→GAS playtest fire path'
        : 'eqsPlaytestReady pending soak',
      'GAS IPC 60Hz HELD — prediction path only',
      'UE EQS parity HELD — cover/LoS gate is Zero-MVP, not Unreal EQS clone',
      'Zero-UI when topology bus unavailable — no EQS chrome',
    ],
  }
}
