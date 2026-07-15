/**
 * Immunity M — Object Pool / Frame Arena honesty probe (letter bp).
 * `objectPoolEnforced` flips only when soak proves zero alloc growth for pooled types.
 * `zeroStutterMarketingAllowed` stays false until Founder M.1 soak — never from pool alone.
 */

import { GAMEPLAY_HOT_PATH_RULES } from './frame-arena'
import {
  GAMEPLAY_POOL_BUS_WIRED,
  probeGameplayPoolBusWired,
  runObjectPoolSoak,
  type ObjectPoolSoakResult,
} from './gameplay-pool-bus'

export interface ObjectPoolHonesty {
  gameplayPoolBusWired: typeof GAMEPLAY_POOL_BUS_WIRED
  hotPathRulesCount: number
  soakPassed: boolean
  soakFrames: number
  /**
   * True when bus wired + soak proves no hot-path `new` growth for pooled types.
   * Does NOT imply zero-stutter marketing.
   */
  objectPoolEnforced: boolean
  /** Always false — Founder-gated M.1; pool soak alone is insufficient. */
  zeroStutterMarketingAllowed: false
  notes: string[]
}

/**
 * Run short soak and return honesty snapshot.
 * Used by aaa-production aggregate auto-proof (letter bp).
 */
export function proveObjectPoolSoak(frames = 120): ObjectPoolSoakResult {
  return runObjectPoolSoak(frames)
}

export function probeObjectPoolWired(): boolean {
  return probeGameplayPoolBusWired()
}

/**
 * Honesty: objectPoolEnforced when path wired and soak passes.
 * Marketing zero-stutter always fail-closed.
 */
export function probeObjectPoolHonesty(input?: {
  soakPassed?: boolean
  soakFrames?: number
  forceSoak?: boolean
}): ObjectPoolHonesty {
  const notes: string[] = [
    'ObjectPool + FrameArena + GameplayPoolBus on SimulationTick hot path (bp)',
    ...GAMEPLAY_HOT_PATH_RULES.slice(0, 3),
    'zeroStutterMarketingAllowed=false until Founder M.1 soak',
  ]

  if (!GAMEPLAY_POOL_BUS_WIRED) {
    notes.push('Gameplay pool bus not wired')
  }

  let soakPassed = input?.soakPassed === true
  let soakFrames = input?.soakFrames ?? 0

  if (input?.soakPassed === false) {
    soakPassed = false
  } else if (input?.soakPassed === true) {
    soakPassed = true
    soakFrames = input.soakFrames ?? soakFrames
  } else if (input?.forceSoak !== false && GAMEPLAY_POOL_BUS_WIRED) {
    const soak = proveObjectPoolSoak(input?.soakFrames ?? 120)
    soakPassed = soak.passed
    soakFrames = soak.frames
    notes.push(...soak.notes)
  } else {
    notes.push('Soak not run in this probe')
  }

  if (!soakPassed) {
    notes.push('objectPoolEnforced HELD — soak did not prove stable pool stats')
  }

  const objectPoolEnforced = GAMEPLAY_POOL_BUS_WIRED && soakPassed

  return {
    gameplayPoolBusWired: GAMEPLAY_POOL_BUS_WIRED,
    hotPathRulesCount: GAMEPLAY_HOT_PATH_RULES.length,
    soakPassed,
    soakFrames,
    objectPoolEnforced,
    zeroStutterMarketingAllowed: false,
    notes,
  }
}
