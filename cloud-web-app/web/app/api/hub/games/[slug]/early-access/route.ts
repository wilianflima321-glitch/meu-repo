import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
  getEarlyAccessTitleFlag,
  setEarlyAccessOptIn,
} from '@/lib/hub/early-access-title-authority'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/games/[slug]/early-access/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_EARLY_ACCESS_REVIEWS'

async function resolveAuthorId(slug: string): Promise<string | null> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.publishedGame.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { authorId: true },
    })
    return row?.authorId ?? null
  } catch (err) {
    log.info('early_access_author_lookup_skipped', {
      slug,
      reason: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * I.2 deepen — creator early-access opt-in for <2h verified reviews (30m min).
 * GET is empty-honest (enabled: false when unset). POST requires auth + creator match when catalog known.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const gameId = String(params.slug || '').trim()
  if (!gameId) {
    return NextResponse.json({ error: 'GAME_SLUG_REQUIRED' }, { status: 400 })
  }

  const flag = await getEarlyAccessTitleFlag(gameId)
  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    gameId,
    enabled: flag?.enabled === true,
    requiredSeconds: flag?.requiredSeconds ?? EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
    standardRequiredSeconds: 7200,
    flag: flag ?? null,
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
    const enabled = body?.enabled === true
    const authorId = await resolveAuthorId(gameId)

    try {
      const flag = await setEarlyAccessOptIn({
        gameId,
        userId,
        enabled,
        authorId,
      })
      log.info('early_access_opt_in_updated', { gameId, userId, enabled })
      return NextResponse.json({
        success: true,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
        flag,
      })
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : 'EARLY_ACCESS_SET_FAILED'
      const status = code === 'EARLY_ACCESS_NOT_CREATOR' ? 403 : 400
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
    log.error('early_access_post_failed', { error })
    return NextResponse.json(
      { error: 'EARLY_ACCESS_POST_FAILED', capability: CAPABILITY },
      { status: 500 },
    )
  }
}
