/**
 * Onda F.2 / Law II — LiveOps + TelemetrySpool honesty capability.
 * Hub I.1/I.2 unlock only when corresponding flags are truly ready — never fake metrics.
 * F.1 durable GameSave authority can be live while Prisma/R2 cloud sync stays HELD.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { probeDiscoveryFeedEngine } from '@/lib/hub/discovery-feed-engine'
import { probeDiscoveryModerationHonesty } from '@/lib/hub/discovery-moderation-capability'
import { probeReviewsStoreWritable } from '@/lib/hub/game-review-authority'
import { probeImpressionLedgerWritable } from '@/lib/hub/impression-ledger-authority'
import { probeGameSaveAuthorityWritable } from '@/lib/liveops/game-save-authority'
import { probeGameSaveCloudReady } from '@/lib/liveops/gamesave-cloud-capability'
import { probeGameSaveCloudMarketingReady } from '@/lib/liveops/gamesave-cloud-marketing'
import {
  probePlaytimeAuthorityWritable,
  recordSessionPlaytime,
} from '@/lib/liveops/player-playtime-authority'
import {
  SESSION_PLAYTIME_EVENT,
  createMemoryTelemetrySpool,
} from '@/lib/liveops/telemetry-spool'

const log = createComponentLogger('liveops-f2-capability')

export type LiveOpsCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'HELD'

export interface LiveOpsSurfaceReport {
  surface: string
  status: LiveOpsCapabilityStatus
  connectable: boolean
  notes: string[]
  heldReason?: string
}

export interface LiveOpsF2HonestyReport {
  generatedAt: string
  wave: 'F.2'
  /** Durable TelemetrySpool (IndexedDB / memory ring) */
  telemetrySpool: LiveOpsSurfaceReport
  /** POST /api/liveops/playtime ingest path */
  playtimeIngest: LiveOpsSurfaceReport
  /** Disk PlayerGameStats authority */
  playerGameStats: LiveOpsSurfaceReport
  /** Spatial heatmaps / Redis LiveOps aggregation */
  heatmaps: LiveOpsSurfaceReport
  /** F.1 durable GameSave authority (disk + sync API) — not Prisma/R2 cloud */
  gameSaveDurable: LiveOpsSurfaceReport
  /** F.1 GameSave cloud sync (Prisma + R2 + cloudSyncEnabled marketing) */
  gameSaveCloud: LiveOpsSurfaceReport
  /** I.1 discovery feed engine */
  discoveryFeed: LiveOpsSurfaceReport
  /** I.2 GameReview store / API */
  reviewsStore: LiveOpsSurfaceReport
  /**
   * True when spool + ingest + durable PlayerGameStats are proven.
   * Unlocks Hub `playtimeTelemetryReady` — NOT full I.2 reviews marketing.
   */
  playtimeTelemetryReady: boolean
  /** True only when I.1 discovery-feed-engine + retention scorer ship */
  discoveryFeedReady: boolean
  /** True only when durable 2k impression ledger root is writable */
  impressionLedgerReady: boolean
  /** True only when discovery AI moderation path is ready */
  aiModerationReady: boolean
  /** True only when GameReview CRUD exists */
  reviewsStoreReady: boolean
  /** True when durable GameSave disk authority + sync API are writable */
  gameSaveDurableReady: boolean
  /** True only when SaveManager cloudSync is live with R2/Prisma GameSave */
  gameSaveCloudReady: boolean
  /**
   * Letter cz — explicit cloud marketing honesty flip.
   * Same evidence as `gameSaveCloudReady`; named for marketing gates / Hub badges.
   */
  gameSaveCloudMarketingReady: boolean
  /** Cloud immortal actors — always false until actor cloud store + DB proven. */
  cloudImmortalActorsMarketingAllowed: boolean
  claim: string
  productCopy: string
}

