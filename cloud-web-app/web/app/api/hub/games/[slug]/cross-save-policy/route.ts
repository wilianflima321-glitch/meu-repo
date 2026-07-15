import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  DEFAULT_CROSS_SAVE_POLICY,
  getCrossSavePolicy,
  getCrossSaveUserOptOut,
  isValidCrossSavePolicy,
  setCrossSavePolicy,
  setCrossSaveUserOptOut,
} from '@/lib/hub/cross-save-policy-authority'
import { probeGameSaveCloudReady } from '@/lib/liveops/gamesave-cloud-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/games/[slug]/cross-save-policy/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_CROSS_SAVE_POLICY'

async function resolveAuthorId(slug: string): Promise<string | null> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.publishedGame.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { authorId: true },
    })
    return row?.authorId ?? null
  } catch (err) {
    log.info('cross_save_author_lookup_skipped', {
      slug,
      reason: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * I.7 — creator crossSavePolicy + player default-on opt-out.
 * GET empty-honest (policy defaults to optional). Cloud marketing stamp stays HELD without F.1 cloud.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const gameId = String(params.slug || '').trim()
  if (!gameId) {
    return NextResponse.json({ error: 'GAME_SLUG_REQUIRED' }, { status: 400 })
  }

  const policy = await getCrossSavePolicy(gameId)
  const cloudProbe = await probeGameSaveCloudReady()
  const auth = getUserFromRequest(req)
  const userId = auth?.userId
  const optOut = userId ? await getCrossSaveUserOptOut(userId, gameId) : null

  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    gameId,
    policy: policy.policy,
    defaultPolicy: DEFAULT_CROSS_SAVE_POLICY,
    defaultOn: policy.policy === 'optional' || policy.policy === 'required',
    record: policy,
    userOptedOut: optOut?.optedOut === true,
    userOptOut: optOut,
    cloudSyncMarketing: cloudProbe.ready ? 'LIVE' : 'HELD',
    gameSaveCloudReady: cloudProbe.ready,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const auth = getUserFromRequest(req)
    const userId = auth?.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', capability: CAPABILITY, capabilityStatus: 'IMPLEMENTED' },
        { status: 401 },
      )
    }

    const gameId = String(params.slug || '').trim()
    if (!gameId) {
      return NextResponse.json({ error: 'GAME_SLUG_REQUIRED' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || 'set_policy').trim()

    if (action === 'opt_out' || action === 'set_opt_out') {
      const optedOut = body?.optedOut === true
      try {
        const record = await setCrossSaveUserOptOut({ userId, gameId, optedOut })
        log.info('cross_save_user_opt_out_updated', { gameId, userId, optedOut })
        return NextResponse.json({
          success: true,
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
          action: 'opt_out',
          userOptOut: record,
        })
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code?: string }).code)
            : 'CROSS_SAVE_OPT_OUT_FAILED'
        const status =
          code === 'CROSS_SAVE_OPT_OUT_FORBIDDEN' || code === 'CROSS_SAVE_DISABLED_BY_TITLE'
            ? 403
            : 400
        return NextResponse.json(
          {
            error: code,
            reason: err instanceof Error ? err.message : String(err),
            capability: CAPABILITY,
            capabilityStatus: 'IMPLEMENTED',
          },
          { status },
        )
      }
    }

    // Creator set_policy
    if (!isValidCrossSavePolicy(body?.policy)) {
      return NextResponse.json(
        {
          error: 'CROSS_SAVE_POLICY_INVALID',
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
        },
        { status: 400 },
      )
    }

    const authorId = await resolveAuthorId(gameId)
    try {
      const record = await setCrossSavePolicy({
        gameId,
        userId,
        policy: body.policy,
        authorId,
      })
      log.info('cross_save_policy_updated', { gameId, userId, policy: record.policy })
      return NextResponse.json({
        success: true,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
        action: 'set_policy',
        record,
      })
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : 'CROSS_SAVE_POLICY_SET_FAILED'
      const status = code === 'CROSS_SAVE_NOT_CREATOR' ? 403 : 400
      return NextResponse.json(
        {
          error: code,
          reason: err instanceof Error ? err.message : String(err),
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
        },
        { status },
      )
    }
  } catch (error) {
    log.error('cross_save_policy_post_failed', { error })
    return NextResponse.json(
      { error: 'CROSS_SAVE_POLICY_POST_FAILED', capability: CAPABILITY },
      { status: 500 },
    )
  }
}
