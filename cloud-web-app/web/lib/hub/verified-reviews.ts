/**
 * I.2 — Verified reviews service.
 * Fail-closed: F.2 playtime evidence + GameReview store + gate before accept.
 * Deepen: helpful-vote ranking + early-access creator opt-in (30m when enabled).
 */

import {
  EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
  getEarlyAccessTitleFlag,
  isEarlyAccessReviewsEnabled,
} from '@/lib/hub/early-access-title-authority'
import {
  getGameReview,
  getGameReviewById,
  listGameReviews,
  summarizeReviews,
  upsertGameReview,
  type GameReview,
} from '@/lib/hub/game-review-authority'
import {
  aggregateHelpfulVotes,
  castHelpfulVote,
  getHelpfulVote,
  removeHelpfulVote,
} from '@/lib/hub/helpful-vote-authority'
import { evaluateVerifiedReviewGate } from '@/lib/hub/hub-honesty-capability'
import { getPlayerGameStats } from '@/lib/liveops/player-playtime-authority'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('verified-reviews')

/** Law XIV.2 / GF-HUB-002 — 2 hours verified playtime. */
export const VERIFIED_REVIEW_REQUIRED_SECONDS = 7200

export type VerifiedReviewRow = GameReview & {
  helpfulCount: number
  helpfulWeight: number
  viewerHasVoted: boolean
}

export type VerifiedReviewListResult = {
  gameId: string
  reviews: VerifiedReviewRow[]
  count: number
  averageRating: number | null
  mock: false
  earlyAccessOptIn: boolean
  requiredPlaytimeSeconds: number
  sort: 'helpful_weight'
}

export type SubmitVerifiedReviewInput = {
  userId: string
  gameId: string
  rating: number
  body?: string
  playtimeTelemetryReady: boolean
  reviewsStoreReady: boolean
  /**
   * Override creator early-access flag (tests).
   * Production resolves from early-access-title-authority when omitted.
   */
  earlyAccessOptIn?: boolean
  earlyAccessRequiredSeconds?: number
}

export type SubmitVerifiedReviewResult =
  | { ok: true; review: GameReview; playtimeSeconds: number; requiredSeconds: number }
  | {
      ok: false
      code: string
      reason: string
      playtimeSeconds: number
      requiredSeconds: number
      status: number
    }

export type CastVerifiedHelpfulVoteInput = {
  userId: string
  gameId: string
  reviewId: string
  reviewsStoreReady: boolean
}

export type CastVerifiedHelpfulVoteResult =
  | {
      ok: true
      vote: Awaited<ReturnType<typeof castHelpfulVote>>
      aggregate: Awaited<ReturnType<typeof aggregateHelpfulVotes>>
    }
  | { ok: false; code: string; reason: string; status: number }

async function resolveReviewGateSeconds(gameId: string, override?: boolean): Promise<{
  earlyAccessOptIn: boolean
  requiredSeconds: number
}> {
  const opted =
    override === true
      ? true
      : override === false
        ? false
        : await isEarlyAccessReviewsEnabled(gameId)
  if (!opted) {
    return { earlyAccessOptIn: false, requiredSeconds: VERIFIED_REVIEW_REQUIRED_SECONDS }
  }
  const flag = await getEarlyAccessTitleFlag(gameId)
  const requiredSeconds = Math.max(
    EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
    Math.floor(flag?.requiredSeconds ?? EARLY_ACCESS_REVIEW_REQUIRED_SECONDS),
  )
  return { earlyAccessOptIn: true, requiredSeconds }
}

