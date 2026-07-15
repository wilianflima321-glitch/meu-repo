import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  acceptPartyInvite,
  createPartyInvite,
  getPartyInvite,
  listPartyInvitesForUser,
} from '@/lib/hub/party-invite-authority'
import { probeSocialModerationHonesty } from '@/lib/hub/social-moderation-capability'
import { evaluatePartyParticipationGate } from '@/lib/hub/social-party-gates'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/social/party/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_SOCIAL_PARTY'

function parseCoppa(body: Record<string, unknown>, req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const ageRaw = body?.ageYears ?? sp.get('ageYears')
  const ageYears =
    ageRaw !== null && ageRaw !== undefined && ageRaw !== '' && Number.isFinite(Number(ageRaw))
      ? Math.floor(Number(ageRaw))
      : undefined
  return {
    birthDate:
      (typeof body?.birthDate === 'string' ? body.birthDate : null) ?? sp.get('birthDate'),
    ageYears,
    parentalConsentVerified:
      body?.parentalConsent === true ||
      body?.parentalConsentVerified === true ||
      sp.get('parentalConsent') === '1' ||
      sp.get('parentalConsent') === 'true',
  }
}

/**
 * I.4 — Party invites (empty-honest). Requires COPPA pass + not blocked.
 * Live Agones / dedicated session resolve stays [HELD].
 */
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  const userId = auth?.userId
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', capability: CAPABILITY, capabilityStatus: 'IMPLEMENTED' },
      { status: 401 },
    )
  }

  const honesty = await probeSocialModerationHonesty()
  const coppa = parseCoppa({}, req)
  const gate = await evaluatePartyParticipationGate({
    socialModerationReady: honesty.socialModerationReady,
    socialPartyReady: honesty.socialPartyReady,
    actorUserId: userId,
    requireCoppa: true,
    coppa,
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
        error: gate.code ?? 'SOCIAL_PARTY_HELD',
        reason: gate.reason,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: honesty.socialPartyReady ? 'IMPLEMENTED' : 'HELD',
        invites: [],
        count: 0,
        dedicatedSessionHeld: true,
        coppa: gate.coppa,
      },
      { status },
    )
  }

  const invites = await listPartyInvitesForUser(userId)
  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    invites,
    count: invites.length,
    dedicatedSessionHeld: true,
    note: 'Invite substrate live — dedicated multiplayer session host / Agones [HELD]',
  })
}

export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req)
    const userId = auth?.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', capability: CAPABILITY },
        { status: 401 },
      )
    }

    const honesty = await probeSocialModerationHonesty()
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const action = String(body?.action || 'create').trim().toLowerCase()
    const coppa = parseCoppa(body, req)

    if (action === 'accept') {
      const inviteId = String(body?.inviteId || '').trim()
      if (!inviteId) {
        return NextResponse.json({ error: 'INVITE_ID_REQUIRED' }, { status: 400 })
      }

      // Load invite first so we can gate on host/invitee block.
      const existing = await getPartyInvite(inviteId)
      const gate = await evaluatePartyParticipationGate({
        socialModerationReady: honesty.socialModerationReady,
        socialPartyReady: honesty.socialPartyReady,
        actorUserId: userId,
        otherUserId: existing?.hostUserId,
        requireCoppa: true,
        coppa,
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
            error: gate.code ?? 'SOCIAL_PARTY_HELD',
            reason: gate.reason,
            mock: false,
            capability: CAPABILITY,
            capabilityStatus: honesty.socialPartyReady ? 'IMPLEMENTED' : 'HELD',
            dedicatedSessionHeld: true,
            coppa: gate.coppa,
          },
          { status },
        )
      }

      const invite = await acceptPartyInvite({ inviteId, actorUserId: userId })
      log.info('party_invite_accept_api', { inviteId, userId })
      return NextResponse.json({
        success: true,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
        invite,
        dedicatedSessionHeld: true,
        note: 'Invite accepted — Agones / dedicated session host [HELD]',
      })
    }

    const inviteeUserId = String(body?.inviteeUserId || body?.targetUserId || '').trim()
    const gameId = String(body?.gameId || '').trim()
    if (!inviteeUserId || !gameId) {
      return NextResponse.json(
        { error: 'PARTY_INVITE_FIELDS_REQUIRED', reason: 'inviteeUserId and gameId required' },
        { status: 400 },
      )
    }

    const gate = await evaluatePartyParticipationGate({
      socialModerationReady: honesty.socialModerationReady,
      socialPartyReady: honesty.socialPartyReady,
      actorUserId: userId,
      otherUserId: inviteeUserId,
      requireCoppa: true,
      coppa,
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
          error: gate.code ?? 'SOCIAL_PARTY_HELD',
          reason: gate.reason,
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: honesty.socialPartyReady ? 'IMPLEMENTED' : 'HELD',
          dedicatedSessionHeld: true,
          coppa: gate.coppa,
          blocked: gate.blocked,
        },
        { status },
      )
    }

    const { invite, deepLink } = await createPartyInvite({
      hostUserId: userId,
      inviteeUserId,
      gameId,
      gameTitle: typeof body?.gameTitle === 'string' ? body.gameTitle : undefined,
    })

    log.info('party_invite_create_api', {
      inviteId: invite.id,
      hostUserId: userId,
      inviteeUserId,
      gameId,
    })

    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      invite,
      deepLink: {
        uri: deepLink.uri,
        token: deepLink.token,
        expiresAt: deepLink.expiresAt,
      },
      dedicatedSessionHeld: true,
      note: 'Deep-link minted — dedicated multiplayer session host / Agones [HELD]',
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (
      code === 'PARTY_INVITE_FIELDS_REQUIRED' ||
      code === 'PARTY_INVITE_SELF_FORBIDDEN' ||
      code === 'PARTY_INVITE_NOT_FOUND' ||
      code === 'PARTY_INVITE_NOT_INVITEE' ||
      code === 'PARTY_INVITE_EXPIRED' ||
      code === 'PARTY_INVITE_NOT_PENDING'
    ) {
      return NextResponse.json({ error: code }, { status: 400 })
    }
    log.error('party_post_failed', { error })
    return NextResponse.json(
      { error: 'PARTY_POST_FAILED', capability: CAPABILITY },
      { status: 500 },
    )
  }
}