export interface LiveOpsF2HonestyInput {
  /** Spool module present and enqueue/flush contract live */
  spoolModuleReady?: boolean
  /** Playtime ingest API wired */
  playtimeIngestReady?: boolean
  /** Durable PlayerGameStats writable */
  playerStatsWritable?: boolean
  /** Heatmap Redis aggregation live */
  heatmapsReady?: boolean
  /** F.1 durable GameSave authority writable */
  gameSaveDurableReady?: boolean
  /** F.1 cloud GameSave (Prisma + R2) live */
  gameSaveCloudReady?: boolean
  /** Letter cz marketing alias — defaults to gameSaveCloudReady when omitted */
  gameSaveCloudMarketingReady?: boolean
  /** Actor cloud store proven (immortal-universe marketing) */
  cloudImmortalActorsMarketingAllowed?: boolean
  /** I.1 discovery feed engine live */
  discoveryFeedReady?: boolean
  /** I.1 2k impression ledger writable */
  impressionLedgerReady?: boolean
  /** I.1 discovery AI moderation path ready */
  aiModerationReady?: boolean
  /** I.2 GameReview store live */
  reviewsStoreReady?: boolean
}

function buildClaim(input: {
  playtimeTelemetryReady: boolean
  discoveryFeedReady: boolean
  reviewsStoreReady: boolean
  impressionLedgerReady: boolean
  aiModerationReady: boolean
  gameSaveDurableReady: boolean
  gameSaveCloudReady: boolean
}): string {
  const {
    playtimeTelemetryReady,
    discoveryFeedReady,
    reviewsStoreReady,
    impressionLedgerReady,
    aiModerationReady,
    gameSaveDurableReady,
    gameSaveCloudReady,
  } = input
  const durableTag = gameSaveDurableReady
    ? 'F.1 durable GameSave live'
    : 'F.1 durable GameSave [HELD]'
  const cloudTag = gameSaveCloudReady
    ? 'Prisma GameSave cloud sync live'
    : 'Prisma/R2 cloud GameSave [HELD]'

  if (!playtimeTelemetryReady) {
    return 'F.2 LiveOps playtime path incomplete — Hub verified reviews stay fail-closed'
  }

  const base =
    discoveryFeedReady && reviewsStoreReady
      ? impressionLedgerReady
        ? aiModerationReady
          ? `F.2 playtime + I.2 GameReview + I.1 discovery + 2k ledger + AI-mod live — heatmaps / ${cloudTag}`
          : `F.2 playtime + I.2 GameReview + I.1 discovery + 2k impression ledger live — heatmaps / ${cloudTag}`
        : `F.2 playtime + I.2 GameReview + I.1 discovery engine live — heatmaps / ${cloudTag}`
      : reviewsStoreReady
        ? `F.2 playtime TelemetrySpool + PlayerGameStats live — I.2 GameReview store live; I.1 discovery / heatmaps / ${cloudTag}`
        : discoveryFeedReady
          ? impressionLedgerReady
            ? aiModerationReady
              ? `F.2 playtime + I.1 discovery + 2k ledger + AI-mod live — I.2 review store / heatmaps / ${cloudTag}`
              : `F.2 playtime + I.1 discovery + 2k impression ledger live — I.2 review store / heatmaps / ${cloudTag}`
            : `F.2 playtime + I.1 discovery engine live — I.2 review store / heatmaps / ${cloudTag}`
          : `F.2 playtime TelemetrySpool + PlayerGameStats live — I.1 discovery / I.2 review store / heatmaps / ${cloudTag}`

  return `${base}; ${durableTag}`
}

