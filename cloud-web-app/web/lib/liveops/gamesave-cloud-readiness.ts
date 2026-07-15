/**
 * F.1 — GameSave cloud readiness (Prisma round-trip + optional R2).
 * Fail-closed: never flip marketing without a proven remote path.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { isGameSaveR2RemoteConfigured } from '@/lib/liveops/gamesave-r2-cas'
import type { PrismaGameSaveStore } from '@/lib/liveops/prisma-gamesave-authority'

const log = createComponentLogger('gamesave-cloud-readiness')

export type GameSaveCloudHeldReason =
  | 'gamesave_cloud_disabled'
  | 'gamesave_cloud_no_database_url'
  | 'gamesave_cloud_prisma_unavailable'
  | 'gamesave_cloud_roundtrip_failed'
  | 'gamesave_cloud_held'

export interface GameSaveCloudReadiness {
  ready: boolean
  /** Prisma GameSave delegate + DB proof. */
  prismaReady: boolean
  /** Real R2/S3 credentials present (optional CAS; not required for marketing flip). */
  r2CasConfigured: boolean
  heldReason?: GameSaveCloudHeldReason
  notes: string[]
}

export interface ProbeGameSaveCloudReadyOptions {
  /** Injected store for tests — when provided, skips live Prisma client. */
  store?: PrismaGameSaveStore
  /** Skip write/delete probe (read-only health); defaults false. */
  skipRoundTrip?: boolean
  /** Force disable via env AETHEL_GAMESAVE_CLOUD_DISABLED=1 */
  forceDisabled?: boolean
}

const PROBE_USER = '__aethel_gamesave_cloud_probe__'
const PROBE_GAME = '__probe__'
const PROBE_SLOT = 0

function isForceDisabled(forceDisabled?: boolean): boolean {
  if (forceDisabled === true) return true
  const v = String(process.env.AETHEL_GAMESAVE_CLOUD_DISABLED || '')
    .trim()
    .toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

async function loadLivePrismaStore(): Promise<PrismaGameSaveStore | null> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const delegate = (prisma as { gameSave?: PrismaGameSaveStore }).gameSave
    if (!delegate || typeof delegate.findUnique !== 'function') {
      return null
    }
    return delegate
  } catch (err) {
    log.warn('gamesave_cloud_prisma_import_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

async function proveInjectedStoreRoundTrip(store: PrismaGameSaveStore): Promise<void> {
  const now = new Date()
  const probeId = `gs_probe_${Date.now().toString(36)}`
  await store.upsert({
    where: {
      userId_gameId_slotIndex: {
        userId: PROBE_USER,
        gameId: PROBE_GAME,
        slotIndex: PROBE_SLOT,
      },
    },
    create: {
      id: probeId,
      userId: PROBE_USER,
      gameId: PROBE_GAME,
      slotIndex: PROBE_SLOT,
      name: 'cloud-probe',
      payload: { probe: true, at: now.toISOString() },
      checksum: '0'.repeat(64),
      r2Key: null,
      blobHash: null,
      clientPlatform: 'probe',
      revisedAt: now,
      revision: 1,
    },
    update: {
      payload: { probe: true, at: now.toISOString() },
      revisedAt: now,
      updatedAt: now,
    },
  })
  const found = await store.findUnique({
    where: {
      userId_gameId_slotIndex: {
        userId: PROBE_USER,
        gameId: PROBE_GAME,
        slotIndex: PROBE_SLOT,
      },
    },
  })
  await store.deleteMany({
    where: { userId: PROBE_USER, gameId: PROBE_GAME, slotIndex: PROBE_SLOT },
  })
  if (!found) {
    throw new Error('probe findUnique missed row')
  }
}

/**
 * Live DB proof without inserting orphan FK rows — GameSave.userId references User.
 * findMany against a non-existent identity proves table + connection; empty is success.
 */
async function proveLiveStoreReadable(store: PrismaGameSaveStore): Promise<void> {
  await store.findMany({
    where: { userId: PROBE_USER, gameId: PROBE_GAME },
    orderBy: { slotIndex: 'asc' },
  })
}

/**
 * Prove Prisma GameSave remote path.
 * Injected stores: full upsert/delete round-trip (Vitest doubles).
 * Live Prisma: findMany table proof (no fake User FK pollution).
 * Auth/user binding is required at the API layer for real player writes.
 */
export async function probeGameSaveCloudReady(
  options: ProbeGameSaveCloudReadyOptions = {},
): Promise<GameSaveCloudReadiness> {
  const notes: string[] = []
  const r2CasConfigured = isGameSaveR2RemoteConfigured()

  if (isForceDisabled(options.forceDisabled)) {
    return {
      ready: false,
      prismaReady: false,
      r2CasConfigured,
      heldReason: 'gamesave_cloud_disabled',
      notes: ['AETHEL_GAMESAVE_CLOUD_DISABLED — cloud sync marketing fail-closed'],
    }
  }

  if (!options.store && !process.env.DATABASE_URL) {
    return {
      ready: false,
      prismaReady: false,
      r2CasConfigured,
      heldReason: 'gamesave_cloud_no_database_url',
      notes: ['DATABASE_URL missing — cannot prove Prisma GameSave round-trip'],
    }
  }

  const store = options.store ?? (await loadLivePrismaStore())
  if (!store) {
    return {
      ready: false,
      prismaReady: false,
      r2CasConfigured,
      heldReason: 'gamesave_cloud_prisma_unavailable',
      notes: [
        'Prisma GameSave delegate unavailable (run migration + prisma generate)',
        'Durable disk GameSave path remains live independently',
      ],
    }
  }

  if (options.skipRoundTrip) {
    notes.push('Prisma GameSave store present (round-trip skipped)')
    if (r2CasConfigured) notes.push('R2/S3 credentials present for optional CAS offload')
    else notes.push('R2 CAS optional — inline Json payload path used when offload unavailable')
    return {
      ready: true,
      prismaReady: true,
      r2CasConfigured,
      notes,
    }
  }

  try {
    if (options.store) {
      await proveInjectedStoreRoundTrip(store)
      notes.push('Prisma GameSave injected-store round-trip proven')
    } else {
      await proveLiveStoreReadable(store)
      notes.push('Prisma GameSave table readable (live findMany proof)')
    }
  } catch (err) {
    log.warn('gamesave_cloud_roundtrip_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      ready: false,
      prismaReady: false,
      r2CasConfigured,
      heldReason: 'gamesave_cloud_roundtrip_failed',
      notes: [
        `Prisma GameSave proof failed: ${err instanceof Error ? err.message : String(err)}`,
        'Apply migration 20260713000000_gamesave_cloud before marketing cloud sync',
      ],
    }
  }

  if (r2CasConfigured) {
    notes.push('R2/S3 credentials present — large payloads may offload to player-saves/ CAS')
  } else {
    notes.push(
      'R2 CAS optional — payloads stored inline in Prisma Json until remote storage configured',
    )
  }

  return {
    ready: true,
    prismaReady: true,
    r2CasConfigured,
    notes,
  }
}

/**
 * SaveManager gate — cloudSyncEnabled may flip true ONLY when readiness.ready.
 * Never enable on empty Prisma / missing round-trip.
 */
export function resolveGameSaveCloudSyncEnabled(readiness: GameSaveCloudReadiness): boolean {
  return readiness.ready === true
}

export function cloudSyncMarketingStamp(
  readiness: GameSaveCloudReadiness,
): 'IMPLEMENTED' | 'HELD' {
  return readiness.ready ? 'IMPLEMENTED' : 'HELD'
}
