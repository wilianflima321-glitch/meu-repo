/**
 * Hub I.2 deepen — helpful-vote authority + early-access creator opt-in.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  EARLY_ACCESS_REVIEW_REQUIRED_SECONDS,
  getEarlyAccessTitleFlag,
  isEarlyAccessReviewsEnabled,
  probeEarlyAccessStoreWritable,
  setEarlyAccessOptIn,
} from '@/lib/hub/early-access-title-authority'
import {
  aggregateHelpfulVotes,
  castHelpfulVote,
  getHelpfulVote,
  helpfulVoteWeightFromPlaytime,
  probeHelpfulVotesWritable,
  removeHelpfulVote,
} from '@/lib/hub/helpful-vote-authority'
import { evaluateHubHonesty } from '@/lib/hub/hub-honesty-capability'
import {
  castVerifiedHelpfulVote,
  listVerifiedReviews,
  submitVerifiedReview,
  VERIFIED_REVIEW_REQUIRED_SECONDS,
} from '@/lib/hub/verified-reviews'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

describe('I.2 helpful-vote authority', () => {
  const prevVotes = process.env.AETHEL_HUB_REVIEW_VOTES_ROOT
  let tmpVotes: string

  afterEach(async () => {
    if (prevVotes === undefined) delete process.env.AETHEL_HUB_REVIEW_VOTES_ROOT
    else process.env.AETHEL_HUB_REVIEW_VOTES_ROOT = prevVotes
    if (tmpVotes) {
      await fs.rm(tmpVotes, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('tiers playtime weight honestly and stores one vote per voter', async () => {
    expect(helpfulVoteWeightFromPlaytime(0)).toBe(1)
    expect(helpfulVoteWeightFromPlaytime(1800)).toBe(2)
    expect(helpfulVoteWeightFromPlaytime(7200)).toBe(3)
    expect(helpfulVoteWeightFromPlaytime(36000)).toBe(4)

    tmpVotes = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-votes-'))
    process.env.AETHEL_HUB_REVIEW_VOTES_ROOT = tmpVotes

    const first = await castHelpfulVote({
      gameId: 'neon-runner',
      reviewId: 'gr_a',
      voterId: 'voter-1',
      voterPlaytimeSeconds: 7200,
    })
    expect(first.weight).toBe(3)

    const again = await castHelpfulVote({
      gameId: 'neon-runner',
      reviewId: 'gr_a',
      voterId: 'voter-1',
      voterPlaytimeSeconds: 36000,
    })
    expect(again.id).toBe(first.id)
    expect(again.weight).toBe(4)

    await castHelpfulVote({
      gameId: 'neon-runner',
      reviewId: 'gr_a',
      voterId: 'voter-2',
      voterPlaytimeSeconds: 100,
    })

    const agg = await aggregateHelpfulVotes('neon-runner', 'gr_a')
    expect(agg.count).toBe(2)
    expect(agg.weight).toBe(5)
    expect(await getHelpfulVote('neon-runner', 'gr_a', 'voter-1')).not.toBeNull()

    expect(await removeHelpfulVote('neon-runner', 'gr_a', 'voter-2')).toBe(true)
    const after = await aggregateHelpfulVotes('neon-runner', 'gr_a')
    expect(after.count).toBe(1)
    expect(after.weight).toBe(4)

    const probe = await probeHelpfulVotesWritable()
    expect(probe.writable).toBe(true)
    expect(probe.root).toBe(tmpVotes)
  })
})

describe('I.2 early-access creator opt-in', () => {
  const prevEa = process.env.AETHEL_HUB_EARLY_ACCESS_ROOT
  const prevReviews = process.env.AETHEL_HUB_REVIEWS_ROOT
  const prevStats = process.env.AETHEL_LIVEOPS_STATS_ROOT
  let tmpEa: string
  let tmpReviews: string
  let tmpStats: string

  afterEach(async () => {
    if (prevEa === undefined) delete process.env.AETHEL_HUB_EARLY_ACCESS_ROOT
    else process.env.AETHEL_HUB_EARLY_ACCESS_ROOT = prevEa
    if (prevReviews === undefined) delete process.env.AETHEL_HUB_REVIEWS_ROOT
    else process.env.AETHEL_HUB_REVIEWS_ROOT = prevReviews
    if (prevStats === undefined) delete process.env.AETHEL_LIVEOPS_STATS_ROOT
    else process.env.AETHEL_LIVEOPS_STATS_ROOT = prevStats
    for (const dir of [tmpEa, tmpReviews, tmpStats]) {
      if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('defaults off and rejects non-creator when authorId known', async () => {
    tmpEa = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-ea-'))
    process.env.AETHEL_HUB_EARLY_ACCESS_ROOT = tmpEa

    expect(await isEarlyAccessReviewsEnabled('short-game')).toBe(false)
    expect(await getEarlyAccessTitleFlag('short-game')).toBeNull()

    await expect(
      setEarlyAccessOptIn({
        gameId: 'short-game',
        userId: 'intruder',
        enabled: true,
        authorId: 'creator-a',
      }),
    ).rejects.toMatchObject({ code: 'EARLY_ACCESS_NOT_CREATOR' })

    const flag = await setEarlyAccessOptIn({
      gameId: 'short-game',
      userId: 'creator-a',
      enabled: true,
      authorId: 'creator-a',
    })
    expect(flag.enabled).toBe(true)
    expect(flag.requiredSeconds).toBe(EARLY_ACCESS_REVIEW_REQUIRED_SECONDS)
    expect(await isEarlyAccessReviewsEnabled('short-game')).toBe(true)

    const probe = await probeEarlyAccessStoreWritable()
    expect(probe.writable).toBe(true)
  })

  it('accepts early-access review at 30m when opted in; still blocks below', async () => {
    tmpEa = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-ea-gate-'))
    tmpReviews = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-ea-rev-'))
    tmpStats = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-ea-stats-'))
    process.env.AETHEL_HUB_EARLY_ACCESS_ROOT = tmpEa
    process.env.AETHEL_HUB_REVIEWS_ROOT = tmpReviews
    process.env.AETHEL_LIVEOPS_STATS_ROOT = tmpStats

    await setEarlyAccessOptIn({
      gameId: 'haunted-cabin',
      userId: 'creator-a',
      enabled: true,
    })

    const { recordSessionPlaytime } = await import('@/lib/liveops/player-playtime-authority')
    await recordSessionPlaytime({
      userId: 'player-ea',
      gameId: 'haunted-cabin',
      deltaSeconds: 900,
    })

    const tooShort = await submitVerifiedReview({
      userId: 'player-ea',
      gameId: 'haunted-cabin',
      rating: 4,
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(tooShort.ok).toBe(false)
    if (!tooShort.ok) {
      expect(tooShort.code).toBe('PLAYTIME_GATE')
      expect(tooShort.requiredSeconds).toBe(EARLY_ACCESS_REVIEW_REQUIRED_SECONDS)
    }

    await recordSessionPlaytime({
      userId: 'player-ea',
      gameId: 'haunted-cabin',
      deltaSeconds: 900,
    })

    const ok = await submitVerifiedReview({
      userId: 'player-ea',
      gameId: 'haunted-cabin',
      rating: 4,
      body: 'Early access thoughts',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.review.isEarlyAccess).toBe(true)
      expect(ok.requiredSeconds).toBe(EARLY_ACCESS_REVIEW_REQUIRED_SECONDS)
      expect(ok.playtimeSeconds).toBe(1800)
    }

    const listed = await listVerifiedReviews('haunted-cabin')
    expect(listed.earlyAccessOptIn).toBe(true)
    expect(listed.requiredPlaytimeSeconds).toBe(EARLY_ACCESS_REVIEW_REQUIRED_SECONDS)
    expect(listed.reviews[0]?.isEarlyAccess).toBe(true)
  })
})

describe('I.2 helpful votes wired into verified list ranking', () => {
  const prevReviews = process.env.AETHEL_HUB_REVIEWS_ROOT
  const prevStats = process.env.AETHEL_LIVEOPS_STATS_ROOT
  const prevVotes = process.env.AETHEL_HUB_REVIEW_VOTES_ROOT
  let tmpReviews: string
  let tmpStats: string
  let tmpVotes: string

  afterEach(async () => {
    if (prevReviews === undefined) delete process.env.AETHEL_HUB_REVIEWS_ROOT
    else process.env.AETHEL_HUB_REVIEWS_ROOT = prevReviews
    if (prevStats === undefined) delete process.env.AETHEL_LIVEOPS_STATS_ROOT
    else process.env.AETHEL_LIVEOPS_STATS_ROOT = prevStats
    if (prevVotes === undefined) delete process.env.AETHEL_HUB_REVIEW_VOTES_ROOT
    else process.env.AETHEL_HUB_REVIEW_VOTES_ROOT = prevVotes
    for (const dir of [tmpReviews, tmpStats, tmpVotes]) {
      if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('ranks by helpful weight and blocks self-votes', async () => {
    tmpReviews = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-rank-rev-'))
    tmpStats = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-rank-stats-'))
    tmpVotes = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-rank-votes-'))
    process.env.AETHEL_HUB_REVIEWS_ROOT = tmpReviews
    process.env.AETHEL_LIVEOPS_STATS_ROOT = tmpStats
    process.env.AETHEL_HUB_REVIEW_VOTES_ROOT = tmpVotes

    const { recordSessionPlaytime } = await import('@/lib/liveops/player-playtime-authority')
    for (const userId of ['author-a', 'author-b', 'voter-heavy', 'voter-light']) {
      await recordSessionPlaytime({
        userId,
        gameId: 'rank-game',
        deltaSeconds: VERIFIED_REVIEW_REQUIRED_SECONDS,
      })
    }
    await recordSessionPlaytime({
      userId: 'voter-heavy',
      gameId: 'rank-game',
      deltaSeconds: 30_000,
    })

    const a = await submitVerifiedReview({
      userId: 'author-a',
      gameId: 'rank-game',
      rating: 5,
      body: 'First',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    const b = await submitVerifiedReview({
      userId: 'author-b',
      gameId: 'rank-game',
      rating: 3,
      body: 'Second',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return

    const self = await castVerifiedHelpfulVote({
      userId: 'author-b',
      gameId: 'rank-game',
      reviewId: b.review.id,
      reviewsStoreReady: true,
    })
    expect(self.ok).toBe(false)
    if (!self.ok) expect(self.code).toBe('HELPFUL_VOTE_SELF')

    const heavy = await castVerifiedHelpfulVote({
      userId: 'voter-heavy',
      gameId: 'rank-game',
      reviewId: b.review.id,
      reviewsStoreReady: true,
    })
    expect(heavy.ok).toBe(true)

    const light = await castVerifiedHelpfulVote({
      userId: 'voter-light',
      gameId: 'rank-game',
      reviewId: a.review.id,
      reviewsStoreReady: true,
    })
    expect(light.ok).toBe(true)

    const listed = await listVerifiedReviews('rank-game', { viewerUserId: 'voter-heavy' })
    expect(listed.sort).toBe('helpful_weight')
    expect(listed.reviews[0]?.id).toBe(b.review.id)
    expect(listed.reviews[0]?.helpfulWeight).toBeGreaterThan(listed.reviews[1]?.helpfulWeight ?? 0)
    expect(listed.reviews[0]?.viewerHasVoted).toBe(true)
    expect(listed.reviews[1]?.viewerHasVoted).toBe(false)
  })
})

describe('I.2 deepen honesty notes', () => {
  it('documents helpful votes + early-access in Hub / arcade maturity', () => {
    const live = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
      discoveryFeedReady: true,
      impressionLedgerReady: true,
      aiModerationReady: true,
      socialModerationReady: true,
      socialPartyReady: true,
    })
    expect(live.marketingVerifiedReviewsAllowed).toBe(true)
    expect(live.reviews.notes.some((n) => /helpful/i.test(n))).toBe(true)
    expect(live.reviews.notes.some((n) => /early-access|Early Access/i.test(n))).toBe(true)
    expect(live.productCopy).toMatch(/helpful|early-access/i)
    expect(live.productCopy).toMatch(/\[HELD\]/)
    expect(live.marketingHubCheckoutAllowed).toBe(false)

    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/helpful|EA|early/i)
  })
})
