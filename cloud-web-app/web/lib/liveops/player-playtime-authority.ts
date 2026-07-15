/**
 * F.2 — PlayerGameStats durable authority (disk-backed).
 * Aggregates session_playtime_seconds from TelemetrySpool flush.
 * Not localStorage — survives process restart under `.aethel/liveops/player-stats`.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('player-playtime-authority')

export interface PlayerGameStats {
  userId: string
  gameId: string
  playtimeSeconds: number
  sessionsCount: number
  lastPlayedAt: string | null
  updatedAt: string
}

/** Max seconds accepted in a single flush delta (12h) — basic anti-inflation. */
export const MAX_SESSION_DELTA_SECONDS = 12 * 60 * 60

const STATS_DIR_SEGMENTS = ['.aethel', 'liveops', 'player-stats'] as const

function getStatsRoot(): string {
  const base = process.env.AETHEL_LIVEOPS_STATS_ROOT
    ? path.resolve(process.env.AETHEL_LIVEOPS_STATS_ROOT)
    : path.resolve(process.cwd(), ...STATS_DIR_SEGMENTS)
  return base
}

function sanitize(segment: string): string {
  return String(segment || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80) || 'unknown'
}

function statsPath(userId: string, gameId: string): string {
  return path.join(getStatsRoot(), sanitize(userId), `${sanitize(gameId)}.json`)
}

async function readStatsFile(file: string): Promise<PlayerGameStats | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as PlayerGameStats
    if (!parsed || typeof parsed.playtimeSeconds !== 'number') return null
    return parsed
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeStatsFile(file: string, stats: PlayerGameStats): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(stats, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

export function createEmptyPlayerGameStats(userId: string, gameId: string): PlayerGameStats {
  return {
    userId,
    gameId,
    playtimeSeconds: 0,
    sessionsCount: 0,
    lastPlayedAt: null,
    updatedAt: new Date().toISOString(),
  }
}

export async function getPlayerGameStats(
  userId: string,
  gameId: string,
): Promise<PlayerGameStats | null> {
  return readStatsFile(statsPath(userId, gameId))
}

export async function recordSessionPlaytime(input: {
  userId: string
  gameId: string
  deltaSeconds: number
  sessionId?: string
  playedAt?: string
}): Promise<PlayerGameStats> {
  const gameId = String(input.gameId || '').trim()
  const userId = String(input.userId || '').trim()
  if (!userId || !gameId) {
    throw Object.assign(new Error('PLAYTIME_IDENTITY_REQUIRED'), {
      code: 'PLAYTIME_IDENTITY_REQUIRED',
    })
  }

  let delta = Math.floor(Number(input.deltaSeconds))
  if (!Number.isFinite(delta) || delta <= 0) {
    throw Object.assign(new Error('PLAYTIME_DELTA_INVALID'), {
      code: 'PLAYTIME_DELTA_INVALID',
    })
  }
  if (delta > MAX_SESSION_DELTA_SECONDS) {
    delta = MAX_SESSION_DELTA_SECONDS
  }

  const file = statsPath(userId, gameId)
  const existing = (await readStatsFile(file)) ?? createEmptyPlayerGameStats(userId, gameId)
  const playedAt = input.playedAt ?? new Date().toISOString()
  const next: PlayerGameStats = {
    userId,
    gameId,
    playtimeSeconds: existing.playtimeSeconds + delta,
    sessionsCount: existing.sessionsCount + 1,
    lastPlayedAt: playedAt,
    updatedAt: new Date().toISOString(),
  }
  await writeStatsFile(file, next)
  log.info('playtime_recorded', {
    userId,
    gameId,
    delta,
    total: next.playtimeSeconds,
    sessionId: input.sessionId ?? null,
  })
  return next
}

export async function listPlayerGameStatsForUser(userId: string): Promise<PlayerGameStats[]> {
  const dir = path.join(getStatsRoot(), sanitize(userId))
  try {
    const files = await fs.readdir(dir)
    const out: PlayerGameStats[] = []
    for (const name of files) {
      if (!name.endsWith('.json')) continue
      const row = await readStatsFile(path.join(dir, name))
      if (row) out.push(row)
    }
    return out.sort((a, b) => b.playtimeSeconds - a.playtimeSeconds)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return []
    throw err
  }
}

/** Probe used by F.2 honesty — confirms durable root is writable. */
export async function probePlaytimeAuthorityWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getStatsRoot()
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

export function getPlaytimeAuthorityRoot(): string {
  return getStatsRoot()
}
