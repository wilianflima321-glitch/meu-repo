/**
 * I.2 — GameReview durable authority (disk-backed).
 * Honest Hub path mirrors F.2 PlayerGameStats — not localStorage, not fake ratings.
 * Layout: `.aethel/hub/reviews/<gameId>/<userId>.json` · unique (userId, gameId).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('game-review-authority')

export const REVIEW_RATING_MIN = 1
export const REVIEW_RATING_MAX = 5
export const REVIEW_BODY_MAX = 4000

export interface GameReview {
  id: string
  userId: string
  gameId: string
  rating: number
  body: string
  /** Verified playtime seconds at post time (from F.2 PlayerGameStats). */
  verifiedPlaytimeSeconds: number
  /** ISO timestamp when review was accepted with playtime evidence. */
  verifiedPlaytimeAt: string
  isEarlyAccess: boolean
  createdAt: string
  updatedAt: string
}

const REVIEWS_DIR_SEGMENTS = ['.aethel', 'hub', 'reviews'] as const

function getReviewsRoot(): string {
  const base = process.env.AETHEL_HUB_REVIEWS_ROOT
    ? path.resolve(process.env.AETHEL_HUB_REVIEWS_ROOT)
    : path.resolve(process.cwd(), ...REVIEWS_DIR_SEGMENTS)
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

function reviewPath(gameId: string, userId: string): string {
  return path.join(getReviewsRoot(), sanitize(gameId), `${sanitize(userId)}.json`)
}

function newReviewId(): string {
  return `gr_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
}

async function readReviewFile(file: string): Promise<GameReview | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as GameReview
    if (!parsed || typeof parsed.rating !== 'number' || !parsed.userId || !parsed.gameId) {
      return null
    }
    return {
      ...parsed,
      isEarlyAccess: parsed.isEarlyAccess === true,
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeReviewFile(file: string, review: GameReview): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(review, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

export function validateReviewRating(rating: unknown): number | null {
  const n = Math.floor(Number(rating))
  if (!Number.isFinite(n) || n < REVIEW_RATING_MIN || n > REVIEW_RATING_MAX) return null
  return n
}

export function normalizeReviewBody(body: unknown): string {
  return String(body ?? '')
    .trim()
    .slice(0, REVIEW_BODY_MAX)
}

export async function getGameReview(
  gameId: string,
  userId: string,
): Promise<GameReview | null> {
  return readReviewFile(reviewPath(gameId, userId))
}

export async function listGameReviews(gameId: string): Promise<GameReview[]> {
  const dir = path.join(getReviewsRoot(), sanitize(gameId))
  try {
    const files = await fs.readdir(dir)
    const out: GameReview[] = []
    for (const name of files) {
      if (!name.endsWith('.json')) continue
      const row = await readReviewFile(path.join(dir, name))
      if (row) out.push(row)
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return []
    throw err
  }
}

/** Resolve review by durable id within a game — used by helpful-vote cast. */
export async function getGameReviewById(
  gameId: string,
  reviewId: string,
): Promise<GameReview | null> {
  const id = String(reviewId || '').trim()
  if (!id) return null
  const rows = await listGameReviews(gameId)
  return rows.find((r) => r.id === id) ?? null
}

export type UpsertGameReviewInput = {
  userId: string
  gameId: string
  rating: number
  body?: string
  verifiedPlaytimeSeconds: number
  isEarlyAccess?: boolean
}

/**
 * Create or replace the single review for (userId, gameId).
 * Caller must already pass evaluateVerifiedReviewGate.
 */
export async function upsertGameReview(input: UpsertGameReviewInput): Promise<GameReview> {
  const userId = String(input.userId || '').trim()
  const gameId = String(input.gameId || '').trim()
  const rating = validateReviewRating(input.rating)
  if (!userId || !gameId) {
    throw Object.assign(new Error('REVIEW_IDENTITY_REQUIRED'), {
      code: 'REVIEW_IDENTITY_REQUIRED',
    })
  }
  if (rating === null) {
    throw Object.assign(new Error('REVIEW_RATING_INVALID'), {
      code: 'REVIEW_RATING_INVALID',
    })
  }
  const verifiedPlaytimeSeconds = Math.floor(Number(input.verifiedPlaytimeSeconds))
  if (!Number.isFinite(verifiedPlaytimeSeconds) || verifiedPlaytimeSeconds < 0) {
    throw Object.assign(new Error('REVIEW_PLAYTIME_INVALID'), {
      code: 'REVIEW_PLAYTIME_INVALID',
    })
  }

  const file = reviewPath(gameId, userId)
  const existing = await readReviewFile(file)
  const now = new Date().toISOString()
  const body = normalizeReviewBody(input.body)
  const next: GameReview = {
    id: existing?.id ?? newReviewId(),
    userId,
    gameId,
    rating,
    body,
    verifiedPlaytimeSeconds,
    verifiedPlaytimeAt: now,
    isEarlyAccess: input.isEarlyAccess === true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await writeReviewFile(file, next)
  log.info('game_review_upserted', {
    userId,
    gameId,
    rating,
    verifiedPlaytimeSeconds,
    isEarlyAccess: next.isEarlyAccess,
    created: !existing,
  })
  return next
}

export function summarizeReviews(reviews: GameReview[]): {
  count: number
  averageRating: number | null
} {
  if (!reviews.length) return { count: 0, averageRating: null }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return {
    count: reviews.length,
    averageRating: Math.round((sum / reviews.length) * 10) / 10,
  }
}

/** Probe used by F.2 / Hub honesty — confirms durable reviews root is writable. */
export async function probeReviewsStoreWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getReviewsRoot()
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

export function getReviewsStoreRoot(): string {
  return getReviewsRoot()
}