function buildProductCopy(input: {
  playtimeTelemetryReady: boolean
  discoveryFeedReady: boolean
  reviewsStoreReady: boolean
  impressionLedgerReady: boolean
  aiModerationReady: boolean
  gameSaveDurableReady: boolean
  gameSaveCloudReady: boolean
}): string {
  const {
    playtimeTelemetryReady,
    discoveryFeedReady,
    reviewsStoreReady,
    impressionLedgerReady,
    aiModerationReady,
    gameSaveDurableReady,
    gameSaveCloudReady,
  } = input
  const durableNote = gameSaveDurableReady
    ? 'Durable GameSave slots (disk authority + sync API) are live.'
    : 'Durable GameSave authority remains [HELD].'
  const cloudNote = gameSaveCloudReady
    ? 'Prisma GameSave cloud sync is live (R2 CAS optional for large payloads); SaveManager cloudSyncEnabled may flip when readiness proven.'
    : 'Prisma/R2 cloud sync and SaveManager cloudSyncEnabled marketing remain [HELD] until Prisma GameSave path is proven.'

  if (!playtimeTelemetryReady) {
    return `Verified reviews and LiveOps heatmaps stay [HELD] until F.2 playtime ingest is durable and writable. ${durableNote} ${cloudNote}`
  }

  const head =
    discoveryFeedReady && reviewsStoreReady
      ? impressionLedgerReady
        ? aiModerationReady
          ? 'Player playtime, GameReview store (helpful votes + early-access opt-in), I.1 discovery ranking, 2k impression ledger, and AI moderation are live.'
          : 'Player playtime, GameReview store (helpful votes + early-access opt-in), I.1 discovery ranking, and 2k impression ledger are live.'
        : 'Player playtime, GameReview store (helpful votes + early-access opt-in), and I.1 discovery ranking are live.'
      : reviewsStoreReady
        ? 'Player session_playtime_seconds spool + durable stats + GameReview store are live (2h / early-access 30m gate + helpful votes).'
        : discoveryFeedReady
          ? impressionLedgerReady
            ? aiModerationReady
              ? 'Player playtime + I.1 discovery ranking + honest 2k ledger + AI moderation are live.'
              : 'Player playtime + I.1 discovery ranking + honest 2k impression ledger are live.'
            : 'Player playtime + I.1 discovery ranking (30d + Compression Mandate) are live.'
          : 'Player session_playtime_seconds spool + durable stats are live.'

  const mid =
    discoveryFeedReady && reviewsStoreReady
      ? impressionLedgerReady
        ? 'Redis heatmaps remain [HELD].'
        : 'Impression ledger and Redis heatmaps remain [HELD].'
      : reviewsStoreReady
        ? 'Ranked discovery and Redis heatmaps remain [HELD].'
        : discoveryFeedReady
          ? 'Review posting and Redis heatmaps remain [HELD].'
          : 'Ranked discovery, review posting, and Redis heatmaps remain [HELD].'

  return `${head} ${durableNote} ${mid} ${cloudNote}`
}

/**
 * P2b HIGH #18 — exercise TelemetrySpool enqueue/clear contract (never hardcode true).
 */
export async function probeTelemetrySpoolModuleReady(): Promise<{ ready: boolean }> {
  try {
    const spool = createMemoryTelemetrySpool(`f2_probe_${Date.now()}`)
    await spool.clearAll()
    const row = await spool.enqueue({
      event: SESSION_PLAYTIME_EVENT,
      gameId: '__f2_probe__',
      sessionId: '__f2_probe__',
      payload: { deltaSeconds: 1 },
    })
    await spool.clearAll()
    return { ready: typeof row.id === 'string' && row.id.length > 0 && row.synced === false }
  } catch {
    return { ready: false }
  }
}

/**
 * P2b HIGH #18 — ingest ready only when authority + spool event contract are present.
 */
export function probePlaytimeIngestRouteReady(): { ready: boolean } {
  return {
    ready:
      typeof recordSessionPlaytime === 'function' &&
      SESSION_PLAYTIME_EVENT === 'session_playtime_seconds',
  }
}

