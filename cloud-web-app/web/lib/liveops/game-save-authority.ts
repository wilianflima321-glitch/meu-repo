/**
 * F.1 — GameSave durable authority (disk-backed).
 * Slots + checksum + conflict policy under `.aethel/liveops/game-saves`.
 * Not localStorage. Prisma GameSave + R2 CAS deepen shipped (ay); marketing flip stays HELD until probe proves DB+remote CAS.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import { computeGameSaveChecksum, verifyGameSaveChecksum } from '@/lib/liveops/game-save-checksum'
import {
  isValidGameSaveConflictPolicy,
  resolveGameSaveConflict,
  type GameSaveConflictPolicy,
} from '@/lib/liveops/game-save-conflict'

const log = createComponentLogger('game-save-authority')

export const GAME_SAVE_SLOT_MIN = 0
export const GAME_SAVE_SLOT_MAX = 19
export const GAME_SAVE_NAME_MAX = 120
export const GAME_SAVE_PAYLOAD_JSON_MAX = 2 * 1024 * 1024 // 2 MiB serialized
export const DEFAULT_GAME_SAVE_CONFLICT_POLICY: GameSaveConflictPolicy = 'last_write_wins'

export interface GameSaveRecord {
  id: string
  userId: string
  gameId: string
  slotIndex: number
  name: string
  /** Opaque game state blob (JSON-serializable). */
  payload: unknown
  checksum: string
  clientPlatform: string | null
  revisedAt: string
  createdAt: string
  updatedAt: string
  revision: number
}

export interface GameSaveUpsertInput {
  userId: string
  gameId: string
  slotIndex: number
  name?: string
  payload: unknown
  /** Client-supplied checksum; must match payload when provided. */
  checksum?: string
  clientPlatform?: string | null
  revisedAt?: string
  /** Expected server revision for optimistic concurrency (optional). */
  expectedRevision?: number
  conflictPolicy?: GameSaveConflictPolicy
}

export type GameSaveUpsertResult =
  | { ok: true; record: GameSaveRecord; created: boolean; conflictResolved: boolean }
  | {
      ok: false
      code:
        | 'GAMESAVE_IDENTITY_REQUIRED'
        | 'GAMESAVE_SLOT_INVALID'
        | 'GAMESAVE_PAYLOAD_INVALID'
        | 'GAMESAVE_PAYLOAD_TOO_LARGE'
        | 'GAMESAVE_CHECKSUM_MISMATCH'
        | 'GAMESAVE_CONFLICT'
        | 'GAMESAVE_REVISION_STALE'
      conflict?: {
        server: GameSaveRecord
        reason: string
        policy: GameSaveConflictPolicy
      }
    }

const SAVES_DIR_SEGMENTS = ['.aethel', 'liveops', 'game-saves'] as const

function getSavesRoot(): string {
  const base = process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT
    ? path.resolve(process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT)
    : path.resolve(process.cwd(), ...SAVES_DIR_SEGMENTS)
  return base
}

