/**
 * F.1 GameSave Prisma/R2 cloud deepen — authority, CloudProvider, readiness, honesty.
 */

import { describe, expect, it } from 'vitest'

import {
  cloudSyncMarketingStamp,
  probeGameSaveCloudReady,
  shouldEnableSaveManagerCloudSync,
} from '@/lib/liveops/gamesave-cloud-capability'
import {
  createMemoryPrismaGameSaveStore,
  createPrismaGameSaveAuthority,
} from '@/lib/liveops/prisma-gamesave-authority'
import { createPrismaGameSaveCloudProvider } from '@/lib/liveops/prisma-gamesave-cloud-provider'
import { evaluateLiveOpsF2Honesty } from '@/lib/liveops/liveops-f2-capability'
import { computeGameSaveChecksum } from '@/lib/liveops/game-save-checksum'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'
import type { GameSaveBlobStore } from '@/lib/liveops/gamesave-r2-cas'

function memoryBlobStore(remote = false): GameSaveBlobStore {
  const map = new Map<string, string>()
  return {
    isRemoteConfigured: () => remote,
    async put(key, body) {
      map.set(key, body)
      return { ok: true }
    },
    async get(key) {
      return map.get(key) ?? null
    },
    async delete(key) {
      return map.delete(key)
    },
  }
}

describe('F.1 Prisma GameSave authority (memory double)', () => {
  it('upserts, lists, downloads via CloudProvider round-trip', async () => {
    const store = createMemoryPrismaGameSaveStore()
    const authority = createPrismaGameSaveAuthority({
      store,
      blobStore: memoryBlobStore(false),
      preferR2Offload: false,
    })
    const payload = { hp: 42, zone: 'forest' }
    const checksum = computeGameSaveChecksum(payload)

    const up = await authority.upsertGameSave({
      userId: 'user-1',
      gameId: 'neon-runner',
      slotIndex: 0,
      name: 'Slot 1',
      payload,
      checksum,
      clientPlatform: 'web',
    })
    expect(up.ok).toBe(true)
    if (!up.ok) return
    expect(up.record.checksum).toBe(checksum)
    expect(up.created).toBe(true)

    const listed = await authority.listGameSaves('user-1', 'neon-runner')
    expect(listed).toHaveLength(1)

    const provider = createPrismaGameSaveCloudProvider({
      authority,
      userId: 'user-1',
      gameId: 'neon-runner',
    })
    const metas = await provider.list()
    expect(metas).toHaveLength(1)
    const downloaded = await provider.download(metas[0].id)
    expect(downloaded.state).toEqual(payload)

    const deleted = await authority.deleteGameSave('user-1', 'neon-runner', 0)
    expect(deleted).toBe(true)
    expect(await authority.listGameSaves('user-1', 'neon-runner')).toHaveLength(0)
  })

  it('offloads large payload to blob store when remote CAS configured', async () => {
    const store = createMemoryPrismaGameSaveStore()
    const blob = memoryBlobStore(true)
    const authority = createPrismaGameSaveAuthority({
      store,
      blobStore: blob,
      preferR2Offload: true,
    })
    const big = { blob: 'x'.repeat(70 * 1024) }
    const up = await authority.upsertGameSave({
      userId: 'user-1',
      gameId: 'g',
      slotIndex: 1,
      payload: big,
    })
    expect(up.ok).toBe(true)
    if (!up.ok) return

    const row = await store.findUnique({
      where: {
        userId_gameId_slotIndex: { userId: 'user-1', gameId: 'g', slotIndex: 1 },
      },
    })
    expect(row?.payload).toBeNull()
    expect(row?.r2Key).toMatch(/^player-saves\//)
    expect(row?.blobHash).toBe(up.record.checksum)

    const got = await authority.getGameSave('user-1', 'g', 1)
    expect(got?.payload).toEqual(big)
  })

  it('rejects bad client checksum', async () => {
    const authority = createPrismaGameSaveAuthority({
      store: createMemoryPrismaGameSaveStore(),
      blobStore: memoryBlobStore(false),
    })
    const bad = await authority.upsertGameSave({
      userId: 'u',
      gameId: 'g',
      slotIndex: 0,
      payload: { a: 1 },
      checksum: 'deadbeef',
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.code).toBe('GAMESAVE_CHECKSUM_MISMATCH')
  })
})

describe('F.1 GameSave cloud readiness', () => {
  it('fail-closed without DATABASE_URL when no injected store', async () => {
    const prev = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    const probe = await probeGameSaveCloudReady()
    expect(probe.ready).toBe(false)
    expect(probe.reason).toMatch(/database_url|prisma/i)
    expect(shouldEnableSaveManagerCloudSync(probe)).toBe(false)
    expect(cloudSyncMarketingStamp(probe)).toBe('HELD')
    if (prev !== undefined) process.env.DATABASE_URL = prev
  })

  it('flips ready on injected-store round-trip (R2 not required)', async () => {
    const store = createMemoryPrismaGameSaveStore()
    const probe = await probeGameSaveCloudReady({ store })
    expect(probe.ready).toBe(true)
    expect(probe.prismaReady).toBe(true)
    expect(shouldEnableSaveManagerCloudSync(probe)).toBe(true)
    expect(cloudSyncMarketingStamp(probe)).toBe('IMPLEMENTED')
  })

  it('force-disable stays HELD even with store', async () => {
    const probe = await probeGameSaveCloudReady({
      store: createMemoryPrismaGameSaveStore(),
      forceDisabled: true,
    })
    expect(probe.ready).toBe(false)
    expect(probe.reason).toBe('gamesave_cloud_disabled')
  })
})

describe('F.1 honesty split (durable vs cloud deepen)', () => {
  it('evaluate flips cloud IMPLEMENTED only when gameSaveCloudReady true', () => {
    const held = evaluateLiveOpsF2Honesty({
      spoolModuleReady: true,
      playtimeIngestReady: true,
      playerStatsWritable: true,
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
      discoveryFeedReady: true,
      reviewsStoreReady: true,
      impressionLedgerReady: true,
      aiModerationReady: true,
    })
    expect(held.gameSaveDurableReady).toBe(true)
    expect(held.gameSaveCloudReady).toBe(false)
    expect(held.gameSaveCloud.status).toBe('HELD')
    expect(held.productCopy).toMatch(/\[HELD\]/)

    const live = evaluateLiveOpsF2Honesty({
      spoolModuleReady: true,
      playtimeIngestReady: true,
      playerStatsWritable: true,
      gameSaveDurableReady: true,
      gameSaveCloudReady: true,
      discoveryFeedReady: true,
      reviewsStoreReady: true,
      impressionLedgerReady: true,
      aiModerationReady: true,
    })
    expect(live.gameSaveCloudReady).toBe(true)
    expect(live.gameSaveCloud.status).toBe('IMPLEMENTED')
    expect(live.claim).toMatch(/Prisma GameSave cloud sync live/i)
    expect(live.productCopy).toMatch(/Prisma GameSave cloud sync is live/i)
  })

  it('arcade maturity notes mention Prisma GameSave + gated marketing', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/Prisma GameSave/i)
    expect(arcade?.notes).toMatch(/\[HELD/i)
  })
})
