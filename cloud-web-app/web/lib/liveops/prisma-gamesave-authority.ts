/**
 * F.1 — Prisma GameSave authority (Law II cloud citizen).
 * Injectable store for Vitest doubles. Durable disk path remains separate.
 */

import { randomBytes } from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import { computeGameSaveChecksum, verifyGameSaveChecksum } from '@/lib/liveops/game-save-checksum'
import {
  DEFAULT_GAME_SAVE_CONFLICT_POLICY,
  GAME_SAVE_PAYLOAD_JSON_MAX,
  type GameSaveRecord,
  type GameSaveUpsertInput,
  type GameSaveUpsertResult,
  normalizeSaveName,
  validateSlotIndex,
} from '@/lib/liveops/game-save-authority'
import {
  isValidGameSaveConflictPolicy,
  resolveGameSaveConflict,
  type GameSaveConflictPolicy,
} from '@/lib/liveops/game-save-conflict'
import {
  buildGameSaveBlobKey,
  createDefaultGameSaveBlobStore,
  shouldOffloadGameSavePayload,
  type GameSaveBlobStore,
} from '@/lib/liveops/gamesave-r2-cas'

const log = createComponentLogger('prisma-gamesave-authority')

export interface PrismaGameSaveRow {
  id: string
  userId: string
  gameId: string
  slotIndex: number
  name: string
  payload: unknown | null
  checksum: string
  r2Key: string | null
  blobHash: string | null
  clientPlatform: string | null
  revisedAt: Date
  createdAt: Date
  updatedAt: Date
  revision: number
}

export interface PrismaGameSaveStore {
  findUnique(args: {
    where: { userId_gameId_slotIndex: { userId: string; gameId: string; slotIndex: number } }
  }): Promise<PrismaGameSaveRow | null>
  findMany(args: {
    where: { userId: string; gameId: string }
    orderBy?: { slotIndex: 'asc' | 'desc' }
  }): Promise<PrismaGameSaveRow[]>
  upsert(args: {
    where: { userId_gameId_slotIndex: { userId: string; gameId: string; slotIndex: number } }
    create: Omit<PrismaGameSaveRow, 'createdAt' | 'updatedAt'> & {
      createdAt?: Date
      updatedAt?: Date
    }
    update: Partial<
      Omit<PrismaGameSaveRow, 'id' | 'userId' | 'gameId' | 'slotIndex' | 'createdAt'>
    > & { updatedAt?: Date }
  }): Promise<PrismaGameSaveRow>
  deleteMany(args: {
    where: { userId: string; gameId: string; slotIndex?: number }
  }): Promise<{ count: number }>
}

export interface PrismaGameSaveAuthorityOptions {
  store: PrismaGameSaveStore
  blobStore?: GameSaveBlobStore
  /** Prefer R2 CAS when remote configured and payload large enough. */
  preferR2Offload?: boolean
}

