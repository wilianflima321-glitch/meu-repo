/**
 * Letter cz — GameSave cloud marketing honesty flip.
 * Fail-closed Zero-MVP: never green-light cloud sync / immortal-actor marketing
 * without a proven durable Prisma GameSave backend (DATABASE_URL + delegate proof).
 * R2 CAS remains optional for large-payload offload.
 */

import {
  probeGameSaveCloudReady as probeReadiness,
  type GameSaveCloudReadiness,
  type ProbeGameSaveCloudReadyOptions,
} from '@/lib/liveops/gamesave-cloud-readiness'
import type { PrismaGameSaveStore } from '@/lib/liveops/prisma-gamesave-authority'
import { isGameSaveR2RemoteConfigured } from '@/lib/liveops/gamesave-r2-cas'

export type GameSaveCloudMarketingHeldReason =
  | 'gamesave_cloud_marketing_no_database_url'
  | 'gamesave_cloud_marketing_prisma_unproven'
  | 'gamesave_cloud_marketing_disabled'
  | 'gamesave_cloud_marketing_held'

export interface GameSaveCloudMarketingProbe {
  /** Marketing unlock for SaveManager cloudSyncEnabled / Hub cloud badges. */
  gameSaveCloudMarketingReady: boolean
  /** Same gate — explicit SaveManager name. */
  cloudSyncMarketingAllowed: boolean
  /**
   * Cloud immortal actors / immortal-universe marketing.
   * Requires proven GameSave cloud + a real actor cloud store — never invent from memory disk-graph alone.
   */
  cloudImmortalActorsMarketingAllowed: boolean
  databaseUrlConfigured: boolean
  prismaProven: boolean
  r2CasConfigured: boolean
  /** Actor cloud Prisma/durable store proven (separate from GameSave). */
  actorCloudStoreProven: boolean
  stamp: 'IMPLEMENTED' | 'HELD'
  heldReason?: GameSaveCloudMarketingHeldReason
  notes: string[]
}

export interface ProbeGameSaveCloudMarketingOptions {
  store?: PrismaGameSaveStore
  forceDisabled?: boolean
  skipRoundTrip?: boolean
  /** Test inject — never true in production until actor cloud path ships. */
  actorCloudStoreProven?: boolean
  /** Injected readiness (skips live probe). */
  readinessOverride?: GameSaveCloudReadiness
}

function mapHeldReason(
  readiness: GameSaveCloudReadiness,
): GameSaveCloudMarketingHeldReason | undefined {
  if (readiness.ready) return undefined
  switch (readiness.heldReason) {
    case 'gamesave_cloud_disabled':
      return 'gamesave_cloud_marketing_disabled'
    case 'gamesave_cloud_no_database_url':
      return 'gamesave_cloud_marketing_no_database_url'
    case 'gamesave_cloud_prisma_unavailable':
    case 'gamesave_cloud_roundtrip_failed':
      return 'gamesave_cloud_marketing_prisma_unproven'
    default:
      return 'gamesave_cloud_marketing_held'
  }
}

/**
 * Honesty probe for cloud marketing claims.
 * Flips `gameSaveCloudMarketingReady` only when Prisma GameSave path is proven.
 * Cloud immortal-actor marketing stays HELD unless actor cloud store is also proven.
 */
export async function probeGameSaveCloudMarketingReady(
  options: ProbeGameSaveCloudMarketingOptions = {},
): Promise<GameSaveCloudMarketingProbe> {
  const databaseUrlConfigured = Boolean(String(process.env.DATABASE_URL || '').trim())
  const r2CasConfigured = isGameSaveR2RemoteConfigured()
  const actorCloudStoreProven = options.actorCloudStoreProven === true

  const readinessOpts: ProbeGameSaveCloudReadyOptions = {
    store: options.store,
    forceDisabled: options.forceDisabled,
    skipRoundTrip: options.skipRoundTrip,
  }

  const readiness: GameSaveCloudReadiness =
    options.readinessOverride ?? (await probeReadiness(readinessOpts))

  const gameSaveCloudMarketingReady = readiness.ready === true
  const cloudSyncMarketingAllowed = gameSaveCloudMarketingReady
  // Immortal actors ≠ GameSave slots — require both proven DB path and actor cloud store.
  const cloudImmortalActorsMarketingAllowed =
    gameSaveCloudMarketingReady && actorCloudStoreProven

  const notes = [...readiness.notes]
  if (!gameSaveCloudMarketingReady) {
    notes.push(
      'letter cz — gameSaveCloudMarketingReady HELD (fail-closed without proven Prisma GameSave)',
    )
  } else {
    notes.push(
      'letter cz — gameSaveCloudMarketingReady IMPLEMENTED (Prisma GameSave path proven; R2 optional)',
    )
  }
  if (!cloudImmortalActorsMarketingAllowed) {
    notes.push(
      'cloud immortal actors / immortal-universe marketing HELD — needs proven DB + actor cloud store (GameSave alone insufficient)',
    )
  }

  return {
    gameSaveCloudMarketingReady,
    cloudSyncMarketingAllowed,
    cloudImmortalActorsMarketingAllowed,
    databaseUrlConfigured: databaseUrlConfigured || Boolean(options.store),
    prismaProven: readiness.prismaReady === true,
    r2CasConfigured,
    actorCloudStoreProven,
    stamp: gameSaveCloudMarketingReady ? 'IMPLEMENTED' : 'HELD',
    heldReason: mapHeldReason(readiness),
    notes,
  }
}

/** SaveManager may flip cloudSyncEnabled only when marketing probe is ready. */
export function shouldEnableCloudSyncMarketing(probe: {
  gameSaveCloudMarketingReady?: boolean
  ready?: boolean
}): boolean {
  return probe.gameSaveCloudMarketingReady === true || probe.ready === true
}

export function cloudMarketingStamp(probe: {
  gameSaveCloudMarketingReady?: boolean
  ready?: boolean
}): 'IMPLEMENTED' | 'HELD' {
  return shouldEnableCloudSyncMarketing(probe) ? 'IMPLEMENTED' : 'HELD'
}
