import { NextRequest, NextResponse } from 'next/server'

import { evaluateCoppaAgeGate, COPPA_AGE_THRESHOLD_YEARS } from '@/lib/hub/coppa-age-gate'
import { isEitherBlocked } from '@/lib/hub/social-moderation-authority'
import { probeSocialModerationHonesty } from '@/lib/hub/social-moderation-capability'
import { evaluateHubSocialGate } from '@/lib/hub/hub-honesty-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/social/gates/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_SOCIAL_GATES'

/**
 * I.4 — Public social gate probe (COPPA + party fail-closed + optional block check).
 * Does not invent party readiness.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const honesty = await probeSocialModerationHonesty()

  const birthDate = sp.get('birthDate')
  const ageRaw = sp.get('ageYears')
  const ageYears =
    ageRaw !== null && ageRaw !== '' && Number.isFinite(Number(ageRaw))
      ? Math.floor(Number(ageRaw))
      : undefined
  const parentalConsentVerified =
    sp.get('parentalConsent') === '1' || sp.get('parentalConsent') === 'true'

  const coppa = evaluateCoppaAgeGate({
    birthDate,
    ageYears,
    parentalConsentVerified,
  })

  const partyGate = evaluateHubSocialGate({
    socialModerationReady: honesty.socialModerationReady,
    socialPartyReady: honesty.socialPartyReady,
  })

  const userA = sp.get('userA')?.trim()
  const userB = sp.get('userB')?.trim()
  let blocked: boolean | null = null
  if (userA && userB && honesty.socialModerationReady) {
    blocked = await isEitherBlocked(userA, userB)
  }

  log.info('social_gates_probed', {
    socialModerationReady: honesty.socialModerationReady,
    socialPartyReady: honesty.socialPartyReady,
    coppaCode: coppa.code,
    partyAllowed: partyGate.allowed,
  })

  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: honesty.socialModerationReady ? 'IMPLEMENTED' : 'HELD',
    coppaAgeThresholdYears: COPPA_AGE_THRESHOLD_YEARS,
    socialModerationReady: honesty.socialModerationReady,
    socialPartyReady: honesty.socialPartyReady,
    marketingSocialModerationAllowed: honesty.marketingSocialModerationAllowed,
    marketingSocialPartyAllowed: honesty.marketingSocialPartyAllowed,
    dedicatedSessionHeld: honesty.dedicatedSessionHeld,
    coppa,
    partyGate,
    blocked,
    claim: honesty.claim,
    productCopy: honesty.productCopy,
  })
}
