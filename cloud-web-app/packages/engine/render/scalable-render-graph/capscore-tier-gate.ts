/**
 * Law XV — CapScore → ScalableRenderGraph tier selection (fail-closed).
 *
 * Production path must never select enthusiast/discrete marketing tiers when
 * Capability Score is missing, NaN, or explicitly ignored.
 * Bake gate remains separate (`baked-lighting-publish-gate`); this gate owns tier.
 */

import type { RenderTier } from '../hardware-profile'
import { clampScore, tierFromCapabilityScore } from '../hardware-profile'

export const CAPSCORE_TIER_GATE_LETTER = 'xv-capscore' as const
export const CAPSCORE_TIER_GATE_SHIPPED = true as const

/** Full dual-live GPU / Nanite / Lumen marketing — always false until ladder gates. */
export const SCALABLE_RENDER_GRAPH_AAA_READY = false as const
export const NANITE_MARKETING_ALLOWED = false as const
export const LUMEN_MARKETING_ALLOWED = false as const

export type CapScoreGateRejectCode =
  | 'missing_capability_score'
  | 'non_finite_capability_score'
  | 'capability_score_ignored'
  | 'tier_mismatch'
  | 'out_of_range_capability_score'

export type CapScoreTierSelection =
  | {
      ok: true
      capabilityScore: number
      tier: RenderTier
      blueprintTier: RenderTier
      gate: 'pass'
      letter: typeof CAPSCORE_TIER_GATE_LETTER
      scalableRenderGraphAaaReady: false
      naniteMarketingAllowed: false
      lumenMarketingAllowed: false
      reason: string
    }
  | {
      ok: false
      capabilityScore: number | null
      tier: null
      blueprintTier: null
      gate: 'fail_closed'
      rejectCode: CapScoreGateRejectCode
      letter: typeof CAPSCORE_TIER_GATE_LETTER
      scalableRenderGraphAaaReady: false
      naniteMarketingAllowed: false
      lumenMarketingAllowed: false
      reason: string
    }

/**
 * Select SRG blueprint tier from Capability Score — fail-closed when CapScore ignored.
 */
export function selectScalableRenderTier(input: {
  capabilityScore: number | null | undefined
  /** Explicit opt-out — always refuse (Law XV). */
  ignoreCapabilityScore?: boolean
  /**
   * Caller-claimed tier (e.g. UI override). Must match score-derived tier or refuse.
   * Never invent enthusiast from a webgl2 score.
   */
  claimedTier?: RenderTier | null
}): CapScoreTierSelection {
  const heldFlags = {
    letter: CAPSCORE_TIER_GATE_LETTER,
    scalableRenderGraphAaaReady: false as const,
    naniteMarketingAllowed: false as const,
    lumenMarketingAllowed: false as const,
  }

  if (input.ignoreCapabilityScore === true) {
    return {
      ok: false,
      capabilityScore: null,
      tier: null,
      blueprintTier: null,
      gate: 'fail_closed',
      rejectCode: 'capability_score_ignored',
      reason:
        'Law XV fail-closed — CapScore ignored; ScalableRenderGraph tier selection refused',
      ...heldFlags,
    }
  }

  if (input.capabilityScore === null || input.capabilityScore === undefined) {
    return {
      ok: false,
      capabilityScore: null,
      tier: null,
      blueprintTier: null,
      gate: 'fail_closed',
      rejectCode: 'missing_capability_score',
      reason:
        'Law XV fail-closed — Capability Score required for ScalableRenderGraph tier selection',
      ...heldFlags,
    }
  }

  if (!Number.isFinite(input.capabilityScore)) {
    return {
      ok: false,
      capabilityScore: null,
      tier: null,
      blueprintTier: null,
      gate: 'fail_closed',
      rejectCode: 'non_finite_capability_score',
      reason: 'Law XV fail-closed — Capability Score must be a finite number 0–100',
      ...heldFlags,
    }
  }

  const raw = input.capabilityScore
  if (raw < 0 || raw > 100) {
    return {
      ok: false,
      capabilityScore: null,
      tier: null,
      blueprintTier: null,
      gate: 'fail_closed',
      rejectCode: 'out_of_range_capability_score',
      reason: 'Law XV fail-closed — Capability Score out of range 0–100',
      ...heldFlags,
    }
  }

  const score = clampScore(raw)
  const tier = tierFromCapabilityScore(score)

  if (input.claimedTier != null && input.claimedTier !== tier) {
    return {
      ok: false,
      capabilityScore: score,
      tier: null,
      blueprintTier: null,
      gate: 'fail_closed',
      rejectCode: 'tier_mismatch',
      reason: `Law XV fail-closed — claimed tier "${input.claimedTier}" does not match CapScore ${score} → "${tier}"`,
      ...heldFlags,
    }
  }

  return {
    ok: true,
    capabilityScore: score,
    tier,
    blueprintTier: tier,
    gate: 'pass',
    reason: `Law XV CapScore ${score} → blueprint tier ${tier}; SRG AAA / Nanite / Lumen marketing HELD`,
    ...heldFlags,
  }
}

/**
 * Require CapScore before any render-plan / fidelity apply — alias of select with stricter wording.
 */
export function requireCapScoreForRenderPlan(input: {
  capabilityScore: number | null | undefined
  ignoreCapabilityScore?: boolean
  claimedTier?: RenderTier | null
}): CapScoreTierSelection {
  return selectScalableRenderTier(input)
}
