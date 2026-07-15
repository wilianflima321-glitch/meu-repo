import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  castVerifiedHelpfulVote,
  removeVerifiedHelpfulVote,
} from '@/lib/hub/verified-reviews'
import { probeLiveOpsF2Honesty } from '@/lib/liveops/liveops-f2-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/games/[slug]/reviews/[reviewId]/helpful/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_REVIEW_HELPFUL_VOTE'

/**
 * I.2 deepen — durable helpful vote (one per user per review).
 * Weight from voter F.2 playtime tier. No fake counts.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; reviewId: string } },
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
    const reviewId = String(params.reviewId || '').trim()
    if (!gameId || !reviewId) {
      return NextResponse.json({ error: 'REVIEW_TARGET_REQUIRED' }, { status: 400 })
    }

    const f2 = await probeLiveOpsF2Honesty()
    const result = await castVerifiedHelpfulVote({
      userId,
      gameId,
      reviewId,
      reviewsStoreReady: f2.reviewsStoreReady,
    })

    if (!result.ok) {
      log.info('helpful_vote_rejected', { userId, gameId, reviewId, code: result.code })
      return NextResponse.json(
        {
          error: result.code,
          reason: result.reason,
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: f2.reviewsStoreReady ? 'IMPLEMENTED' : 'HELD',
        },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      vote: result.vote,
      helpfulCount: result.aggregate.count,
      helpfulWeight: result.aggregate.weight,
    })
  } catch (error) {
    log.error('helpful_vote_failed', { error })
    return NextResponse.json(
      { error: 'HELPFUL_VOTE_FAILED', capability: CAPABILITY, capabilityStatus: 'IMPLEMENTED' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string; reviewId: string } },
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
    const reviewId = String(params.reviewId || '').trim()
    if (!gameId || !reviewId) {
      return NextResponse.json({ error: 'REVIEW_TARGET_REQUIRED' }, { status: 400 })
    }

    const f2 = await probeLiveOpsF2Honesty()
    const result = await removeVerifiedHelpfulVote({
      userId,
      gameId,
      reviewId,
      reviewsStoreReady: f2.reviewsStoreReady,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.code,
          reason: result.reason,
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: 'HELD',
        },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      removed: result.removed,
      helpfulCount: result.aggregate.count,
      helpfulWeight: result.aggregate.weight,
    })
  } catch (error) {
    log.error('helpful_vote_remove_failed', { error })
    return NextResponse.json(
      { error: 'HELPFUL_VOTE_REMOVE_FAILED', capability: CAPABILITY },
      { status: 500 },
    )
  }
}
