/**
 * RTv1 operational loop — playtime wiring + publish listing compression evidence.
 * Fail-closed when Compression Mandate evidence is absent; pass only with measured bytes.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildDiscoveryFeed,
  DISCOVERY_MAX_DEMO_BUNDLE_BYTES,
} from '@/lib/hub/discovery-feed-engine'
import {
  evaluatePublishListingEvidence,
  readPublishListingEvidence,
  resolveHubDemoListingLabel,
  stampPublishListingEvidence,
} from '@/lib/hub/publish-listing-authority'
import {
  buildMeasuredExportBundleEvidence,
  mergeExportJobCompressionOptions,
} from '@/lib/hub/export-bundle-measurement'
import {
  DEMO_WEB_SLICE_HOST_HELD_REASON,
  evaluateDemoWebSliceStage,
  isInstantPlayHtmlUrl,
  resolveDemoPlayUrlFromExportEvidence,
} from '@/lib/production/demo-web-slice'
import { createMemoryTelemetrySpool } from '@/lib/liveops/telemetry-spool'
import {
  enqueueSessionPlaytime,
  flushPlaytimeSpool,
} from '@/lib/liveops/playtime-client'
import {
  resolveViewerReviewEligibility,
  submitVerifiedReview,
  VERIFIED_REVIEW_REQUIRED_SECONDS,
} from '@/lib/hub/verified-reviews'

/** Law XV bake evidence shape required for Instant Play listing (never invented). */
const LAW_XV_BAKE = {
  bakeReceiptRef: 'bake:rtv1:lightmap-v1',
  lightmapBytes: 4096,
} as const

describe('RTv1 measured export/cook bundle evidence', () => {
  it('stamps measured size into export options for listing authority', () => {
    const measured = buildMeasuredExportBundleEvidence({
      artifactByteLength: 42 * 1024 * 1024,
      cookPackByteLength: 1024,
    })
    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.evidence.fileSize).toBe(42 * 1024 * 1024)
    expect(measured.evidence.compressionMandatePassed).toBe(true)
    expect(measured.evidence.cookPackByteLength).toBe(1024)

    const options = mergeExportJobCompressionOptions({ keep: true }, measured.evidence)
    expect(options.demoBundleBytes).toBe(42 * 1024 * 1024)
    expect(options.cookPackByteLength).toBe(1024)
    expect(options.compressionMandatePassed).toBe(true)
    expect(options.keep).toBe(true)

    const listing = evaluatePublishListingEvidence({
      gameId: 'measured-demo',
      instantPlayHtmlUrl: 'https://cdn.example/demo/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: measured.evidence.fileSize,
      cookPackByteLength: measured.evidence.cookPackByteLength,
      explicitCompressionMandatePassed: options.compressionMandatePassed === true,
      ...LAW_XV_BAKE,
    })
    expect(listing.compressionMandatePassed).toBe(true)
    expect(listing.demoPlayUrl).toBe('https://cdn.example/demo/index.html')
    expect(listing.demoBundleBytes).toBe(42 * 1024 * 1024)
  })

  it('fail-closes when measurement is missing (never invents size)', () => {
    const missing = buildMeasuredExportBundleEvidence({ artifactByteLength: 0 })
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.reason).toMatch(/bundle_measurement_missing/)
  })

  it('marks oversize bundles compressionMandatePassed=false', () => {
    const oversize = buildMeasuredExportBundleEvidence({
      artifactByteLength: DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1,
    })
    expect(oversize.ok).toBe(true)
    if (!oversize.ok) return
    expect(oversize.evidence.compressionMandatePassed).toBe(false)
    expect(oversize.evidence.oversize).toBe(true)

    const listing = evaluatePublishListingEvidence({
      gameId: 'too-big',
      instantPlayHtmlUrl: 'https://cdn.example/big/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: oversize.evidence.fileSize,
      explicitCompressionMandatePassed: oversize.evidence.compressionMandatePassed,
      ...LAW_XV_BAKE,
    })
    expect(listing.compressionMandatePassed).toBe(false)
    expect(listing.demoBundleBytes).toBe(DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1)
    // Bake present → Instant Play URL retained; Compression Mandate still fails oversize.
    expect(listing.demoPlayUrl).toBe('https://cdn.example/big/index.html')
  })
})

