/**
 * I.2 deepen — Helpful-vote durable authority (disk-backed).
 * One vote per user per review. Ranking weight from voter playtime tier.
 * Never invents fake vote counts.
 * Layout: `.aethel/hub/review-votes/<gameId>/<reviewId>/<voterId>.json`
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('helpful-vote-authority')

export interface HelpfulVoteRecord {
  id: string
  gameId: string
  reviewId: string
  voterId: string
  /** Integer tier weight derived from voter verified playtime — not a fake multiplier. */
  weight: number
  voterPlaytimeSeconds: number
  createdAt: string
  updatedAt: string
}

export interface HelpfulVoteAggregate {
  reviewId: string
  gameId: string
  /** Distinct voters — never invented. */
  count: number
  /** Sum of tier weights for ranking. */
  weight: number
  votes: HelpfulVoteRecord[]
}

const VOTES_DIR_SEGMENTS = ['.aethel', 'hub', 'review-votes'] as const

function getVotesRoot(): string {
  const base = process.env.AETHEL_HUB_REVIEW_VOTES_ROOT
    ? path.resolve(process.env.AETHEL_HUB_REVIEW_VOTES_ROOT)
    : path.resolve(process.cwd(), ...VOTES_DIR_SEGMENTS)
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

function votePath(gameId: string, reviewId: string, voterId: string): string {
  return path.join(
    getVotesRoot(),
    sanitize(gameId),
    sanitize(reviewId),
    `${sanitize(voterId)}.json`,
  )
}

function reviewVotesDir(gameId: string, reviewId: string): string {
  return path.join(getVotesRoot(), sanitize(gameId), sanitize(reviewId))
}

function newVoteId(): string {
  return `rv_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
}

/**
 * XIV.2 — helpful votes weighted by voter playtime tier.
 * Tiers are honest floors from F.2 seconds — no invented prestige.
 */
export function helpfulVoteWeightFromPlaytime(playtimeSeconds: number): number {
  const s = Math.max(0, Math.floor(Number(playtimeSeconds) || 0))
  if (s >= 36_000) return 4 // 10h+
  if (s >= 7_200) return 3 // 2h+
  if (s >= 1_800) return 2 // 30m+
  return 1
}

async function readVoteFile(file: string): Promise<HelpfulVoteRecord | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as HelpfulVoteRecord
    if (!parsed || !parsed.reviewId || !parsed.voterId || !parsed.gameId) return null
    return parsed
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeVoteFile(file: string, vote: HelpfulVoteRecord): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(vote, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

export async function getHelpfulVote(
  gameId: string,
  reviewId: string,
  voterId: string,
): Promise<HelpfulVoteRecord | null> {
  return readVoteFile(votePath(gameId, reviewId, voterId))
}

export async function listHelpfulVotesForReview(
  gameId: string,
  reviewId: string,
): Promise<HelpfulVoteRecord[]> {
  const dir = reviewVotesDir(gameId, reviewId)
  try {
    const files = await fs.readdir(dir)
    const out: HelpfulVoteRecord[] = []
    for (const name of files) {
      if (!name.endsWith('.json')) continue
      const row = await readVoteFile(path.join(dir, name))
      if (row) out.push(row)
    }
    return out
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return []
    throw err
  }
}

export async function aggregateHelpfulVotes(
  gameId: string,
  reviewId: string,
): Promise<HelpfulVoteAggregate> {
  const votes = await listHelpfulVotesForReview(gameId, reviewId)
  return {
    reviewId,
    gameId,
    count: votes.length,
    weight: votes.reduce((acc, v) => acc + (Number(v.weight) || 0), 0),
    votes,
  }
}

export type CastHelpfulVoteInput = {
  gameId: string
  reviewId: string
  voterId: string
  voterPlaytimeSeconds: number
}

/**
 * Upsert one vote per (reviewId, voterId). Re-cast refreshes weight from current playtime.
 */
export async function castHelpfulVote(input: CastHelpfulVoteInput): Promise<HelpfulVoteRecord> {
  const gameId = String(input.gameId || '').trim()
  const reviewId = String(input.reviewId || '').trim()
  const voterId = String(input.voterId || '').trim()
  if (!gameId || !reviewId || !voterId) {
    throw Object.assign(new Error('HELPFUL_VOTE_IDENTITY_REQUIRED'), {
      code: 'HELPFUL_VOTE_IDENTITY_REQUIRED',
    })
  }

  const voterPlaytimeSeconds = Math.max(0, Math.floor(Number(input.voterPlaytimeSeconds) || 0))
  const weight = helpfulVoteWeightFromPlaytime(voterPlaytimeSeconds)
  const file = votePath(gameId, reviewId, voterId)
  const existing = await readVoteFile(file)
  const now = new Date().toISOString()
  const next: HelpfulVoteRecord = {
    id: existing?.id ?? newVoteId(),
    gameId,
    reviewId,
    voterId,
    weight,
    voterPlaytimeSeconds,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await writeVoteFile(file, next)
  log.info('helpful_vote_cast', { gameId, reviewId, voterId, weight, created: !existing })
  return next
}

export async function removeHelpfulVote(
  gameId: string,
  reviewId: string,
  voterId: string,
): Promise<boolean> {
  const file = votePath(gameId, reviewId, voterId)
  try {
    await fs.unlink(file)
    log.info('helpful_vote_removed', { gameId, reviewId, voterId })
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return false
    throw err
  }
}

export async function probeHelpfulVotesWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getVotesRoot()
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

export function getHelpfulVotesRoot(): string {
  return getVotesRoot()
}