function sanitize(segment: string): string {
  return (
    String(segment || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  )
}

function slotFileName(slotIndex: number): string {
  return `slot-${slotIndex}.json`
}

function savePath(userId: string, gameId: string, slotIndex: number): string {
  return path.join(
    getSavesRoot(),
    sanitize(userId),
    sanitize(gameId),
    slotFileName(slotIndex),
  )
}

function newSaveId(): string {
  return `gs_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
}

async function readSaveFile(file: string): Promise<GameSaveRecord | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as GameSaveRecord
    if (
      !parsed ||
      typeof parsed.slotIndex !== 'number' ||
      !parsed.userId ||
      !parsed.gameId ||
      typeof parsed.checksum !== 'string'
    ) {
      return null
    }
    return parsed
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeSaveFile(file: string, record: GameSaveRecord): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(record, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

export function validateSlotIndex(slotIndex: unknown): number | null {
  const n = Math.floor(Number(slotIndex))
  if (!Number.isFinite(n) || n < GAME_SAVE_SLOT_MIN || n > GAME_SAVE_SLOT_MAX) {
    return null
  }
  return n
}

export function normalizeSaveName(name: unknown, slotIndex: number): string {
  const trimmed = String(name ?? '')
    .trim()
    .slice(0, GAME_SAVE_NAME_MAX)
  return trimmed || `Slot ${slotIndex + 1}`
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

export async function getGameSave(
  userId: string,
  gameId: string,
  slotIndex: number,
): Promise<GameSaveRecord | null> {
  const slot = validateSlotIndex(slotIndex)
  if (slot === null) return null
  return readSaveFile(savePath(userId, gameId, slot))
}

export async function listGameSaves(
  userId: string,
  gameId: string,
): Promise<GameSaveRecord[]> {
  const dir = path.join(getSavesRoot(), sanitize(userId), sanitize(gameId))
  try {
    const files = await fs.readdir(dir)
    const out: GameSaveRecord[] = []
    for (const name of files) {
      if (!name.endsWith('.json') || !name.startsWith('slot-')) continue
      const row = await readSaveFile(path.join(dir, name))
      if (row) out.push(row)
    }
    return out.sort((a, b) => a.slotIndex - b.slotIndex)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return []
    throw err
  }
}

export async function deleteGameSave(
  userId: string,
  gameId: string,
  slotIndex: number,
): Promise<boolean> {
  const slot = validateSlotIndex(slotIndex)
  if (slot === null) return false
  const file = savePath(userId, gameId, slot)
  try {
    await fs.unlink(file)
    log.info('gamesave_deleted', { userId, gameId, slotIndex: slot })
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return false
    throw err
  }
}

export async function upsertGameSave(
  input: GameSaveUpsertInput,
): Promise<GameSaveUpsertResult> {
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

  const file = savePath(userId, gameId, slotIndex)
  const existing = await readSaveFile(file)
  const revisedAt = input.revisedAt ?? new Date().toISOString()
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
          server: existing,
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
          revisedAt: existing.revisedAt,
          revision: existing.revision,
        }
      : null,
    incoming: {
      checksum,
      revisedAt,
      revision: incomingRevision,
    },
    policy,
  })

  if (decision.action === 'keep_server' && existing) {
    return {
      ok: true,
      record: existing,
      created: false,
      conflictResolved: true,
    }
  }

  if (decision.action === 'conflict' && existing) {
    return {
      ok: false,
      code: 'GAMESAVE_CONFLICT',
      conflict: {
        server: existing,
        reason: decision.reason,
        policy,
      },
    }
  }

  // Idempotent same-checksum: return existing without revision bump.
  if (existing && decision.reason === 'idempotent_same_checksum') {
    return {
      ok: true,
      record: existing,
      created: false,
      conflictResolved: false,
    }
  }

  const now = new Date().toISOString()
  const record: GameSaveRecord = {
    id: existing?.id ?? newSaveId(),
    userId,
    gameId,
    slotIndex,
    name: normalizeSaveName(input.name, slotIndex),
    payload: input.payload,
    checksum,
    clientPlatform: input.clientPlatform != null ? String(input.clientPlatform).slice(0, 64) : null,
    revisedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    revision: existing ? existing.revision + 1 : 1,
  }

  await writeSaveFile(file, record)
  log.info('gamesave_upserted', {
    userId,
    gameId,
    slotIndex,
    revision: record.revision,
    created: !existing,
  })

  return {
    ok: true,
    record,
    created: !existing,
    conflictResolved: decision.reason !== 'no_server_record' && decision.reason !== 'idempotent_same_checksum',
  }
}

/** Probe used by F.1 honesty — confirms durable root is writable. */
export async function probeGameSaveAuthorityWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getSavesRoot()
  try {
    await fs.mkdir(root, { recursive: true })
    const probe = path.join(root, `.probe_${process.pid}`)
    await fs.writeFile(probe, 'ok', 'utf8')
    await fs.unlink(probe)
    return { writable: true, root }
  } catch (err) {
    return {
      writable: false,
      root,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

export function getGameSaveAuthorityRoot(): string {
  return getSavesRoot()
}