describe('RTv1 demo-web-slice Instant Play honesty', () => {
  it('accepts hosted HTML Instant Play URLs and rejects zip download URLs', () => {
    expect(isInstantPlayHtmlUrl('https://cdn.example/demo/index.html')).toBe(true)
    expect(isInstantPlayHtmlUrl('https://cdn.example/exports/job.zip')).toBe(false)
    expect(
      isInstantPlayHtmlUrl('https://app.example/api/render/jobs/1/artifact?format=web-static'),
    ).toBe(false)
  })

  it('sets demoPlayUrl only when demo-web-slice is ready with HTML URL', () => {
    const ready = resolveDemoPlayUrlFromExportEvidence({
      explicitDemoPlayUrl: 'https://cdn.example/oss/index.html',
      demoWebSliceReady: true,
    })
    expect(ready.demoPlayUrl).toBe('https://cdn.example/oss/index.html')
    expect(ready.status).toBe('ready')

    const zipOnly = resolveDemoPlayUrlFromExportEvidence({
      webExportDownloadUrl: 'https://cdn.example/exports/webexp_1.zip',
      demoWebSliceReady: false,
    })
    expect(zipOnly.demoPlayUrl).toBeNull()
    expect(zipOnly.status).toBe('held')
    expect(zipOnly.reason).toMatch(/demo_web_slice_held/)
  })

  it('holds web-static Instant Play until hosted HTML boot exists (no placeholder theater)', () => {
    const stage = evaluateDemoWebSliceStage({
      target: 'web-static',
      demoWebSliceReady: false,
      instantPlayHtmlUrl: null,
    })
    expect(stage.allowed).toBe(false)
    expect(stage.shipStatus).toBe('HELD')
    expect(stage.demoPlayUrl).toBeNull()
    expect(stage.reason).toBe(DEMO_WEB_SLICE_HOST_HELD_REASON)
    expect(stage.reason).toMatch(/runtime-main/)
    expect(stage.reason).toMatch(/Placeholder index\.html|addWebTemplate/i)
  })

  it('listing: slice+bake → demoPlayUrl; missing bake / zip-only → fail-closed Instant Play; noWebDemo honest', () => {
    const withSlice = evaluatePublishListingEvidence({
      gameId: 'with-slice',
      instantPlayHtmlUrl: 'https://cdn.example/play/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: 8 * 1024 * 1024,
      ...LAW_XV_BAKE,
    })
    expect(withSlice.demoPlayUrl).toBe('https://cdn.example/play/index.html')
    expect(withSlice.noWebDemo).toBe(false)
    expect(withSlice.compressionMandatePassed).toBe(true)

    const missingBake = evaluatePublishListingEvidence({
      gameId: 'slice-no-bake',
      instantPlayHtmlUrl: 'https://cdn.example/play/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: 8 * 1024 * 1024,
    })
    expect(missingBake.demoPlayUrl).toBeNull()
    expect(missingBake.compressionMandatePassed).toBe(false)
    expect(missingBake.reason).toMatch(/law_xv_bake_missing/)
    expect(resolveHubDemoListingLabel(missingBake)).toBe('build_pending')

    const zipOnly = evaluatePublishListingEvidence({
      gameId: 'zip-only',
      webExportDownloadUrl: 'https://cdn.example/exports/job.zip',
      webExportFileSizeBytes: 8 * 1024 * 1024,
      demoWebSliceReady: false,
      ...LAW_XV_BAKE,
    })
    expect(zipOnly.demoPlayUrl).toBeNull()
    expect(zipOnly.noWebDemo).toBe(false)
    expect(zipOnly.compressionMandatePassed).toBe(false)
    expect(zipOnly.reason).toMatch(/demo_web_slice/)
    expect(resolveHubDemoListingLabel(zipOnly)).toBe('build_pending')

    const desktop = evaluatePublishListingEvidence({
      gameId: 'desktop-opt-out',
      instantPlayHtmlUrl: 'https://cdn.example/play/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: 8 * 1024 * 1024,
      noWebDemo: true,
      ...LAW_XV_BAKE,
    })
    expect(desktop.noWebDemo).toBe(true)
    expect(desktop.demoPlayUrl).toBeNull()
    expect(resolveHubDemoListingLabel(desktop)).toBe('desktop_exclusive')
  })
})

