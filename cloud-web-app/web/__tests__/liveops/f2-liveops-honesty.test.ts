/**
 * F.2 LiveOps / TelemetrySpool honesty deepen — gates + durable playtime path.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  evaluateLiveOpsF2Honesty,
  probeLiveOpsF2Honesty,
} from '@/lib/liveops/liveops-f2-capability'
import {
  createMemoryTelemetrySpool,
  SESSION_PLAYTIME_EVENT,
} from '@/lib/liveops/telemetry-spool'
import {
  enqueueSessionPlaytime,
  flushPlaytimeSpool,
} from '@/lib/liveops/playtime-client'
import {
  evaluateHubDiscoveryGate,
  evaluateHubHonesty,
  evaluateVerifiedReviewGate,
} from '@/lib/hub/hub-honesty-capability'
import { resolveMaturityBadgeForPath } from '@/lib/routes/maturity-badge-resolver'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

describe('F.2 LiveOps honesty capability', () => {
  it('reports playtime ready only when spool + ingest + writable stats', () => {
    const held = evaluateLiveOpsF2Honesty({
      spoolModuleReady: true,
      playtimeIngestReady: true,
      playerStatsWritable: false,
    })
    expect(held.playtimeTelemetryReady).toBe(false)
    expect(held.playerGameStats.status).toBe('HELD')
    expect(held.discoveryFeedReady).toBe(false)
    expect(held.reviewsStoreReady).toBe(false)
    expect(held.heatmaps.status).toBe('HELD')
    expect(held.gameSaveCloud.status).toBe('HELD')
    expect(held.gameSaveDurableReady).toBe(false)

    const ready = evaluateLiveOpsF2Honesty({
      spoolModuleReady: true,
      playtimeIngestReady: true,
      playerStatsWritable: true,
      gameSaveDurableReady: true,
    })
    expect(ready.playtimeTelemetryReady).toBe(true)
    expect(ready.telemetrySpool.status).toBe('IMPLEMENTED')
    expect(ready.playtimeIngest.status).toBe('IMPLEMENTED')
    expect(ready.playerGameStats.status).toBe('IMPLEMENTED')
    expect(ready.gameSaveDurableReady).toBe(true)
    expect(ready.gameSaveCloudReady).toBe(false)
    expect(ready.discoveryFeedReady).toBe(false)
    expect(ready.reviewsStoreReady).toBe(false)
    expect(ready.productCopy).toMatch(/\[HELD\]/)
  })

  it('probeLiveOpsF2Honesty uses real writable PlayerGameStats root', async () => {
    const report = await probeLiveOpsF2Honesty()
    expect(report.wave).toBe('F.2')
    expect(report.telemetrySpool.connectable).toBe(true)
    expect(report.playtimeIngest.connectable).toBe(true)
    expect(report.playtimeTelemetryReady).toBe(true)
    // I.1 Discovery Feed engine CORE — probe flips when engine module ready
    expect(report.discoveryFeedReady).toBe(true)
    // I.2 GameReview store CORE — probe flips when `.aethel/hub/reviews` writable
    expect(report.reviewsStoreReady).toBe(true)
    // F.1 durable GameSave CORE — probe flips when `.aethel/liveops/game-saves` writable
    expect(report.gameSaveDurableReady).toBe(true)
    // Prisma/R2 cloud sync marketing stays HELD
    expect(report.gameSaveCloudReady).toBe(false)
  })
})

describe('TelemetrySpool store-and-forward', () => {
  it('enqueues session_playtime_seconds and marks synced after ACK', async () => {
    const spool = createMemoryTelemetrySpool(`vitest_${Date.now()}`)
    await spool.clearAll()

    const row = await spool.enqueue({
      event: SESSION_PLAYTIME_EVENT,
      gameId: 'neon-runner',
      sessionId: 'sess-1',
      payload: { deltaSeconds: 120 },
    })
    expect(row.synced).toBe(false)

    const unsynced = await spool.peekUnsynced()
    expect(unsynced).toHaveLength(1)
    expect(unsynced[0].event).toBe(SESSION_PLAYTIME_EVENT)

    const marked = await spool.markSynced([row.id])
    expect(marked).toBe(1)
    expect(await spool.peekUnsynced()).toHaveLength(0)

    const stats = await spool.stats()
    expect(stats.backend).toBe('memory')
    expect(stats.total).toBe(1)
    expect(stats.unsynced).toBe(0)
  })

  it('flushPlaytimeSpool leaves rows unsynced on network failure (Law II)', async () => {
    const spool = createMemoryTelemetrySpool(`vitest_offline_${Date.now()}`)
    await enqueueSessionPlaytime({
      spool,
      gameId: 'haunted-cabin',
      sessionId: 'sess-2',
      deltaSeconds: 60,
    })

    const result = await flushPlaytimeSpool({
      spool,
      fetchImpl: async () => {
        throw new Error('OFFLINE')
      },
    })
    expect(result.ok).toBe(false)
    expect(result.marked).toBe(0)
    expect(await spool.peekUnsynced()).toHaveLength(1)
  })

  it('flushPlaytimeSpool marks accepted ids on ACK', async () => {
    const spool = createMemoryTelemetrySpool(`vitest_ack_${Date.now()}`)
    const row = await enqueueSessionPlaytime({
      spool,
      gameId: 'oss-kit',
      sessionId: 'sess-3',
      deltaSeconds: 30,
    })

    const result = await flushPlaytimeSpool({
      spool,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ acceptedIds: [row.id], rejected: 0 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    })
    expect(result.ok).toBe(true)
    expect(result.marked).toBe(1)
    expect(await spool.peekUnsynced()).toHaveLength(0)
  })
})

describe('PlayerGameStats durable authority', () => {
  const prevEnv = process.env.AETHEL_LIVEOPS_STATS_ROOT
  let tmpRoot: string

  afterEach(async () => {
    if (prevEnv === undefined) delete process.env.AETHEL_LIVEOPS_STATS_ROOT
    else process.env.AETHEL_LIVEOPS_STATS_ROOT = prevEnv
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('persists playtime across reloads under .aethel/liveops/player-stats', async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-f2-'))
    process.env.AETHEL_LIVEOPS_STATS_ROOT = tmpRoot

    const {
      recordSessionPlaytime,
      getPlayerGameStats,
      probePlaytimeAuthorityWritable,
    } = await import('@/lib/liveops/player-playtime-authority')

    const first = await recordSessionPlaytime({
      userId: 'user-a',
      gameId: 'neon-runner',
      deltaSeconds: 100,
      sessionId: 's1',
    })
    expect(first.playtimeSeconds).toBe(100)
    expect(first.sessionsCount).toBe(1)

    const second = await recordSessionPlaytime({
      userId: 'user-a',
      gameId: 'neon-runner',
      deltaSeconds: 50,
      sessionId: 's2',
    })
    expect(second.playtimeSeconds).toBe(150)
    expect(second.sessionsCount).toBe(2)

    const loaded = await getPlayerGameStats('user-a', 'neon-runner')
    expect(loaded?.playtimeSeconds).toBe(150)

    const probe = await probePlaytimeAuthorityWritable()
    expect(probe.writable).toBe(true)
    expect(probe.root).toBe(tmpRoot)
  })
})

describe('Hub I.1/I.2 gates wired to F.2 flags', () => {
  it('does not open discovery or review marketing on F.2 playtime alone', () => {
    const hub = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      playtimeTelemetryReady: true,
      reviewsStoreReady: false,
      discoveryFeedReady: false,
    })
    expect(hub.marketingDiscoveryAllowed).toBe(false)
    expect(hub.marketingVerifiedReviewsAllowed).toBe(false)
    expect(evaluateHubDiscoveryGate({}).allowed).toBe(false)
    expect(
      evaluateVerifiedReviewGate({
        playtimeTelemetryReady: true,
        playtimeSeconds: 99999,
      }).code,
    ).toBe('REVIEWS_STORE_HELD')
  })

  it('updates /arcade maturity notes for F.2 deepen', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/F\.2/i)
    expect(arcade?.notes).toMatch(/HELD/i)
    const badge = resolveMaturityBadgeForPath('/arcade')
    expect(badge?.maturity).toBe('BETA')
  })
})
