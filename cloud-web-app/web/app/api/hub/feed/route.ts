import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { apiInternalError } from '@/lib/api-errors'
import {
  buildDiscoveryFeed,
  probeDiscoveryFeedEngine,
  type DiscoveryCandidate,
} from '@/lib/hub/discovery-feed-engine'
import { probeDiscoveryModerationHonesty } from '@/lib/hub/discovery-moderation-capability'
import { resolveDiscoveryModerationStatuses } from '@/lib/hub/discovery-moderation-engine'
import {
  getImpressionBudgets,
  probeImpressionLedgerWritable,
  recordFeedLaunchImpressions,
} from '@/lib/hub/impression-ledger-authority'
import {
  readPublishListingEvidenceBatch,
  type PublishListingEvidence,
} from '@/lib/hub/publish-listing-authority'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/feed/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_DISCOVERY_FEED'

/**
 * Map Arcade PublishedGame rows → discovery candidates.
 * Compression Mandate comes from stamped publish listing evidence only —
 * missing / false stays fail-closed (never hardcoded true).
 * AI moderation status is resolved from discovery-moderation authority when path is live.
 */
function toCandidate(
  row: {
    slug: string
    title: string
    tags: string[]
    status: string
    visibility: string
    plays: number
    publishedAt: Date | null
    playUrl: string | null
  },
  listing: PublishListingEvidence | null,
  aiModerationStatus: DiscoveryCandidate['aiModerationStatus'] = null,
): DiscoveryCandidate {
  const demoPlayUrl = listing?.demoPlayUrl ?? null
  const playUrl = demoPlayUrl ?? row.playUrl
  return {
    gameId: row.slug,
    title: row.title,
    tags: row.tags,
    status: row.status,
    visibility: row.visibility,
    plays: row.plays,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    playUrl,
    // Fail-closed unless publish stamped measured Compression Mandate evidence.
    compressionMandatePassed: listing?.compressionMandatePassed === true,
    demoBundleBytes: listing?.demoBundleBytes ?? null,
    aiModerationStatus,
  }
}

function resolveViewerKey(req: NextRequest): string | null {
  const fromQuery = (req.nextUrl.searchParams.get('sessionId') ?? '').trim()
  if (fromQuery) return fromQuery.slice(0, 80)
  const fromHeader = (req.headers.get('x-aethel-session-id') ?? '').trim()
  if (fromHeader) return fromHeader.slice(0, 80)
  return null
}

/**
 * I.1 — Discovery Feed API.
 * Empty-honest when no titles pass 30d + Compression Mandate + impression budget gates.
 * Records real launch-lane serves when a viewer session key is present.
 */
export async function GET(req: NextRequest) {
  try {
    const [ledgerProbe, moderationHonesty] = await Promise.all([
      probeImpressionLedgerWritable(),
      probeDiscoveryModerationHonesty(),
    ])
    const probe = probeDiscoveryFeedEngine({
      impressionLedgerWritable: ledgerProbe.writable,
      discoveryModerationWritable: moderationHonesty.aiModerationReady,
    })
    if (!probe.ready) {
      return NextResponse.json(
        {
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: 'HELD',
          error: 'DISCOVERY_FEED_HELD',
          reason: 'Discovery feed engine not ready',
        },
        { status: 503 },
      )
    }

    const sp = req.nextUrl.searchParams
    const limit = Math.min(Math.max(Number(sp.get('limit') ?? '48'), 1), 96)
    const cohortRaw = (sp.get('cohortTags') ?? '').trim()
    const cohortTags = cohortRaw
      ? cohortRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : []
    const launchBudgetOnly =
      sp.get('launchOnly') === '1' || sp.get('launchOnly') === 'true'
    const aiModerationReady =
      sp.get('aiModeration') === '1' || sp.get('aiModeration') === 'true'
        ? true
        : sp.get('aiModeration') === '0' || sp.get('aiModeration') === 'false'
          ? false
          : probe.aiModerationReady
    const viewerKey = resolveViewerKey(req)

    let candidates: DiscoveryCandidate[] = []
    let catalogAvailable = true

    try {
      const rows = await prisma.publishedGame.findMany({
        where: {
          visibility: 'public',
          status: { in: ['playable', 'pending', 'building'] },
        },
        orderBy: [{ publishedAt: 'desc' }],
        take: 96,
        select: {
          slug: true,
          title: true,
          tags: true,
          status: true,
          visibility: true,
          plays: true,
          publishedAt: true,
          playUrl: true,
        },
      })

      let moderationStatuses = new Map<string, NonNullable<DiscoveryCandidate['aiModerationStatus']>>()
      if (aiModerationReady && rows.length > 0) {
        moderationStatuses = await resolveDiscoveryModerationStatuses(
          rows.map((row) => ({
            gameId: row.slug,
            title: row.title,
            tags: row.tags,
          })),
        )
      }

      const listingByGame = await readPublishListingEvidenceBatch(rows.map((row) => row.slug))
      candidates = rows
        .filter((row) => listingByGame.get(row.slug)?.noWebDemo !== true)
        .map((row) =>
          toCandidate(
            row,
            listingByGame.get(row.slug) ?? null,
            moderationStatuses.get(row.slug) ?? (aiModerationReady ? 'pending' : null),
          ),
        )
    } catch (dbError) {
      catalogAvailable = false
      log.warn('hub.feed.catalog_unavailable', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      })
    }

    const impressionBudgets = probe.impressionLedgerReady
      ? await getImpressionBudgets(candidates.map((c) => c.gameId))
      : new Map()

    const feed = buildDiscoveryFeed(candidates, {
      limit,
      cohortTags,
      aiModerationReady,
      impressionLedgerReady: probe.impressionLedgerReady,
      impressionBudgets,
      launchBudgetOnly,
    })

    let impressionRecord: {
      attempted: number
      counted: number
      results: Array<{ gameId: string; code: string }>
    } | null = null

    if (probe.impressionLedgerReady && feed.items.length > 0) {
      const launchIds = feed.items
        .filter((item) => item.lane === 'launch')
        .map((item) => item.gameId)
      if (launchIds.length > 0) {
        impressionRecord = await recordFeedLaunchImpressions({
          gameIds: launchIds,
          viewerKey,
        })
      }
    }

    log.info('hub_feed_served', {
      catalogAvailable,
      candidates: candidates.length,
      eligible: feed.items.length,
      empty: feed.empty,
      impressionsCounted: impressionRecord?.counted ?? 0,
      viewerAttributed: Boolean(viewerKey),
    })

    return NextResponse.json({
      ...feed,
      catalogAvailable,
      probe: {
        ready: probe.ready,
        aiModerationReady: probe.aiModerationReady,
        impressionLedgerReady: probe.impressionLedgerReady,
        promotedLaneReady: probe.promotedLaneReady,
        claim: probe.claim,
      },
      impressionServe: impressionRecord
        ? {
            attempted: impressionRecord.attempted,
            counted: impressionRecord.counted,
            viewerAttributed: Boolean(viewerKey),
          }
        : null,
    })
  } catch (error) {
    log.error('hub.feed.failed', error)
    return apiInternalError()
  }
}