function newSaveId(): string {
  return `gs_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
}

function assertPayloadSize(payload: unknown): string | null {
  let serialized: string
  try {
    serialized = JSON.stringify(payload)
  } catch {
    return 'GAMESAVE_PAYLOAD_INVALID'
  }
  if (serialized === undefined) return 'GAMESAVE_PAYLOAD_INVALID'
  if (serialized.length > GAME_SAVE_PAYLOAD_JSON_MAX) return 'GAMESAVE_PAYLOAD_TOO_LARGE'
  return null
}

function rowToRecord(row: PrismaGameSaveRow, payload: unknown): GameSaveRecord {
  return {
    id: row.id,
    userId: row.userId,
    gameId: row.gameId,
    slotIndex: row.slotIndex,
    name: row.name,
    payload,
    checksum: row.checksum,
    clientPlatform: row.clientPlatform,
    revisedAt: row.revisedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    revision: row.revision,
  }
}

async function resolvePayload(
  row: PrismaGameSaveRow,
  blobStore: GameSaveBlobStore,
): Promise<unknown> {
  if (row.payload != null) return row.payload
  if (row.r2Key) {
    const raw = await blobStore.get(row.r2Key)
    if (raw == null) {
      throw new Error('GAMESAVE_BLOB_MISSING')
    }
    return JSON.parse(raw) as unknown
  }
  return null
}

export function createPrismaGameSaveAuthority(options: PrismaGameSaveAuthorityOptions) {
  const store = options.store
  const blobStore = options.blobStore ?? createDefaultGameSaveBlobStore()
  const preferR2Offload = options.preferR2Offload !== false

  async function getGameSave(
    userId: string,
    gameId: string,
    slotIndex: number,
  ): Promise<GameSaveRecord | null> {
    const slot = validateSlotIndex(slotIndex)
    if (slot === null) return null
    const row = await store.findUnique({
      where: { userId_gameId_slotIndex: { userId, gameId, slotIndex: slot } },
    })
    if (!row) return null
    const payload = await resolvePayload(row, blobStore)
    return rowToRecord(row, payload)
  }

  async function listGameSaves(userId: string, gameId: string): Promise<GameSaveRecord[]> {
    const rows = await store.findMany({
      where: { userId, gameId },
      orderBy: { slotIndex: 'asc' },
    })
    const out: GameSaveRecord[] = []
    for (const row of rows) {
      const payload = await resolvePayload(row, blobStore)
      out.push(rowToRecord(row, payload))
    }
    return out
  }

  async function deleteGameSave(
    userId: string,
    gameId: string,
    slotIndex: number,
  ): Promise<boolean> {
    const slot = validateSlotIndex(slotIndex)
    if (slot === null) return false
    const existing = await store.findUnique({
      where: { userId_gameId_slotIndex: { userId, gameId, slotIndex: slot } },
    })
    if (!existing) return false
    if (existing.r2Key) {
      await blobStore.delete(existing.r2Key).catch(() => false)
    }
    const result = await store.deleteMany({
      where: { userId, gameId, slotIndex: slot },
    })
    return result.count > 0
  }

  async function upsertGameSave(input: GameSaveUpsertInput): Promise<GameSaveUpsertResult> {
    const userId = String(input.userId || '').trim()
    const gameId = String(input.gameId || '').trim()
    if (!userId || !gameId) {
      return { ok: false, code: 'GAMESAVE_IDENTITY_REQUIRED' }
    }

    const slotIndex = validateSlotIndex(input.slotIndex)
    if (slotIndex === null) {
      return { ok: false, code: 'GAMESAVE_SLOT_INVALID' }
    }

    const sizeCode = assertPayloadSize(input.payload)
    if (sizeCode === 'GAMESAVE_PAYLOAD_INVALID') {
      return { ok: false, code: 'GAMESAVE_PAYLOAD_INVALID' }
    }
    if (sizeCode === 'GAMESAVE_PAYLOAD_TOO_LARGE') {
      return { ok: false, code: 'GAMESAVE_PAYLOAD_TOO_LARGE' }
    }

    const checksum = computeGameSaveChecksum(input.payload)
    if (input.checksum != null && String(input.checksum).trim()) {
      if (!verifyGameSaveChecksum(input.payload, String(input.checksum))) {
        return { ok: false, code: 'GAMESAVE_CHECKSUM_MISMATCH' }
      }
    }

    const policy: GameSaveConflictPolicy = isValidGameSaveConflictPolicy(input.conflictPolicy)
      ? input.conflictPolicy
      : DEFAULT_GAME_SAVE_CONFLICT_POLICY

    const existing = await store.findUnique({
      where: { userId_gameId_slotIndex: { userId, gameId, slotIndex } },
    })
    const existingRecord = existing
      ? rowToRecord(existing, await resolvePayload(existing, blobStore))
      : null

    const revisedAtIso = input.revisedAt ?? new Date().toISOString()
    const incomingRevision =
      existing && typeof input.expectedRevision === 'number'
        ? Math.floor(input.expectedRevision) + 1
        : existing
          ? existing.revision + 1
          : 1

    if (existing && typeof input.expectedRevision === 'number') {
      if (Math.floor(input.expectedRevision) !== existing.revision) {
        return {
          ok: false,
          code: 'GAMESAVE_REVISION_STALE',
          conflict: {
            server: existingRecord!,
            reason: 'expected_revision_mismatch',
            policy,
          },
        }
      }
    }

    const decision = resolveGameSaveConflict({
      server: existing
        ? {
            checksum: existing.checksum,
            revisedAt: existing.revisedAt.toISOString(),
            revision: existing.revision,
          }
        : null,
      incoming: {
        checksum,
        revisedAt: revisedAtIso,
        revision: incomingRevision,
      },
      policy,
    })

    if (decision.action === 'keep_server' && existingRecord) {
      return {
        ok: true,
        record: existingRecord,
        created: false,
        conflictResolved: true,
      }
    }

    if (decision.action === 'conflict' && existingRecord) {
      return {
        ok: false,
        code: 'GAMESAVE_CONFLICT',
        conflict: {
          server: existingRecord,
          reason: decision.reason,
          policy,
        },
      }
    }

    if (existing && decision.reason === 'idempotent_same_checksum' && existingRecord) {
      return {
        ok: true,
        record: existingRecord,
        created: false,
        conflictResolved: false,
      }
    }

    const serialized = JSON.stringify(input.payload)
    let payload: unknown | null = input.payload
    let r2Key: string | null = null
    let blobHash: string | null = null

    const useR2 =
      preferR2Offload &&
      blobStore.isRemoteConfigured() &&
      shouldOffloadGameSavePayload(serialized.length)

    if (useR2) {
      r2Key = buildGameSaveBlobKey({ userId, gameId, slotIndex, checksum })
      blobHash = checksum
      const put = await blobStore.put(r2Key, serialized)
      if (!put.ok) {
        // Fail closed on intended R2 offload — do not pretend cloud CAS succeeded.
        log.warn('gamesave_prisma_r2_offload_failed', { userId, gameId, slotIndex })
        return { ok: false, code: 'GAMESAVE_PAYLOAD_INVALID' }
      }
      payload = null
    }

    const revisedAt = new Date(revisedAtIso)
    const id = existing?.id ?? newSaveId()
    const revision = existing ? existing.revision + 1 : 1
    const name = normalizeSaveName(input.name, slotIndex)
    const clientPlatform =
      input.clientPlatform != null ? String(input.clientPlatform).slice(0, 64) : null

    const row = await store.upsert({
      where: { userId_gameId_slotIndex: { userId, gameId, slotIndex } },
      create: {
        id,
        userId,
        gameId,
        slotIndex,
        name,
        payload,
        checksum,
        r2Key,
        blobHash,
        clientPlatform,
        revisedAt,
        revision,
      },
      update: {
        name,
        payload,
        checksum,
        r2Key,
        blobHash,
        clientPlatform,
        revisedAt,
        revision,
        updatedAt: new Date(),
      },
    })

    if (existing?.r2Key && existing.r2Key !== r2Key) {
      await blobStore.delete(existing.r2Key).catch(() => false)
    }

    log.info('gamesave_prisma_upserted', {
      userId,
      gameId,
      slotIndex,
      revision: row.revision,
      r2: Boolean(r2Key),
      created: !existing,
    })

    return {
      ok: true,
      record: rowToRecord(row, input.payload),
      created: !existing,
      conflictResolved:
        decision.reason !== 'no_server_record' && decision.reason !== 'idempotent_same_checksum',
    }
  }

  return {
    getGameSave,
    listGameSaves,
    deleteGameSave,
    upsertGameSave,
  }
}

export type PrismaGameSaveAuthority = ReturnType<typeof createPrismaGameSaveAuthority>

/** Alias for honesty probes / older call sites. */
export type PrismaGameSaveDelegate = PrismaGameSaveStore

/** In-memory store for Vitest doubles — proves round-trip without a live DB. */
export function createMemoryPrismaGameSaveStore(): PrismaGameSaveStore {
  const rows = new Map<string, PrismaGameSaveRow>()
  const keyOf = (userId: string, gameId: string, slotIndex: number) =>
    `${userId}::${gameId}::${slotIndex}`

  return {
    async findUnique({ where }) {
      const { userId, gameId, slotIndex } = where.userId_gameId_slotIndex
      return rows.get(keyOf(userId, gameId, slotIndex)) ?? null
    },
    async findMany({ where, orderBy }) {
      const out = [...rows.values()].filter(
        (r) => r.userId === where.userId && r.gameId === where.gameId,
      )
      out.sort((a, b) =>
        orderBy?.slotIndex === 'desc' ? b.slotIndex - a.slotIndex : a.slotIndex - b.slotIndex,
      )
      return out
    },
    async upsert({ where, create, update }) {
      const { userId, gameId, slotIndex } = where.userId_gameId_slotIndex
      const k = keyOf(userId, gameId, slotIndex)
      const existing = rows.get(k)
      const now = new Date()
      if (!existing) {
        const row: PrismaGameSaveRow = {
          id: create.id,
          userId: create.userId,
          gameId: create.gameId,
          slotIndex: create.slotIndex,
          name: create.name,
          payload: create.payload ?? null,
          checksum: create.checksum,
          r2Key: create.r2Key ?? null,
          blobHash: create.blobHash ?? null,
          clientPlatform: create.clientPlatform ?? null,
          revisedAt: create.revisedAt,
          revision: create.revision,
          createdAt: create.createdAt ?? now,
          updatedAt: create.updatedAt ?? now,
        }
        rows.set(k, row)
        return row
      }
      const row: PrismaGameSaveRow = {
        ...existing,
        name: update.name ?? existing.name,
        payload: update.payload !== undefined ? update.payload : existing.payload,
        checksum: update.checksum ?? existing.checksum,
        r2Key: update.r2Key !== undefined ? update.r2Key : existing.r2Key,
        blobHash: update.blobHash !== undefined ? update.blobHash : existing.blobHash,
        clientPlatform:
          update.clientPlatform !== undefined ? update.clientPlatform : existing.clientPlatform,
        revisedAt: update.revisedAt ?? existing.revisedAt,
        revision: update.revision ?? existing.revision,
        updatedAt: update.updatedAt ?? now,
      }
      rows.set(k, row)
      return row
    },
    async deleteMany({ where }) {
      let count = 0
      for (const [k, row] of rows) {
        if (row.userId !== where.userId || row.gameId !== where.gameId) continue
        if (where.slotIndex != null && row.slotIndex !== where.slotIndex) continue
        rows.delete(k)
        count += 1
      }
      return { count }
    },
  }
}
