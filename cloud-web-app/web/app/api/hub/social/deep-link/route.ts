import { NextRequest, NextResponse } from 'next/server'

import { validateDeepLinkToken } from '@/lib/hub/party-invite-authority'
import { probeSocialModerationHonesty } from '@/lib/hub/social-moderation-capability'
import { evaluatePartyParticipationGate } from '@/lib/hub/social-party-gates'
import { getUserFromRequest } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/social/deep-link/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_SOCIAL_DEEP_LINK'

/**
 * I.4 — Validate party deep-link token.
 * Token substrate is real; Agones / dedicated session resolve stays [HELD].
 */
export async function GET(req: NextRequest) {
  const honesty = await probeSocialModerationHonesty()
  if (!honesty.socialPartyReady || !honesty.socialModerationReady) {
    return NextResponse.json(
      {
        error: 'SOCIAL_PARTY_HELD',
        reason: honesty.claim,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'HELD',
        valid: false,
        dedicatedSessionHeld: true,
      },
      { status: 503 },
    )
  }

  const token = req.nextUrl.searchParams.get('token')?.trim() || ''
  const result = await validateDeepLinkToken(token)

  log.info('deep_link_validated', {
    code: result.code,
    valid: result.valid,
    dedicatedSessionHeld: result.dedicatedSessionHeld,
  })

  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    valid: result.valid,
    code: result.code,
    reason: result.reason,
    deepLink: result.deepLink
      ? {
          uri: result.deepLink.uri,
          inviteId: result.deepLink.inviteId,
          gameId: result.deepLink.gameId,
          hostUserId: result.deepLink.hostUserId,
          inviteeUserId: result.deepLink.inviteeUserId,
          expiresAt: result.deepLink.expiresAt,
        }
      : null,
    invite: result.invite
      ? {
          id: result.invite.id,
          status: result.invite.status,
          gameId: result.invite.gameId,
          hostUserId: result.invite.hostUserId,
          inviteeUserId: result.invite.inviteeUserId,
        }
      : null,
    dedicatedSessionHeld: true,
    dedicatedSessionReason: result.dedicatedSessionReason,
  })
}

/**
 * POST — validate + optional COPPA/block gate for the signed-in actor intending to join.
 * Still does not allocate Agones.
 */
export async function POST(req: NextRequest) {
  const honesty = await probeSocialModerationHonesty()
  if (!honesty.socialPartyReady || !honesty.socialModerationReady) {
    return NextResponse.json(
      {
        error: 'SOCIAL_PARTY_HELD',
        reason: honesty.claim,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'HELD',
        valid: false,
        dedicatedSessionHeld: true,
      },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const token = String(body?.token || '').trim()
  const result = await validateDeepLinkToken(token)
  if (!result.valid) {
    return NextResponse.json(
      {
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
        valid: false,
        code: result.code,
        reason: result.reason,
        dedicatedSessionHeld: true,
        dedicatedSessionReason: result.dedicatedSessionReason,
      },
      { status: 400 },
    )
  }

  const auth = getUserFromRequest(req)
  const userId = auth?.userId
  const ageRaw = body?.ageYears
  const ageYears =
    ageRaw !== null && ageRaw !== undefined && ageRaw !== '' && Number.isFinite(Number(ageRaw))
      ? Math.floor(Number(ageRaw))
      : undefined

  const gate = await evaluatePartyParticipationGate({
    socialModerationReady: honesty.socialModerationReady,
    socialPartyReady: honesty.socialPartyReady,
    actorUserId: userId,
    otherUserId: result.invite?.hostUserId,
    requireCoppa: true,
    coppa: {
      birthDate: typeof body?.birthDate === 'string' ? body.birthDate : undefined,
      ageYears,
      parentalConsentVerified:
        body?.parentalConsent === true || body?.parentalConsentVerified === true,
    },
  })

  if (!gate.allowed) {
    const status =
      gate.code === 'AUTH_REQUIRED'
        ? 401
        : gate.code === 'AGE_UNKNOWN' ||
            gate.code === 'COPPA_UNDER_13' ||
            gate.code === 'SOCIAL_BLOCKED'
          ? 403
          : 503
    return NextResponse.json(
      {
        error: gate.code ?? 'PARTY_GATE_HELD',
        reason: gate.reason,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
        valid: result.valid,
        dedicatedSessionHeld: true,
        coppa: gate.coppa,
        blocked: gate.blocked,
      },
      { status },
    )
  }

  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    valid: true,
    code: result.code,
    reason: result.reason,
    deepLink: result.deepLink
      ? {
          uri: result.deepLink.uri,
          inviteId: result.deepLink.inviteId,
          gameId: result.deepLink.gameId,
          expiresAt: result.deepLink.expiresAt,
        }
      : null,
    invite: result.invite
      ? {
          id: result.invite.id,
          status: result.invite.status,
          gameId: result.invite.gameId,
        }
      : null,
    dedicatedSessionHeld: true,
    dedicatedSessionReason: result.dedicatedSessionReason,
    joinSession: null,
    note: 'Deep-link gate passed — live session allocation / Agones [HELD]',
  })
}
