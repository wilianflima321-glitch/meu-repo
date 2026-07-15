/**
 * Letter cz — GameSave cloud marketing honesty flip.
 * Fail-closed without DATABASE_URL / proven Prisma path; immortal actors stay HELD.
 */

import { describe, expect, it } from 'vitest'

import {
  cloudMarketingStamp,
  probeGameSaveCloudMarketingReady,
  shouldEnableCloudSyncMarketing,
} from '@/lib/liveops/gamesave-cloud-marketing'
import { createMemoryPrismaGameSaveStore } from '@/lib/liveops/prisma-gamesave-authority'
import { evaluateLiveOpsF2Honesty } from '@/lib/liveops/liveops-f2-capability'
import { evaluateActorPersistenceCloudGate } from '@/lib/cosmos/actor-persistence'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

describe('letter cz — gameSaveCloudMarketingReady fail-closed', () => {
  it('HELD without DATABASE_URL (no invented green marketing)', async () => {
    const prev = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    const probe = await probeGameSaveCloudMarketingReady()
    expect(probe.gameSaveCloudMarketingReady).toBe(false)
    expect(probe.cloudSyncMarketingAllowed).toBe(false)
    expect(probe.cloudImmortalActorsMarketingAllowed).toBe(false)
    expect(probe.stamp).toBe('HELD')
    expect(probe.heldReason).toMatch(/database_url|prisma_unproven|held/i)
    expect(shouldEnableCloudSyncMarketing(probe)).toBe(false)
    expect(cloudMarketingStamp(probe)).toBe('HELD')
    expect(probe.notes.join(' ')).toMatch(/fail-closed|HELD/i)
    if (prev !== undefined) process.env.DATABASE_URL = prev
  })

  it('flips GameSave marketing on injected-store proof; immortal actors stay HELD', async () => {
    const store = createMemoryPrismaGameSaveStore()
    const probe = await probeGameSaveCloudMarketingReady({ store })
    expect(probe.gameSaveCloudMarketingReady).toBe(true)
    expect(probe.cloudSyncMarketingAllowed).toBe(true)
    expect(probe.prismaProven).toBe(true)
    expect(probe.stamp).toBe('IMPLEMENTED')
    // GameSave cloud ≠ actor cloud store — immortal marketing stays fail-closed.
    expect(probe.cloudImmortalActorsMarketingAllowed).toBe(false)
    expect(probe.actorCloudStoreProven).toBe(false)
    expect(shouldEnableCloudSyncMarketing(probe)).toBe(true)
  })

  it('immortal actors unlock only with marketing + actor cloud store', async () => {
    const store = createMemoryPrismaGameSaveStore()
    const alone = await probeGameSaveCloudMarketingReady({ store })
    expect(alone.cloudImmortalActorsMarketingAllowed).toBe(false)

    const both = await probeGameSaveCloudMarketingReady({
      store,
      actorCloudStoreProven: true,
    })
    expect(both.gameSaveCloudMarketingReady).toBe(true)
    expect(both.cloudImmortalActorsMarketingAllowed).toBe(true)
  })

  it('force-disable stays HELD even with store', async () => {
    const probe = await probeGameSaveCloudMarketingReady({
      store: createMemoryPrismaGameSaveStore(),
      forceDisabled: true,
    })
    expect(probe.gameSaveCloudMarketingReady).toBe(false)
    expect(probe.heldReason).toBe('gamesave_cloud_marketing_disabled')
    expect(probe.cloudImmortalActorsMarketingAllowed).toBe(false)
  })
})

describe('letter cz — LiveOps + actor persistence gates', () => {
  it('evaluateLiveOpsF2Honesty surfaces marketing HELD by default', () => {
    const held = evaluateLiveOpsF2Honesty({
      spoolModuleReady: true,
      playtimeIngestReady: true,
      playerStatsWritable: true,
      gameSaveDurableReady: true,
      gameSaveCloudReady: false,
      gameSaveCloudMarketingReady: false,
      cloudImmortalActorsMarketingAllowed: false,
    })
    expect(held.gameSaveCloudMarketingReady).toBe(false)
    expect(held.cloudImmortalActorsMarketingAllowed).toBe(false)
    expect(held.gameSaveCloud.status).toBe('HELD')
  })

  it('evaluateLiveOpsF2Honesty flips marketing when cloud ready; immortal stays HELD', () => {
    const live = evaluateLiveOpsF2Honesty({
      spoolModuleReady: true,
      playtimeIngestReady: true,
      playerStatsWritable: true,
      gameSaveDurableReady: true,
      gameSaveCloudReady: true,
      gameSaveCloudMarketingReady: true,
      cloudImmortalActorsMarketingAllowed: false,
    })
    expect(live.gameSaveCloudMarketingReady).toBe(true)
    expect(live.gameSaveCloudReady).toBe(true)
    expect(live.cloudImmortalActorsMarketingAllowed).toBe(false)
    expect(live.gameSaveCloud.status).toBe('IMPLEMENTED')
  })

  it('actor persistence immortal gate fail-closed without actor cloud store', () => {
    expect(
      evaluateActorPersistenceCloudGate({}).cloudImmortalUniverseMarketingAllowed,
    ).toBe(false)
    expect(
      evaluateActorPersistenceCloudGate({
        gameSaveCloudMarketingReady: true,
        databaseUrl: true,
        prismaProven: true,
      }).cloudImmortalUniverseMarketingAllowed,
    ).toBe(false)
    expect(
      evaluateActorPersistenceCloudGate({
        gameSaveCloudMarketingReady: true,
        actorCloudStoreProven: true,
      }).cloudImmortalUniverseMarketingAllowed,
    ).toBe(true)
  })

  it('arcade maturity notes mention letter cz marketing gate', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/gameSaveCloudMarketingReady/i)
    expect(arcade?.notes).toMatch(/\[HELD/i)
  })
})
