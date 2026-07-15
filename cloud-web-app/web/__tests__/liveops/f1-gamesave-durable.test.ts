/**
 * F.1 GameSave durable CORE — authority, checksum, conflict policy, honesty split.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  computeGameSaveChecksum,
  verifyGameSaveChecksum,
} from '@/lib/liveops/game-save-checksum'
import { resolveGameSaveConflict } from '@/lib/liveops/game-save-conflict'
import {
  evaluateLiveOpsF2Honesty,
  probeLiveOpsF2Honesty,
} from '@/lib/liveops/liveops-f2-capability'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'
import { resolveMaturityBadgeForPath } from '@/lib/routes/maturity-badge-resolver'

describe('F.1 GameSave checksum', () => {
  it('is stable under key reordering and verifies payload', () => {
    const a = computeGameSaveChecksum({ hp: 10, pos: { x: 1, y: 2 } })
    const b = computeGameSaveChecksum({ pos: { y: 2, x: 1 }, hp: 10 })
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(verifyGameSaveChecksum({ hp: 10, pos: { x: 1, y: 2 } }, a)).toBe(true)
    expect(verifyGameSaveChecksum({ hp: 11, pos: { x: 1, y: 2 } }, a)).toBe(false)
  })
})

describe('F.1 GameSave conflict policy', () => {
  const server = {
    checksum: 'aaa',
    revisedAt: '2026-07-13T10:00:00.000Z',
    revision: 2,
  }

  it('accepts when no server record', () => {
    const d = resolveGameSaveConflict({
      server: null,
      incoming: { checksum: 'bbb', revisedAt: '2026-07-13T11:00:00.000Z', revision: 1 },
    })
    expect(d.action).toBe('accept')
    expect(d.winner).toBe('incoming')
  })

  it('idempotent same checksum', () => {
    const d = resolveGameSaveConflict({
      server,
      incoming: { ...server },
    })
    expect(d.action).toBe('accept')
    expect(d.reason).toBe('idempotent_same_checksum')
  })

  it('last_write_wins prefers newer clock when revision behind', () => {
    const d = resolveGameSaveConflict({
      server,
      incoming: {
        checksum: 'bbb',
        revisedAt: '2026-07-13T12:00:00.000Z',
        revision: 1,
      },
      policy: 'last_write_wins',
    })
    expect(d.action).toBe('accept')
    expect(d.winner).toBe('incoming')
  })

  it('server_wins keeps server on checksum mismatch', () => {
    const d = resolveGameSaveConflict({
      server,
      incoming: {
        checksum: 'bbb',
        revisedAt: '2026-07-13T12:00:00.000Z',
        revision: 3,
      },
      policy: 'server_wins',
    })
    expect(d.action).toBe('keep_server')
    expect(d.winner).toBe('server')
  })

  it('reject_conflict surfaces concurrent checksum mismatch', () => {
    const d = resolveGameSaveConflict({
      server,
      incoming: {
        checksum: 'bbb',
        revisedAt: '2026-07-13T10:00:00.000Z',
        revision: 2,
      },
      policy: 'reject_conflict',
    })
    expect(d.action).toBe('conflict')
    expect(d.reason).toMatch(/checksum|concurrent/)
  })

  it('client_wins overwrites same revision', () => {
    const d = resolveGameSaveConflict({
      server,
      incoming: {
        checksum: 'bbb',
        revisedAt: '2026-07-13T09:00:00.000Z',
        revision: 2,
      },
      policy: 'client_wins',
    })
    expect(d.action).toBe('accept')
    expect(d.winner).toBe('incoming')
  })
})

describe('F.1 GameSave durable authority', () => {
  const prevEnv = process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT
  let tmpRoot: string

  afterEach(async () => {
    if (prevEnv === undefined) delete process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT
    else process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT = prevEnv
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('persists slots with checksum and conflict keep_server', async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-f1-gs-'))
    process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT = tmpRoot

    const {
      upsertGameSave,
      getGameSave,
      listGameSaves,
      deleteGameSave,
      probeGameSaveAuthorityWritable,
    } = await import('@/lib/liveops/game-save-authority')

    const first = await upsertGameSave({
      userId: 'user-a',
      gameId: 'neon-runner',
      slotIndex: 0,
      name: 'Chapter 1',
      payload: { chapter: 1, hp: 100 },
      revisedAt: '2026-07-13T10:00:00.000Z',
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.created).toBe(true)
    expect(first.record.checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(first.record.revision).toBe(1)

    const loaded = await getGameSave('user-a', 'neon-runner', 0)
    expect(loaded?.payload).toEqual({ chapter: 1, hp: 100 })

    const conflict = await upsertGameSave({
      userId: 'user-a',
      gameId: 'neon-runner',
      slotIndex: 0,
      payload: { chapter: 2, hp: 50 },
      revisedAt: '2026-07-13T09:00:00.000Z',
      conflictPolicy: 'server_wins',
    })
    expect(conflict.ok).toBe(true)
    if (!conflict.ok) return
    expect(conflict.conflictResolved).toBe(true)
    expect(conflict.record.payload).toEqual({ chapter: 1, hp: 100 })

    const rejected = await upsertGameSave({
      userId: 'user-a',
      gameId: 'neon-runner',
      slotIndex: 0,
      payload: { chapter: 9 },
      revisedAt: '2026-07-13T10:00:00.000Z',
      conflictPolicy: 'reject_conflict',
    })
    expect(rejected.ok).toBe(false)
    if (rejected.ok) return
    expect(rejected.code).toBe('GAMESAVE_CONFLICT')

    const advance = await upsertGameSave({
      userId: 'user-a',
      gameId: 'neon-runner',
      slotIndex: 0,
      payload: { chapter: 2, hp: 80 },
      revisedAt: '2026-07-13T12:00:00.000Z',
      conflictPolicy: 'last_write_wins',
    })
    expect(advance.ok).toBe(true)
    if (!advance.ok) return
    expect(advance.record.revision).toBe(2)
    expect(advance.record.payload).toEqual({ chapter: 2, hp: 80 })

    const listed = await listGameSaves('user-a', 'neon-runner')
    expect(listed).toHaveLength(1)

    expect(await deleteGameSave('user-a', 'neon-runner', 0)).toBe(true)
    expect(await getGameSave('user-a', 'neon-runner', 0)).toBeNull()

    const probe = await probeGameSaveAuthorityWritable()
    expect(probe.writable).toBe(true)
    expect(probe.root).toBe(tmpRoot)
  })

  it('rejects invalid slot and bad client checksum', async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-f1-gs-bad-'))
    process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT = tmpRoot
    const { upsertGameSave } = await import('@/lib/liveops/game-save-authority')

    const badSlot = await upsertGameSave({
      userId: 'u',
      gameId: 'g',
      slotIndex: 99,
      payload: {},
    })
    expect(badSlot.ok).toBe(false)
    if (badSlot.ok) return
    expect(badSlot.code).toBe('GAMESAVE_SLOT_INVALID')

    const badChecksum = await upsertGameSave({
      userId: 'u',
      gameId: 'g',
      slotIndex: 1,
      payload: { ok: true },
      checksum: 'deadbeef',
    })
    expect(badChecksum.ok).toBe(false)
    if (badChecksum.ok) return
    expect(badChecksum.code).toBe('GAMESAVE_CHECKSUM_MISMATCH')
  })
})

describe('F.1 honesty split (durable vs cloud)', () => {
  it('flips durable ready without unlocking cloud marketing', () => {
    const report = evaluateLiveOpsF2Honesty({
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
    expect(report.gameSaveDurableReady).toBe(true)
    expect(report.gameSaveDurable.status).toBe('IMPLEMENTED')
    expect(report.gameSaveCloudReady).toBe(false)
    expect(report.gameSaveCloud.status).toBe('HELD')
    expect(report.productCopy).toMatch(/Durable GameSave/i)
    expect(report.productCopy).toMatch(/Prisma\/R2 cloud sync/i)
    expect(report.productCopy).toMatch(/\[HELD\]/)
    expect(report.claim).toMatch(/durable GameSave live/i)
  })

  it('probeLiveOpsF2Honesty reports durable ready and cloud HELD', async () => {
    const report = await probeLiveOpsF2Honesty()
    expect(report.gameSaveDurableReady).toBe(true)
    expect(report.gameSaveCloudReady).toBe(false)
    expect(report.gameSaveCloud.status).toBe('HELD')
  })

  it('updates /arcade maturity notes for F.1 durable + Prisma cloud gated', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/F\.1 durable GameSave/i)
    expect(arcade?.notes).toMatch(/Prisma GameSave/i)
    expect(arcade?.notes).toMatch(/\[HELD/i)
    const badge = resolveMaturityBadgeForPath('/arcade')
    expect(badge?.maturity).toBe('BETA')
  })
})