export function evaluateLiveOpsF2Honesty(
  input: LiveOpsF2HonestyInput = {},
): LiveOpsF2HonestyReport {
  // Fail-closed: omitted flags are NOT ready (P2b HIGH #18).
  const spoolReady = input.spoolModuleReady === true
  const ingestReady = input.playtimeIngestReady === true
  const statsWritable = input.playerStatsWritable === true
  const heatmapsReady = input.heatmapsReady === true
  const gameSaveDurableReady = input.gameSaveDurableReady === true
  const gameSaveCloudReady = input.gameSaveCloudReady === true
  const gameSaveCloudMarketingReady =
    input.gameSaveCloudMarketingReady === true || gameSaveCloudReady
  const cloudImmortalActorsMarketingAllowed =
    input.cloudImmortalActorsMarketingAllowed === true
  const discoveryFeedReady = input.discoveryFeedReady === true
  const impressionLedgerReady = input.impressionLedgerReady === true
  const aiModerationReady = input.aiModerationReady === true
  const reviewsStoreReady = input.reviewsStoreReady === true

  const telemetrySpool: LiveOpsSurfaceReport = spoolReady
    ? {
        surface: 'F.2 TelemetrySpool',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Durable store-and-forward ring (IndexedDB browser / memory Node)',
          'session_playtime_seconds enqueue + markSynced on ACK',
        ],
      }
    : {
        surface: 'F.2 TelemetrySpool',
        status: 'NOT_IMPLEMENTED',
        connectable: false,
        notes: ['TelemetrySpool module missing'],
        heldReason: 'telemetry_spool_missing',
      }

  const playtimeIngest: LiveOpsSurfaceReport = ingestReady
    ? {
        surface: 'F.2 playtime ingest API',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: ['POST /api/liveops/playtime accepts session_playtime_seconds batches'],
      }
    : {
        surface: 'F.2 playtime ingest API',
        status: 'NOT_IMPLEMENTED',
        connectable: false,
        notes: ['Playtime ingest route not wired'],
        heldReason: 'playtime_ingest_missing',
      }

  const playerGameStats: LiveOpsSurfaceReport = statsWritable
    ? {
        surface: 'F.2 PlayerGameStats authority',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Disk-backed `.aethel/liveops/player-stats` — not localStorage',
          'Aggregates verified playtime for Hub 2h review gate',
        ],
      }
    : {
        surface: 'F.2 PlayerGameStats authority',
        status: 'HELD',
        connectable: false,
        notes: ['PlayerGameStats root not writable'],
        heldReason: 'player_stats_not_writable',
      }

  const heatmaps: LiveOpsSurfaceReport = heatmapsReady
    ? {
        surface: 'LiveOps heatmaps',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: ['Spatial events → Redis → IDE heatmap live'],
      }
    : {
        surface: 'LiveOps heatmaps',
        status: 'HELD',
        connectable: false,
        notes: ['Redis spatial aggregation / death heatmaps not shipped'],
        heldReason: 'heatmap_redis_held',
      }

  const gameSaveDurable: LiveOpsSurfaceReport = gameSaveDurableReady
    ? {
        surface: 'F.1 GameSave durable authority',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Disk-backed `.aethel/liveops/game-saves` slots + SHA-256 checksum + conflict policy',
          'POST/GET/DELETE /api/liveops/gamesave sync contract live',
          'cloudSyncEnabled defaults false — not Prisma/R2 cloud marketing',
        ],
      }
    : {
        surface: 'F.1 GameSave durable authority',
        status: 'HELD',
        connectable: false,
        notes: ['GameSave durable root not writable'],
        heldReason: 'gamesave_durable_not_writable',
      }

  const gameSaveCloud: LiveOpsSurfaceReport = gameSaveCloudReady
    ? {
        surface: 'F.1 GameSave cloud sync',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Prisma GameSave model + dual-write sync API live',
          'R2 CAS optional for large payloads — SaveManager cloudSyncEnabled unlock allowed when readiness proven',
        ],
      }
    : {
        surface: 'F.1 GameSave cloud sync',
        status: 'HELD',
        connectable: false,
        notes: [
          gameSaveDurableReady
            ? 'Durable disk GameSave + sync API live — Prisma GameSave schema/provider shipped; marketing waits for DATABASE_URL + proven Prisma path'
            : 'SaveManager local slots exist; cloudSyncEnabled defaults false',
          'gameSaveCloudReady requires Prisma GameSave connectivity (R2 CAS optional)',
        ],
        heldReason: 'gamesave_cloud_held',
      }

  const discoveryFeed: LiveOpsSurfaceReport = discoveryFeedReady
    ? {
        surface: 'I.1 Discovery Feed',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Discovery feed engine + retention scorer live (30d + Compression Mandate)',
          ...(impressionLedgerReady
            ? ['2k impression ledger live — unique served counts within 30d']
            : ['2k impression ledger [HELD]']),
          ...(aiModerationReady
            ? ['AI moderation path live — unapproved titles excluded before ranking']
            : ['AI moderation marketing [HELD]']),
          'Promoted lane [HELD]',
        ],
      }
    : {
        surface: 'I.1 Discovery Feed',
        status: 'HELD',
        connectable: false,
        notes: [
          'discovery-feed-engine + retention-scorer not shipped',
          'F.2 playtime alone does not unlock ranked discovery',
        ],
        heldReason: 'discovery_feed_held',
      }

  const reviewsStore: LiveOpsSurfaceReport = reviewsStoreReady
    ? {
        surface: 'I.2 GameReview store',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Disk GameReview CRUD under `.aethel/hub/reviews`',
          'POST gated on F.2 PlayerGameStats ≥ 7200s (or 1800s when early-access opted in) — no fake ratings',
          'Helpful votes durable under `.aethel/hub/review-votes` — 1/user/review + playtime-tier weight',
          'Early-access creator opt-in under `.aethel/hub/early-access`',
        ],
      }
    : {
        surface: 'I.2 GameReview store',
        status: 'HELD',
        connectable: false,
        notes: [
          'GameReview store root not writable or CRUD not shipped',
          'Playtime gate helpers exist — star UI stays fail-closed',
        ],
        heldReason: 'reviews_store_held',
      }

  const playtimeTelemetryReady =
    telemetrySpool.connectable && playtimeIngest.connectable && playerGameStats.connectable

  const claimArgs = {
    playtimeTelemetryReady,
    discoveryFeedReady,
    reviewsStoreReady,
    impressionLedgerReady,
    aiModerationReady,
    gameSaveDurableReady,
    gameSaveCloudReady,
  }

  const report: LiveOpsF2HonestyReport = {
    generatedAt: new Date().toISOString(),
    wave: 'F.2',
    telemetrySpool,
    playtimeIngest,
    playerGameStats,
    heatmaps,
    gameSaveDurable,
    gameSaveCloud,
    discoveryFeed,
    reviewsStore,
    playtimeTelemetryReady,
    discoveryFeedReady,
    impressionLedgerReady,
    aiModerationReady,
    reviewsStoreReady,
    gameSaveDurableReady,
    gameSaveCloudReady,
    gameSaveCloudMarketingReady,
    cloudImmortalActorsMarketingAllowed,
    claim: buildClaim(claimArgs),
    productCopy: buildProductCopy(claimArgs),
  }

  log.info('liveops_f2_honesty_evaluated', {
    playtimeTelemetryReady: report.playtimeTelemetryReady,
    discoveryFeedReady: report.discoveryFeedReady,
    reviewsStoreReady: report.reviewsStoreReady,
    gameSaveDurableReady: report.gameSaveDurableReady,
    gameSaveCloudReady: report.gameSaveCloudReady,
    gameSaveCloudMarketingReady: report.gameSaveCloudMarketingReady,
    cloudImmortalActorsMarketingAllowed: report.cloudImmortalActorsMarketingAllowed,
    spool: telemetrySpool.status,
    stats: playerGameStats.status,
  })

  return report
}

