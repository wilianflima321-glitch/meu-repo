import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  getPresence,
  getPresenceForUsers,
  upsertPresence,
} from '@/lib/hub/rich-presence-authority'
import { probeSocialModerationHonesty } from '@/lib/hub/social-moderation-capability'
import { evaluatePartyParticipationGate } from '@/lib/hub/social-party-gates'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/social/presence/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_SOCIAL_PRESENCE'

/**
 * I.4 — Rich presence heartbeat + lookup.
 * Empty-honest when none / stale. Never invents online friends.
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
  if (!honesty.socialPartyReady || !honesty.socialModerationReady) {
    return NextResponse.json(
      {
        error: 'SOCIAL_PARTY_HELD',
        reason: honesty.claim,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'HELD',
        presence: null,
        presenceList: [],
        count: 0,
        dedicatedSessionHeld: true,
      },
      { status: 503 },
    )
  }

  const sp = req.nextUrl.searchParams
  const target = sp.get('userId')?.trim()
  const csv = sp.get('userIds')?.trim()

  if (csv) {
    const ids = csv.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50)
    const presenceList = await getPresenceForUsers(ids)
    return NextResponse.json({
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      presenceList,
      count: presenceList.length,
      dedicatedSessionHeld: true,
    })
  }

  const presence = await getPresence(target || userId)
  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    presence,
    count: presence ? 1 : 0,
    dedicatedSessionHeld: true,
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
    const gate = await evaluatePartyParticipationGate({
      socialModerationReady: honesty.socialModerationReady,
      socialPartyReady: honesty.socialPartyReady,
      actorUserId: userId,
      // Self heartbeat — COPPA not required; party invite paths still require it.
      requireCoppa: false,
    })
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: gate.code ?? 'SOCIAL_PARTY_HELD',
          reason: gate.reason,
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: honesty.socialPartyReady ? 'IMPLEMENTED' : 'HELD',
          dedicatedSessionHeld: true,
        },
        { status: gate.code === 'AUTH_REQUIRED' ? 401 : 503 },
      )
    }

    const presence = await upsertPresence({
      userId,
      status: body?.status,
      gameId: typeof body?.gameId === 'string' ? body.gameId : undefined,
      gameTitle: typeof body?.gameTitle === 'string' ? body.gameTitle : undefined,
      joinable: body?.joinable === true,
      lobbyHint: typeof body?.lobbyHint === 'string' ? body.lobbyHint : undefined,
    })

    log.info('presence_post_accepted', { userId, status: presence.status })
    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      presence,
      dedicatedSessionHeld: true,
      note: 'Presence heartbeat durable — Agones / dedicated session host [HELD]',
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'PRESENCE_IDENTITY_REQUIRED') {
      return NextResponse.json({ error: code }, { status: 400 })
    }
    log.error('presence_post_failed', { error })
    return NextResponse.json(
      { error: 'PRESENCE_POST_FAILED', capability: CAPABILITY },
      { status: 500 },
    )
  }
}
