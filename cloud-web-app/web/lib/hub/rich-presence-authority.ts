/**
 * I.4 — Rich presence durable authority (disk-backed).
 * Online / status / current game via heartbeat. Never invents fake online friends.
 * Layout: `.aethel/hub/presence/<userId>.json`
 * Dedicated multiplayer session host / Agones stays [HELD] — presence ≠ live fleet.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('rich-presence-authority')

export const PRESENCE_STATUSES = ['online', 'away', 'in_game', 'offline'] as const
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number]

/** Heartbeat TTL — stale records read as offline (honest). */
export const PRESENCE_TTL_MS = 90_000

export interface RichPresenceRecord {
  userId: string
  status: PresenceStatus
  gameId?: string
  gameTitle?: string
  /** Client claims joinable lobby — not Agones allocation. */
  joinable: boolean
  /** Optional opaque lobby hint — never an Agones fleet id claim. */
  lobbyHint?: string
  updatedAt: string
  expiresAt: string
}

const PRESENCE_DIR_SEGMENTS = ['.aethel', 'hub', 'presence'] as const

function getPresenceRoot(): string {
  return process.env.AETHEL_HUB_PRESENCE_ROOT
    ? path.resolve(process.env.AETHEL_HUB_PRESENCE_ROOT)
    : path.resolve(process.cwd(), ...PRESENCE_DIR_SEGMENTS)
}

function sanitize(segment: string): string {
  return (
    String(segment || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  )
}

function presencePath(userId: string): string {
  return path.join(getPresenceRoot(), `${sanitize(userId)}.json`)
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeJsonFile(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

export function isValidPresenceStatus(status: unknown): status is PresenceStatus {
  return typeof status === 'string' && (PRESENCE_STATUSES as readonly string[]).includes(status)
}

export function isPresenceFresh(
  record: RichPresenceRecord | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!record?.expiresAt) return false
  const exp = Date.parse(record.expiresAt)
  if (Number.isNaN(exp)) return false
  return exp > nowMs && record.status !== 'offline'
}

export type UpsertPresenceInput = {
  userId: string
  status?: unknown
  gameId?: string
  gameTitle?: string
  joinable?: boolean
  lobbyHint?: string
  /** Clock override for tests */
  nowMs?: number
  ttlMs?: number
}

export async function upsertPresence(input: UpsertPresenceInput): Promise<RichPresenceRecord> {
  const userId = String(input.userId || '').trim()
  if (!userId) {
    throw Object.assign(new Error('PRESENCE_IDENTITY_REQUIRED'), {
      code: 'PRESENCE_IDENTITY_REQUIRED',
    })
  }

  const status: PresenceStatus = isValidPresenceStatus(input.status)
    ? input.status
    : 'online'
  const nowMs = input.nowMs ?? Date.now()
  const ttlMs = input.ttlMs ?? PRESENCE_TTL_MS
  const nowIso = new Date(nowMs).toISOString()
  const expiresAt = new Date(nowMs + ttlMs).toISOString()

  const record: RichPresenceRecord = {
    userId,
    status: status === 'offline' ? 'offline' : status,
    gameId: input.gameId ? String(input.gameId).trim().slice(0, 80) : undefined,
    gameTitle: input.gameTitle ? String(input.gameTitle).trim().slice(0, 120) : undefined,
    joinable: input.joinable === true && status === 'in_game',
    lobbyHint: input.lobbyHint ? String(input.lobbyHint).trim().slice(0, 120) : undefined,
    updatedAt: nowIso,
    expiresAt: status === 'offline' ? nowIso : expiresAt,
  }

  await writeJsonFile(presencePath(userId), record)
  log.info('rich_presence_upserted', {
    userId,
    status: record.status,
    joinable: record.joinable,
  })
  return record
}

/**
 * Returns fresh presence or null (empty-honest — never invents online).
 */
export async function getPresence(
  userId: string,
  nowMs: number = Date.now(),
): Promise<RichPresenceRecord | null> {
  const id = String(userId || '').trim()
  if (!id) return null
  const row = await readJsonFile<RichPresenceRecord>(presencePath(id))
  if (!row?.userId) return null
  if (!isPresenceFresh(row, nowMs)) {
    return {
      ...row,
      status: 'offline',
      joinable: false,
    }
  }
  return row
}

/**
 * Lookup multiple users — only returns rows that exist on disk.
 * Never fabricates "online friends".
 */
export async function getPresenceForUsers(
  userIds: string[],
  nowMs: number = Date.now(),
): Promise<RichPresenceRecord[]> {
  const unique = [...new Set(userIds.map((u) => String(u || '').trim()).filter(Boolean))]
  const out: RichPresenceRecord[] = []
  for (const id of unique) {
    const row = await getPresence(id, nowMs)
    if (row) out.push(row)
  }
  return out
}

/** Probe used by Hub honesty — confirms durable presence root is writable. */
export async function probeRichPresenceWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getPresenceRoot()
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

export function getRichPresenceRoot(): string {
  return getPresenceRoot()
}
