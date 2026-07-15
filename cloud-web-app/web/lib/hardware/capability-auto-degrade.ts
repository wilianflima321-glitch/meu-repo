/**
 * Letter cg — Law XV CapScore auto-degrade (never crash OOM).
 */

import type { CapScoreDegradeAction, CapScoreDegradePlan } from '@/lib/hardware/types'

export const CAPABILITY_AUTO_DEGRADE_WIRED = true as const

export function estimateVramBudgetMb(capabilityScore: number): number {
  const score = Number.isFinite(capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(capabilityScore)))
    : 0
  if (score < 20) return 256
  if (score < 45) return 1024
  if (score < 75) return 3072
  return 8192
}

/**
 * Given estimated VRAM pressure, produce fail-closed degrade actions.
 * Never throws — OOM crash is forbidden (Founder GT730 mandate).
 */
export function planCapabilityAutoDegrade(input: {
  capabilityScore: number
  estimatedVramMb: number
  /** Optional override; default from score bands. */
  vramBudgetMb?: number
}): CapScoreDegradePlan {
  const score = Number.isFinite(input.capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(input.capabilityScore)))
    : 0
  const budget = input.vramBudgetMb ?? estimateVramBudgetMb(score)
  const estimated = Math.max(0, input.estimatedVramMb)
  const oomRisk = estimated > budget * 0.9
  const actions: CapScoreDegradeAction[] = []
  const notes: string[] = [
    'CapScore auto-degrade wired (letter cg) — crash OOM forbidden',
    'GT730 / webgl2: prefer FSR + fewer cascades + drop async compute',
  ]

  if (score < 20 || oomRisk) {
    actions.push({
      subsystem: 'async_compute',
      from: 'gpu_queue',
      to: 'main_thread_or_off',
      reason: 'Law XV fail-closed async compute on weak / OOM-risk GPUs',
    })
    actions.push({
      subsystem: 'fsr',
      from: 'native',
      to: 'performance',
      reason: 'Lower internal scale to protect VRAM / FPS',
    })
    actions.push({
      subsystem: 'shadows',
      from: 'cascade-vsm',
      to: 'single_cascade_512',
      reason: 'Shrink shadow atlas under CapScore / OOM risk',
    })
    actions.push({
      subsystem: 'volumetrics',
      from: 'full_raymarch',
      to: 'cheap_or_off',
      reason: 'Drop volumetric beauty under CapScore / OOM risk',
    })
  } else if (score < 45) {
    actions.push({
      subsystem: 'fsr',
      from: 'native',
      to: 'balanced',
      reason: 'Integrated: FSR balanced',
    })
    actions.push({
      subsystem: 'async_compute',
      from: 'gpu_queue',
      to: 'main_thread_fallback_ok',
      reason: 'Integrated may lack reliable async compute',
    })
  } else if (score < 75) {
    actions.push({
      subsystem: 'fsr',
      from: 'native',
      to: 'quality',
      reason: 'Discrete: FSR quality optional',
    })
  }

  if (oomRisk) {
    notes.push(
      `OOM risk: estimated ${estimated.toFixed(0)} MiB > 90% of budget ${budget} MiB — degrade, do not crash`,
    )
  }

  return {
    capabilityScore: score,
    estimatedVramMb: estimated,
    vramBudgetMb: budget,
    oomRisk,
    crashOomForbidden: true,
    actions,
    notes,
  }
}

/** Apply degrade plan: return whether a subsystem was forced off/main-thread. */
export function shouldFailClosedAsyncCompute(plan: CapScoreDegradePlan): boolean {
  return plan.actions.some(
    (a) => a.subsystem === 'async_compute' && a.to.includes('main_thread'),
  )
}
