import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  listVerifiedReviews,
  resolveViewerReviewEligibility,
  submitVerifiedReview,
} from '@/lib/hub/verified-reviews'
import { probeLiveOpsF2Honesty } from '@/lib/liveops/liveops-f2-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/games/[slug]/reviews/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_VERIFIED_REVIEWS'

/**
 * I.2 — Verified GameReview list + create.
 * gameId == Arcade PublishedGame.slug (same key as F.2 playtime).
 * POST fail-closed until F.2 playtime evidence meets gate (2h, or 30m when EA opted in).
 * GET ranks by durable helpful-vote weight — no fake counts.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const gameId = String(params.slug || '').trim()
  if (!gameId) {
    return NextResponse.json({ error: 'GAME_SLUG_REQUIRED' }, { status: 400 })
  }

  const auth = getUserFromRequest(req)
  const f2 = await probeLiveOpsF2Honesty()
  const list = await listVerifiedReviews(gameId, { viewerUserId: auth?.userId })
  const viewerEligibility = await resolveViewerReviewEligibility({
    userId: auth?.userId,
    gameId,
    playtimeTelemetryReady: f2.playtimeTelemetryReady,
    reviewsStoreReady: f2.reviewsStoreReady,
  })

  return NextResponse.json({
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    ...list,
    /** Authenticated F.2 PlayerGameStats vs 2h (or EA 30m) gate — fail-closed when unmet. */
    viewerEligibility,
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
        {
          error: 'Unauthorized',
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
        },
        { status: 401 },
      )
    }

    const gameId = String(params.slug || '').trim()
    if (!gameId) {
      return NextResponse.json({ error: 'GAME_SLUG_REQUIRED' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const f2 = await probeLiveOpsF2Honesty()

    const result = await submitVerifiedReview({
      userId,
      gameId,
      rating: body?.rating,
      body: body?.body,
      playtimeTelemetryReady: f2.playtimeTelemetryReady,
      reviewsStoreReady: f2.reviewsStoreReady,
    })

    if (!result.ok) {
      log.info('review_post_rejected', {
        userId,
        gameId,
        code: result.code,
        playtimeSeconds: result.playtimeSeconds,
      })
      return NextResponse.json(
        {
          error: result.code,
          reason: result.reason,
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: f2.reviewsStoreReady ? 'IMPLEMENTED' : 'HELD',
          playtimeSeconds: result.playtimeSeconds,
          requiredPlaytimeSeconds: result.requiredSeconds,
        },
        { status: result.status },
      )
    }

    log.info('review_post_accepted', {
      userId,
      gameId,
      rating: result.review.rating,
      playtimeSeconds: result.playtimeSeconds,
      isEarlyAccess: result.review.isEarlyAccess,
    })

    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      review: result.review,
      playtimeSeconds: result.playtimeSeconds,
      requiredPlaytimeSeconds: result.requiredSeconds,
    })
  } catch (error) {
    log.error('review_post_failed', { error })
    return NextResponse.json(
      {
        error: 'REVIEW_POST_FAILED',
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
      },
      { status: 500 },
    )
  }
}