/**
 * Server probe — default production honesty for Hub / LiveOps APIs.
 */
export async function probeLiveOpsF2Honesty(): Promise<LiveOpsF2HonestyReport> {
  const [
    probe,
    reviewsProbe,
    impressionsProbe,
    moderationHonesty,
    gameSaveProbe,
    cloudProbe,
    marketingProbe,
    spoolProbe,
  ] = await Promise.all([
    probePlaytimeAuthorityWritable(),
    probeReviewsStoreWritable(),
    probeImpressionLedgerWritable(),
    probeDiscoveryModerationHonesty(),
    probeGameSaveAuthorityWritable(),
    probeGameSaveCloudReady(),
    probeGameSaveCloudMarketingReady(),
    probeTelemetrySpoolModuleReady(),
  ])
  const ingestProbe = probePlaytimeIngestRouteReady()
  const discoveryProbe = probeDiscoveryFeedEngine({
    impressionLedgerWritable: impressionsProbe.writable,
    discoveryModerationWritable: moderationHonesty.aiModerationReady,
  })
  return evaluateLiveOpsF2Honesty({
    spoolModuleReady: spoolProbe.ready,
    playtimeIngestReady: ingestProbe.ready,
    playerStatsWritable: probe.writable,
    heatmapsReady: false,
    /** Flip when durable GameSave root is writable (disk authority + sync API shipped). */
    gameSaveDurableReady: gameSaveProbe.writable,
    /** Flip only when Prisma GameSave remote path is proven (R2 CAS optional). */
    gameSaveCloudReady: cloudProbe.ready,
    /** Letter cz — explicit marketing honesty (same evidence; immortal actors separate). */
    gameSaveCloudMarketingReady: marketingProbe.gameSaveCloudMarketingReady,
    cloudImmortalActorsMarketingAllowed: marketingProbe.cloudImmortalActorsMarketingAllowed,
    /** Flip only when I.1 discovery-feed-engine probe reports ready. */
    discoveryFeedReady: discoveryProbe.ready,
    impressionLedgerReady: discoveryProbe.impressionLedgerReady,
    aiModerationReady: discoveryProbe.aiModerationReady,
    /** Flip only when durable GameReview root is writable (I.2 store shipped). */
    reviewsStoreReady: reviewsProbe.writable,
  })
}
