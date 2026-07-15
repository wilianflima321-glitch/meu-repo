/**
 * I.4 — Party / presence participation gates.
 * Fail-closed: requires Hub social party readiness + COPPA pass + not blocked.
 * Dedicated session / Agones stays HELD (separate from invite substrate).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  evaluateCoppaAgeGate,
  type CoppaAgeGateInput,
  type CoppaAgeGateResult,
} from '@/lib/hub/coppa-age-gate'
import { evaluateHubSocialGate } from '@/lib/hub/hub-honesty-capability'
import { isEitherBlocked } from '@/lib/hub/social-moderation-authority'

const log = createComponentLogger('social-party-gates')

export type PartyParticipationGateResult = {
  allowed: boolean
  code?: string
  reason: string
  coppa?: CoppaAgeGateResult
  blocked?: boolean
  /** Always true until Agones / dedicated host ships. */
  dedicatedSessionHeld: true
}

/**
 * Gate party invite / deep-link participation.
 * Presence heartbeat (self) may skip COPPA via `requireCoppa: false`.
 */
export async function evaluatePartyParticipationGate(input: {
  socialModerationReady?: boolean
  socialPartyReady?: boolean
  actorUserId?: string | null
  otherUserId?: string | null
  requireCoppa?: boolean
  coppa?: CoppaAgeGateInput
}): Promise<PartyParticipationGateResult> {
  const dedicatedSessionHeld = true as const
  const hub = evaluateHubSocialGate({
    socialModerationReady: input.socialModerationReady,
    socialPartyReady: input.socialPartyReady,
  })
  if (!hub.allowed) {
    return {
      allowed: false,
      code: hub.code,
      reason: hub.reason,
      dedicatedSessionHeld,
    }
  }

  const actor = String(input.actorUserId || '').trim()
  if (!actor) {
    return {
      allowed: false,
      code: 'AUTH_REQUIRED',
      reason: 'Party / presence actions require signed-in actor',
      dedicatedSessionHeld,
    }
  }

  let coppa: CoppaAgeGateResult | undefined
  if (input.requireCoppa !== false) {
    coppa = evaluateCoppaAgeGate(input.coppa ?? {})
    if (!coppa.allowed) {
      log.info('party_participation_coppa_held', { code: coppa.code, actor })
      return {
        allowed: false,
        code: coppa.code,
        reason: coppa.reason,
        coppa,
        dedicatedSessionHeld,
      }
    }
  }

  const other = String(input.otherUserId || '').trim()
  if (other && other !== actor) {
    const blocked = await isEitherBlocked(actor, other)
    if (blocked) {
      return {
        allowed: false,
        code: 'SOCIAL_BLOCKED',
        reason: 'Party invite fail-closed — users have an active block',
        coppa,
        blocked: true,
        dedicatedSessionHeld,
      }
    }
    return {
      allowed: true,
      reason: 'party_participation_allowed',
      coppa,
      blocked: false,
      dedicatedSessionHeld,
    }
  }

  return {
    allowed: true,
    reason: 'party_participation_allowed',
    coppa,
    dedicatedSessionHeld,
  }
}
