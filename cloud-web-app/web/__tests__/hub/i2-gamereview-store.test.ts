/**

 * Hub I.2 GameReview store CORE — durable authority + playtime gate + honesty flip.

 */



import fs from 'node:fs/promises'

import os from 'node:os'

import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'



import {

  evaluateHubHonesty,

  evaluateVerifiedReviewGate,

} from '@/lib/hub/hub-honesty-capability'

import {

  evaluateLiveOpsF2Honesty,

  probeLiveOpsF2Honesty,

} from '@/lib/liveops/liveops-f2-capability'

import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

import {

  listVerifiedReviews,

  submitVerifiedReview,

  VERIFIED_REVIEW_REQUIRED_SECONDS,

} from '@/lib/hub/verified-reviews'



describe('I.2 GameReview durable store', () => {

  const prevReviews = process.env.AETHEL_HUB_REVIEWS_ROOT

  const prevStats = process.env.AETHEL_LIVEOPS_STATS_ROOT

  let tmpReviews: string

  let tmpStats: string



  afterEach(async () => {

    if (prevReviews === undefined) delete process.env.AETHEL_HUB_REVIEWS_ROOT

    else process.env.AETHEL_HUB_REVIEWS_ROOT = prevReviews

    if (prevStats === undefined) delete process.env.AETHEL_LIVEOPS_STATS_ROOT

    else process.env.AETHEL_LIVEOPS_STATS_ROOT = prevStats

    if (tmpReviews) {

      await fs.rm(tmpReviews, { recursive: true, force: true }).catch(() => undefined)

    }

    if (tmpStats) {

      await fs.rm(tmpStats, { recursive: true, force: true }).catch(() => undefined)

    }

  })



  it('persists reviews under .aethel/hub/reviews and lists empty-honest', async () => {

    tmpReviews = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-reviews-'))

    process.env.AETHEL_HUB_REVIEWS_ROOT = tmpReviews



    const {

      upsertGameReview,

      listGameReviews,

      summarizeReviews,

      probeReviewsStoreWritable,

    } = await import('@/lib/hub/game-review-authority')



    const empty = await listGameReviews('neon-runner')

    expect(empty).toEqual([])

    expect(summarizeReviews(empty)).toEqual({ count: 0, averageRating: null })



    const row = await upsertGameReview({

      userId: 'user-a',

      gameId: 'neon-runner',

      rating: 4,

      body: 'Solid dash',

      verifiedPlaytimeSeconds: 7200,

    })

    expect(row.rating).toBe(4)

    expect(row.verifiedPlaytimeSeconds).toBe(7200)



    const listed = await listGameReviews('neon-runner')

    expect(listed).toHaveLength(1)

    expect(listed[0].body).toBe('Solid dash')

    expect(summarizeReviews(listed).averageRating).toBe(4)



    const probe = await probeReviewsStoreWritable()

    expect(probe.writable).toBe(true)

    expect(probe.root).toBe(tmpReviews)

  })



  it('rejects POST without F.2 playtime evidence; accepts at 7200s', async () => {

    tmpReviews = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-gate-'))

    tmpStats = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i2-stats-'))

    process.env.AETHEL_HUB_REVIEWS_ROOT = tmpReviews

    process.env.AETHEL_LIVEOPS_STATS_ROOT = tmpStats



    const short = await submitVerifiedReview({

      userId: 'user-b',

      gameId: 'haunted-cabin',

      rating: 1,

      body: 'bomb attempt',

      playtimeTelemetryReady: true,

      reviewsStoreReady: true,

    })

    expect(short.ok).toBe(false)

    if (!short.ok) {

      expect(short.code).toBe('PLAYTIME_GATE')

      expect(short.requiredSeconds).toBe(VERIFIED_REVIEW_REQUIRED_SECONDS)

    }



    const { recordSessionPlaytime } = await import('@/lib/liveops/player-playtime-authority')

    await recordSessionPlaytime({

      userId: 'user-b',

      gameId: 'haunted-cabin',

      deltaSeconds: 7200,

    })



    const ok = await submitVerifiedReview({

      userId: 'user-b',

      gameId: 'haunted-cabin',

      rating: 5,

      body: 'Earned after 2h',

      playtimeTelemetryReady: true,

      reviewsStoreReady: true,

    })

    expect(ok.ok).toBe(true)

    if (ok.ok) {

      expect(ok.review.rating).toBe(5)

      expect(ok.playtimeSeconds).toBe(7200)

    }



    const list = await listVerifiedReviews('haunted-cabin')

    expect(list.count).toBe(1)

    expect(list.mock).toBe(false)

    expect(list.averageRating).toBe(5)

  })



  it('blocks when reviewsStoreReady is false even with playtime', async () => {

    const blocked = await submitVerifiedReview({

      userId: 'user-c',

      gameId: 'oss-kit',

      rating: 3,

      playtimeTelemetryReady: true,

      reviewsStoreReady: false,

    })

    expect(blocked.ok).toBe(false)

    if (!blocked.ok) expect(blocked.code).toBe('REVIEWS_STORE_HELD')

  })

})



describe('I.2 honesty flip when store + playtime ready', () => {

  it('probeLiveOpsF2Honesty sets reviewsStoreReady when reviews root writable', async () => {

    const report = await probeLiveOpsF2Honesty()

    expect(report.playtimeTelemetryReady).toBe(true)

    expect(report.reviewsStoreReady).toBe(true)

    expect(report.reviewsStore.status).toBe('IMPLEMENTED')

    // I.1 Discovery Feed engine CORE — probe flips when engine module ready
    expect(report.discoveryFeedReady).toBe(true)

    expect(report.productCopy).toMatch(/GameReview|2h|discovery/i)

    expect(report.productCopy).toMatch(/\[HELD\]/)

  })



  it('Hub marketing verified reviews allowed only when both flags true', () => {

    const partial = evaluateHubHonesty({

      arcadeCatalogAvailable: true,

      hasPublishedGames: true,

      playtimeTelemetryReady: true,

      reviewsStoreReady: false,

    })

    expect(partial.marketingVerifiedReviewsAllowed).toBe(false)



    const live = evaluateHubHonesty({

      arcadeCatalogAvailable: true,

      hasPublishedGames: true,

      playtimeTelemetryReady: true,

      reviewsStoreReady: true,

    })

    expect(live.reviews.status).toBe('IMPLEMENTED')

    expect(live.marketingVerifiedReviewsAllowed).toBe(true)

    expect(live.marketingDiscoveryAllowed).toBe(false)

    expect(live.productCopy).toMatch(/2h/i)

    expect(live.productCopy).toMatch(/discovery|HELD/i)



    expect(

      evaluateVerifiedReviewGate({

        playtimeTelemetryReady: true,

        reviewsStoreReady: true,

        playtimeSeconds: 7200,

      }).allowed,

    ).toBe(true)

  })



  it('evaluateLiveOpsF2Honesty still defaults reviewsStoreReady false without input', () => {

    const ready = evaluateLiveOpsF2Honesty({

      spoolModuleReady: true,

      playtimeIngestReady: true,

      playerStatsWritable: true,

    })

    expect(ready.playtimeTelemetryReady).toBe(true)

    expect(ready.reviewsStoreReady).toBe(false)

  })



  it('updates /arcade maturity notes for I.2 store', () => {

    const arcade = getRouteMaturityEntry('/arcade')

    expect(arcade?.notes).toMatch(/I\.2|GameReview/i)

    expect(arcade?.notes).toMatch(/I\.1|discovery/i)

    expect(arcade?.notes).toMatch(/HELD/i)

  })

})