describe('RTv1 publish listing compression evidence', () => {
  const prevRoot = process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT
  let tmpRoot: string

  afterEach(async () => {
    if (prevRoot === undefined) delete process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT
    else process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT = prevRoot
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('fail-closes compressionMandatePassed when bundle bytes are missing', () => {
    const evidence = evaluatePublishListingEvidence({
      gameId: 'neon-runner',
      instantPlayHtmlUrl: 'https://cdn.example/demo/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: null,
      explicitCompressionMandatePassed: true,
      ...LAW_XV_BAKE,
    })
    expect(evidence.compressionMandatePassed).toBe(false)
    expect(evidence.demoPlayUrl).toBe('https://cdn.example/demo/index.html')
    expect(evidence.noWebDemo).toBe(false)
    expect(evidence.reason).toMatch(/compression_evidence_missing/)
  })

  it('passes Compression Mandate with measured ≤150MB demo and stamps demoPlayUrl', async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-listing-'))
    process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT = tmpRoot

    const stamped = await stampPublishListingEvidence({
      gameId: 'oss-kit',
      instantPlayHtmlUrl: 'https://cdn.example/oss/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: 12 * 1024 * 1024,
      evidenceRef: 'exportJob:exp_1',
      ...LAW_XV_BAKE,
    })
    expect(stamped.compressionMandatePassed).toBe(true)
    expect(stamped.demoPlayUrl).toBe('https://cdn.example/oss/index.html')
    expect(stamped.demoBundleBytes).toBe(12 * 1024 * 1024)

    const read = await readPublishListingEvidence('oss-kit')
    expect(read?.compressionMandatePassed).toBe(true)
    expect(read?.demoPlayUrl).toBe('https://cdn.example/oss/index.html')
  })

  it('rejects oversize demo bundles (Compression Mandate)', () => {
    const evidence = evaluatePublishListingEvidence({
      gameId: 'giant-demo',
      instantPlayHtmlUrl: 'https://cdn.example/giant/index.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1,
      ...LAW_XV_BAKE,
    })
    expect(evidence.compressionMandatePassed).toBe(false)
    expect(evidence.demoBundleBytes).toBe(DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1)
  })

  it('marks noWebDemo as Desktop Exclusive and discovery-ineligible', () => {
    const evidence = evaluatePublishListingEvidence({
      gameId: 'desktop-only',
      instantPlayHtmlUrl: 'https://cdn.example/should-ignore.html',
      demoWebSliceReady: true,
      webExportFileSizeBytes: 8 * 1024 * 1024,
      noWebDemo: true,
      ...LAW_XV_BAKE,
    })
    expect(evidence.noWebDemo).toBe(true)
    expect(evidence.demoPlayUrl).toBeNull()
    expect(evidence.compressionMandatePassed).toBe(false)
    expect(resolveHubDemoListingLabel(evidence)).toBe('desktop_exclusive')
  })

  it('discovery feed stays empty without stamped compression evidence', () => {
    const feed = buildDiscoveryFeed(
      [
        {
          gameId: 'no-evidence',
          title: 'No Evidence',
          status: 'playable',
          visibility: 'public',
          publishedAt: new Date().toISOString(),
          plays: 10,
          playUrl: 'https://cdn.example/x',
          compressionMandatePassed: false,
          demoBundleBytes: null,
        },
      ],
      { aiModerationReady: false, impressionLedgerReady: false },
    )
    expect(feed.empty).toBe(true)
    expect(feed.items).toHaveLength(0)
  })

  it('discovery feed includes titles when compression evidence is real', () => {
    const feed = buildDiscoveryFeed(
      [
        {
          gameId: 'eligible',
          title: 'Eligible Demo',
          status: 'playable',
          visibility: 'public',
          publishedAt: new Date().toISOString(),
          plays: 42,
          playUrl: 'https://cdn.example/eligible',
          compressionMandatePassed: true,
          demoBundleBytes: 40 * 1024 * 1024,
        },
      ],
      { aiModerationReady: false, impressionLedgerReady: false },
    )
    expect(feed.empty).toBe(false)
    expect(feed.items.map((i) => i.gameId)).toContain('eligible')
  })
})

describe('RTv1 Arcade playtime client emission path', () => {
  it('enqueues wall-clock deltas and flushes to F.2 ingest endpoint', async () => {
    const spool = createMemoryTelemetrySpool(`arcade_rtv1_${Date.now()}`)
    await spool.clearAll()

    const row = await enqueueSessionPlaytime({
      spool,
      gameId: 'arcade-slug',
      sessionId: 'sess-arcade-1',
      deltaSeconds: 45,
    })
    expect(row.payload.deltaSeconds).toBe(45)

    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        events?: Array<{ gameId?: string; deltaSeconds?: number }>
      }
      expect(body.events?.[0]?.gameId).toBe('arcade-slug')
      expect(body.events?.[0]?.deltaSeconds).toBe(45)
      return new Response(JSON.stringify({ acceptedIds: [row.id], rejected: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await flushPlaytimeSpool({ spool, fetchImpl })
    expect(result.ok).toBe(true)
    expect(result.marked).toBe(1)
    expect(fetchImpl).toHaveBeenCalled()
    expect(await spool.peekUnsynced()).toHaveLength(0)
  })

  it('leaves unsynced playtime on 401 (unauthenticated Arcade session)', async () => {
    const spool = createMemoryTelemetrySpool(`arcade_unauth_${Date.now()}`)
    await enqueueSessionPlaytime({
      spool,
      gameId: 'guest-play',
      sessionId: 'sess-guest',
      deltaSeconds: 30,
    })

    const result = await flushPlaytimeSpool({
      spool,
      fetchImpl: async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    expect(result.ok).toBe(false)
    expect(result.marked).toBe(0)
    expect(await spool.peekUnsynced()).toHaveLength(1)
  })
})

describe('RTv1 I.2 verified review gate from authenticated F.2 playtime', () => {
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

  async function withTmpRoots(): Promise<void> {
    tmpReviews = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-rtv1-i2-reviews-'))
    tmpStats = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-rtv1-i2-stats-'))
    process.env.AETHEL_HUB_REVIEWS_ROOT = tmpReviews
    process.env.AETHEL_LIVEOPS_STATS_ROOT = tmpStats
  }

  it('fail-closes unauthenticated eligibility and submit (no fake verified)', async () => {
    await withTmpRoots()
    const elig = await resolveViewerReviewEligibility({
      userId: null,
      gameId: 'neon-dash',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(elig.authenticated).toBe(false)
    expect(elig.eligible).toBe(false)
    expect(elig.code).toBe('AUTH_REQUIRED')
    expect(elig.requiredSeconds).toBe(VERIFIED_REVIEW_REQUIRED_SECONDS)

    const rejected = await submitVerifiedReview({
      userId: '',
      gameId: 'neon-dash',
      rating: 5,
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) {
      expect(rejected.code).toBe('AUTH_REQUIRED')
      expect(rejected.status).toBe(401)
    }
  })

  it('rejects under 2h authenticated playtime; accepts at ≥7200s from PlayerGameStats', async () => {
    await withTmpRoots()
    const { recordSessionPlaytime } = await import('@/lib/liveops/player-playtime-authority')

    await recordSessionPlaytime({
      userId: 'player-rtv1',
      gameId: 'neon-dash',
      deltaSeconds: 1800,
    })

    const under = await resolveViewerReviewEligibility({
      userId: 'player-rtv1',
      gameId: 'neon-dash',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(under.authenticated).toBe(true)
    expect(under.eligible).toBe(false)
    expect(under.code).toBe('PLAYTIME_GATE')
    expect(under.playtimeSeconds).toBe(1800)
    expect(under.requiredSeconds).toBe(VERIFIED_REVIEW_REQUIRED_SECONDS)

    const shortPost = await submitVerifiedReview({
      userId: 'player-rtv1',
      gameId: 'neon-dash',
      rating: 1,
      body: 'bomb attempt',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(shortPost.ok).toBe(false)
    if (!shortPost.ok) expect(shortPost.code).toBe('PLAYTIME_GATE')

    await recordSessionPlaytime({
      userId: 'player-rtv1',
      gameId: 'neon-dash',
      deltaSeconds: 5400,
    })

    const ready = await resolveViewerReviewEligibility({
      userId: 'player-rtv1',
      gameId: 'neon-dash',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(ready.eligible).toBe(true)
    expect(ready.playtimeSeconds).toBe(7200)

    const ok = await submitVerifiedReview({
      userId: 'player-rtv1',
      gameId: 'neon-dash',
      rating: 5,
      body: 'Earned after authenticated 2h',
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.review.verifiedPlaytimeSeconds).toBe(7200)
      expect(ok.review.isEarlyAccess).toBe(false)
    }
  })
})
