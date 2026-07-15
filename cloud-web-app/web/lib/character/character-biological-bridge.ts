/**
 * Letter bu — Biological bridge: GAS impact → Active Ragdoll → Motion Matching stumble.
 *
 * Fireball/impact from GAS applies Rapier impulse + muscle/balance (bb) then
 * requests stumble-tagged Motion Matching clip search.
 */

import {
  applyActiveRagdollTick,
  type ActiveRagdollForceBody,
  type ActiveRagdollSegment,
  type ActiveRagdollTickResult,
} from '@/lib/physics/active-ragdoll-apply'

export const CHARACTER_BIOLOGICAL_BRIDGE_WIRED = true as const
export const STUMBLE_MOTION_TAG = 'stumble' as const

export interface GasImpactEvent {
  abilityId: string
  /** World impulse from projectile / melee. */
  impulse: { x: number; y: number; z: number }
  hitPoint?: { x: number; y: number; z: number }
  /** Instant client VFX already played (prediction). */
  clientVfxPlayed?: boolean
  manaSpentPredicted?: number
}

export interface StumbleSearchRequest {
  tags: string[]
  /** Feature hint from impulse magnitude for KD-tree query bias. */
  impulseMagnitude: number
  reason: 'gas-impact' | 'balance-fail'
}

export interface BiologicalBridgeTickInput {
  impact: GasImpactEvent | null
  segments: ActiveRagdollSegment[]
  rootBody: ActiveRagdollForceBody | null
  rapierSubstrateReady: boolean
  capabilityScore?: number
  /** Optional MM stumble search callback (MotionKDTree.findNearest tags). */
  searchStumbleClips?: (req: StumbleSearchRequest) => { clipId: string; distance: number } | null
}

export interface BiologicalBridgeTickResult {
  ragdoll: ActiveRagdollTickResult
  impulseApplied: boolean
  stumbleSearch: StumbleSearchRequest | null
  stumbleHit: { clipId: string; distance: number } | null
  bridgeWired: true
}

function mag(v: { x: number; y: number; z: number }): number {
  return Math.hypot(v.x, v.y, v.z)
}

/**
 * One biological tick: optional GAS impact impulse → ragdoll apply → stumble MM search.
 */
export function tickBiologicalBridge(input: BiologicalBridgeTickInput): BiologicalBridgeTickResult {
  let impulseApplied = false
  let stumbleSearch: StumbleSearchRequest | null = null

  if (input.impact && input.rootBody && input.rapierSubstrateReady) {
    input.rootBody.addForce(input.impact.impulse, 'impulse')
    impulseApplied = true
    const m = mag(input.impact.impulse)
    if (m > 0.5) {
      stumbleSearch = {
        tags: [STUMBLE_MOTION_TAG, 'locomotion'],
        impulseMagnitude: m,
        reason: 'gas-impact',
      }
    }
  }

  // Angle error from impact direction — lean away from hit for muscle recovery.
  const segments = input.segments.map((seg) => {
    if (!input.impact || !impulseApplied) return seg
    const m = mag(input.impact.impulse) || 1
    return {
      ...seg,
      angleError: {
        x: seg.angleError.x + (input.impact!.impulse.z / m) * 0.15,
        y: seg.angleError.y,
        z: seg.angleError.z + (-input.impact!.impulse.x / m) * 0.15,
      },
    }
  })

  const ragdoll = applyActiveRagdollTick({
    segments,
    applyEnabled: true,
    rapierSubstrateReady: input.rapierSubstrateReady,
    capabilityScore: input.capabilityScore,
  })

  let stumbleHit: { clipId: string; distance: number } | null = null
  if (stumbleSearch && input.searchStumbleClips) {
    stumbleHit = input.searchStumbleClips(stumbleSearch)
  }

  return {
    ragdoll,
    impulseApplied,
    stumbleSearch,
    stumbleHit,
    bridgeWired: true,
  }
}

/** Build stumble-tagged feature query for MotionKDTree (53-dim safe pad). */
export function buildStumbleFeatureHint(impulseMagnitude: number, dims = 53): Float32Array {
  const f = new Float32Array(dims)
  f[0] = Math.min(1, impulseMagnitude / 20)
  f[1] = 0.2 // low forward speed
  f[2] = 0.8 // high instability
  return f
}
