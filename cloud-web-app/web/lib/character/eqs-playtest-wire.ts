/**
 * Letter cj — EQS → GAS playtest wire (Zero-MVP).
 * Cover/LoS EQS results gate AI ability fire on SimulationTick / BT / topology bus.
 * Not lib-only: real callers fire `predictFireball` when LoS allows.
 */

import {
  runEnvironmentQuery,
  shouldFireAbilityAfterEqs,
  type EqsQueryInput,
  type EqsQueryResult,
  type EqsWorldPoint,
  ENVIRONMENT_QUERY_SYSTEM_WIRED,
} from '@/lib/character/environment-query-system'
import type { CharacterTopologyBus } from '@/lib/character/character-topology-bus'
import type { PredictedAbilityActivation } from '@/lib/character/gas-client-prediction'

export const EQS_PLAYTEST_WIRE_LETTER = 'cj' as const
export const EQS_PLAYTEST_WIRE_WIRED = true as const

export interface EqsNpcFireDecision {
  eqs: EqsQueryResult
  gate: {
    fireNow: boolean
    relocateTo: EqsWorldPoint | null
  }
}

export interface EqsGasFireTickResult {
  fired: boolean
  activation: PredictedAbilityActivation | null
  relocateTo: EqsWorldPoint | null
  decision: EqsNpcFireDecision
  /** Zero-UI: bus/topology unavailable → silent no-op. */
  zeroUiUnavailable: boolean
}

/**
 * Run los-fire (or cover/flee) EQS and produce GAS fire/relocate gate.
 */
export function runNpcEqsFireDecision(input: EqsQueryInput): EqsNpcFireDecision {
  const eqs = runEnvironmentQuery(input)
  const gate = shouldFireAbilityAfterEqs(eqs)
  return { eqs, gate }
}

/**
 * Apply EQS gate to topology bus GAS prediction.
 * fireNow → predictFireball; else return relocate without firing.
 */
export function tickEqsGasFireForAgent(
  bus: CharacterTopologyBus | null | undefined,
  frame: number,
  decision: EqsNpcFireDecision,
): EqsGasFireTickResult {
  if (!bus) {
    return {
      fired: false,
      activation: null,
      relocateTo: decision.gate.relocateTo,
      decision,
      zeroUiUnavailable: true,
    }
  }

  if (decision.gate.fireNow) {
    const activation = bus.predictFireball(frame)
    return {
      fired: activation !== null,
      activation,
      relocateTo: null,
      decision,
      zeroUiUnavailable: false,
    }
  }

  return {
    fired: false,
    activation: null,
    relocateTo: decision.gate.relocateTo,
    decision,
    zeroUiUnavailable: false,
  }
}

/**
 * One-shot: EQS query → gate → optional GAS fire on bus.
 */
export function evaluateAndFireWithEqs(
  bus: CharacterTopologyBus | null | undefined,
  frame: number,
  input: EqsQueryInput,
): EqsGasFireTickResult {
  const decision = runNpcEqsFireDecision(input)
  return tickEqsGasFireForAgent(bus, frame, decision)
}

export interface EqsPlaytestSoakResult {
  letter: typeof EQS_PLAYTEST_WIRE_LETTER
  passed: boolean
  libWired: typeof ENVIRONMENT_QUERY_SYSTEM_WIRED
  blockedRelocates: boolean
  clearFires: boolean
  framesProven: number
  notes: string[]
}

/**
 * Scripted soak: blocked LoS relocates without fire; clear LoS fires fireball.
 */
export function proveEqsPlaytestSoak(
  bus: CharacterTopologyBus,
): EqsPlaytestSoakResult {
  const notes: string[] = []

  const blocked = evaluateAndFireWithEqs(bus, 1, {
    kind: 'los-fire',
    agent: { x: 0, y: 0, z: 0 },
    target: { x: 10, y: 0, z: 0 },
    candidates: [
      { id: 'cover', x: 2, y: 0, z: 2, coverBias: 0.8 },
      { id: 'clear', x: 5, y: 0, z: 0, coverBias: 0.1 },
    ],
    hasLineOfSight: (from, to) => {
      const fx = 'x' in from ? from.x : 0
      const tx = 'x' in to ? to.x : 0
      // Origin blocked; candidate at x≈5 has LoS.
      if (Math.abs(fx) < 0.01 && Math.abs(tx - 10) < 0.01) return false
      return Math.abs(fx - 5) < 0.01
    },
  })

  const blockedRelocates =
    blocked.fired === false &&
    blocked.decision.gate.fireNow === false &&
    blocked.relocateTo?.id === 'clear'

  if (!blockedRelocates) {
    notes.push('blocked LoS soak failed — expected relocate to clear without fire')
  }

  const clear = evaluateAndFireWithEqs(bus, 2, {
    kind: 'los-fire',
    agent: { x: 5, y: 0, z: 0 },
    target: { x: 10, y: 0, z: 0 },
    candidates: [{ id: 'here', x: 5, y: 0, z: 0 }],
    hasLineOfSight: () => true,
  })

  const clearFires =
    clear.fired === true &&
    clear.decision.gate.fireNow === true &&
    clear.activation?.abilityId === 'fireball'

  if (!clearFires) {
    notes.push('clear LoS soak failed — expected fireball prediction')
  }

  const passed =
    ENVIRONMENT_QUERY_SYSTEM_WIRED === true &&
    EQS_PLAYTEST_WIRE_WIRED === true &&
    blockedRelocates &&
    clearFires

  if (passed) {
    notes.push('eqsPlaytestReady soak CLOSED (letter cj) — EQS→GAS fire path proven')
  }

  return {
    letter: EQS_PLAYTEST_WIRE_LETTER,
    passed,
    libWired: ENVIRONMENT_QUERY_SYSTEM_WIRED,
    blockedRelocates,
    clearFires,
    framesProven: passed ? 2 : 0,
    notes,
  }
}