function sortByHelpfulWeight(rows: VerifiedReviewRow[]): VerifiedReviewRow[] {
  return [...rows].sort((a, b) => {
    if (b.helpfulWeight !== a.helpfulWeight) return b.helpfulWeight - a.helpfulWeight
    if (b.helpfulCount !== a.helpfulCount) return b.helpfulCount - a.helpfulCount
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export async function listVerifiedReviews(
  gameId: string,
  opts?: { viewerUserId?: string },
): Promise<VerifiedReviewListResult> {
  const id = String(gameId || '').trim()
  const reviews = id ? await listGameReviews(id) : []
  const summary = summarizeReviews(reviews)
  const gate = id
    ? await resolveReviewGateSeconds(id)
    : { earlyAccessOptIn: false, requiredSeconds: VERIFIED_REVIEW_REQUIRED_SECONDS }

  const enriched: VerifiedReviewRow[] = []
  for (const review of reviews) {
    const agg = await aggregateHelpfulVotes(id, review.id)
    const viewerHasVoted =
      opts?.viewerUserId
        ? Boolean(await getHelpfulVote(id, review.id, opts.viewerUserId))
        : false
    enriched.push({
      ...review,
      helpfulCount: agg.count,
      helpfulWeight: agg.weight,
      viewerHasVoted,
    })
  }

  return {
    gameId: id,
    reviews: sortByHelpfulWeight(enriched),
    count: summary.count,
    averageRating: summary.averageRating,
    mock: false,
    earlyAccessOptIn: gate.earlyAccessOptIn,
    requiredPlaytimeSeconds: gate.requiredSeconds,
    sort: 'helpful_weight',
  }
}

export async function getUserVerifiedReview(
  gameId: string,
  userId: string,
): Promise<GameReview | null> {
  return getGameReview(gameId, userId)
}

/**
 * Accept a review only when store + F.2 playtime path are ready and threshold met.
 */
export async function submitVerifiedReview(
  input: SubmitVerifiedReviewInput,
): Promise<SubmitVerifiedReviewResult> {
  const gameId = String(input.gameId || '').trim()
  const userId = String(input.userId || '').trim()

  const gateSeconds = await resolveReviewGateSeconds(
    gameId,
    typeof input.earlyAccessOptIn === 'boolean' ? input.earlyAccessOptIn : undefined,
  )
  const requiredSeconds =
    input.earlyAccessOptIn === true && input.earlyAccessRequiredSeconds != null
      ? Math.max(
          EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
          Math.floor(input.earlyAccessRequiredSeconds),
        )
      : gateSeconds.requiredSeconds
  const earlyAccessOptIn = gateSeconds.earlyAccessOptIn || input.earlyAccessOptIn === true

  const stats = userId && gameId ? await getPlayerGameStats(userId, gameId) : null
  const playtimeSeconds = stats?.playtimeSeconds ?? 0

  const gate = evaluateVerifiedReviewGate({
    playtimeTelemetryReady: input.playtimeTelemetryReady,
    reviewsStoreReady: input.reviewsStoreReady,
    playtimeSeconds,
    requiredSeconds,
  })

  if (!gate.allowed) {
    const status =
      gate.code === 'REVIEWS_HELD' || gate.code === 'REVIEWS_STORE_HELD' ? 503 : 403
    log.info('verified_review_rejected', {
      userId,
      gameId,
      code: gate.code,
      playtimeSeconds,
      requiredSeconds,
      earlyAccessOptIn,
    })
    return {
      ok: false,
      code: gate.code ?? 'REVIEW_REJECTED',
      reason: gate.reason,
      playtimeSeconds,
      requiredSeconds,
      status,
    }
  }

  try {
    const review = await upsertGameReview({
      userId,
      gameId,
      rating: input.rating,
      body: input.body,
      verifiedPlaytimeSeconds: playtimeSeconds,
      isEarlyAccess:
        earlyAccessOptIn && requiredSeconds < VERIFIED_REVIEW_REQUIRED_SECONDS,
    })
    return { ok: true, review, playtimeSeconds, requiredSeconds }
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : 'REVIEW_PERSIST_FAILED'
    return {
      ok: false,
      code,
      reason: err instanceof Error ? err.message : String(err),
      playtimeSeconds,
      requiredSeconds,
      status: code === 'REVIEW_RATING_INVALID' ? 400 : 500,
    }
  }
}

/**
 * Cast a durable helpful vote — one per user per review; weight from voter playtime.
 */
export async function castVerifiedHelpfulVote(
  input: CastVerifiedHelpfulVoteInput,
): Promise<CastVerifiedHelpfulVoteResult> {
  const gameId = String(input.gameId || '').trim()
  const reviewId = String(input.reviewId || '').trim()
  const userId = String(input.userId || '').trim()

  if (!input.reviewsStoreReady) {
    return {
      ok: false,
      code: 'REVIEWS_STORE_HELD',
      reason: 'GameReview / helpful-vote path [HELD] until reviews store writable',
      status: 503,
    }
  }
  if (!gameId || !reviewId || !userId) {
    return {
      ok: false,
      code: 'HELPFUL_VOTE_IDENTITY_REQUIRED',
      reason: 'gameId, reviewId, and userId required',
      status: 400,
    }
  }

  const review = await getGameReviewById(gameId, reviewId)
  if (!review) {
    return {
      ok: false,
      code: 'REVIEW_NOT_FOUND',
      reason: 'No verified review for this id',
      status: 404,
    }
  }
  if (review.userId === userId) {
    return {
      ok: false,
      code: 'HELPFUL_VOTE_SELF',
      reason: 'Cannot mark your own review helpful',
      status: 403,
    }
  }

  const stats = await getPlayerGameStats(userId, gameId)
  const voterPlaytimeSeconds = stats?.playtimeSeconds ?? 0

  try {
    const vote = await castHelpfulVote({
      gameId,
      reviewId,
      voterId: userId,
      voterPlaytimeSeconds,
    })
    const aggregate = await aggregateHelpfulVotes(gameId, reviewId)
    return { ok: true, vote, aggregate }
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : 'HELPFUL_VOTE_FAILED'
    return {
      ok: false,
      code,
      reason: err instanceof Error ? err.message : String(err),
      status: 500,
    }
  }
}

export async function removeVerifiedHelpfulVote(input: {
  userId: string
  gameId: string
  reviewId: string
  reviewsStoreReady: boolean
}): Promise<
  | { ok: true; removed: boolean; aggregate: Awaited<ReturnType<typeof aggregateHelpfulVotes>> }
  | { ok: false; code: string; reason: string; status: number }
> {
  if (!input.reviewsStoreReady) {
    return {
      ok: false,
      code: 'REVIEWS_STORE_HELD',
      reason: 'GameReview / helpful-vote path [HELD] until reviews store writable',
      status: 503,
    }
  }
  const gameId = String(input.gameId || '').trim()
  const reviewId = String(input.reviewId || '').trim()
  const userId = String(input.userId || '').trim()
  const removed = await removeHelpfulVote(gameId, reviewId, userId)
  const aggregate = await aggregateHelpfulVotes(gameId, reviewId)
  return { ok: true, removed, aggregate }
}
