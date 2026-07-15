/**
 * I.1 — Discovery content moderation durable authority (disk-backed).
 * Listing approval status for discovery eligibility — not I.4 user Report/Block.
 * Layout: `.aethel/hub/discovery-moderation/<gameId>.json`
 * Never invents approved status without deterministic / LLM / manual path.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('discovery-moderation-authority')

export type DiscoveryModerationStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'flagged'
  | 'manual_review'

export type DiscoveryModerationSource = 'deterministic' | 'llm' | 'manual' | 'seed'

export interface DiscoveryModerationRecord {
  gameId: string
  status: DiscoveryModerationStatus
  codes: string[]
  reasons: string[]
  source: DiscoveryModerationSource
  matchedDenyTerms?: string[]
  matchedDenyTags?: string[]
  titleSnapshot?: string
  updatedAt: string
  createdAt: string
}

const MOD_DIR_SEGMENTS = ['.aethel', 'hub', 'discovery-moderation'] as const

function getModerationRoot(): string {
  const base = process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT
    ? path.resolve(process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT)
    : path.resolve(process.cwd(), ...MOD_DIR_SEGMENTS)
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

function recordPath(gameId: string): string {
  return path.join(getModerationRoot(), `${sanitize(gameId)}.json`)
}

const VALID_STATUSES = new Set<DiscoveryModerationStatus>([
  'approved',
  'pending',
  'rejected',
  'flagged',
  'manual_review',
])

async function readRecordFile(file: string): Promise<DiscoveryModerationRecord | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as DiscoveryModerationRecord
    if (!parsed?.gameId || !VALID_STATUSES.has(parsed.status)) return null
    return {
      gameId: parsed.gameId,
      status: parsed.status,
      codes: Array.isArray(parsed.codes) ? parsed.codes.map(String) : [],
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
      source: parsed.source ?? 'deterministic',
      matchedDenyTerms: parsed.matchedDenyTerms,
      matchedDenyTags: parsed.matchedDenyTags,
      titleSnapshot: parsed.titleSnapshot,
      updatedAt: parsed.updatedAt,
      createdAt: parsed.createdAt,
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeRecordFile(file: string, record: DiscoveryModerationRecord): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(record, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

export async function getDiscoveryModeration(
  gameId: string,
): Promise<DiscoveryModerationRecord | null> {
  const id = String(gameId || '').trim()
  if (!id) return null
  return readRecordFile(recordPath(id))
}

export async function getDiscoveryModerationStatuses(
  gameIds: string[],
): Promise<Map<string, DiscoveryModerationStatus>> {
  const out = new Map<string, DiscoveryModerationStatus>()
  await Promise.all(
    gameIds.map(async (gameId) => {
      const record = await getDiscoveryModeration(gameId)
      if (record) out.set(record.gameId, record.status)
    }),
  )
  return out
}

export async function upsertDiscoveryModeration(input: {
  gameId: string
  status: DiscoveryModerationStatus
  codes?: string[]
  reasons?: string[]
  source?: DiscoveryModerationSource
  matchedDenyTerms?: string[]
  matchedDenyTags?: string[]
  titleSnapshot?: string
  nowMs?: number
}): Promise<DiscoveryModerationRecord> {
  const gameId = String(input.gameId || '').trim()
  if (!gameId) {
    throw Object.assign(new Error('DISCOVERY_MODERATION_GAME_REQUIRED'), {
      code: 'DISCOVERY_MODERATION_GAME_REQUIRED',
    })
  }
  if (!VALID_STATUSES.has(input.status)) {
    throw Object.assign(new Error('DISCOVERY_MODERATION_STATUS_INVALID'), {
      code: 'DISCOVERY_MODERATION_STATUS_INVALID',
    })
  }

  const nowIso = new Date(input.nowMs ?? Date.now()).toISOString()
  const file = recordPath(gameId)
  const existing = await readRecordFile(file)
  const record: DiscoveryModerationRecord = {
    gameId,
    status: input.status,
    codes: input.codes ?? existing?.codes ?? [],
    reasons: input.reasons ?? existing?.reasons ?? [],
    source: input.source ?? existing?.source ?? 'deterministic',
    matchedDenyTerms: input.matchedDenyTerms ?? existing?.matchedDenyTerms,
    matchedDenyTags: input.matchedDenyTags ?? existing?.matchedDenyTags,
    titleSnapshot: input.titleSnapshot ?? existing?.titleSnapshot,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  }
  await writeRecordFile(file, record)
  log.info('discovery_moderation_upserted', {
    gameId,
    status: record.status,
    source: record.source,
  })
  return record
}

/** Probe used by I.1 honesty — confirms durable moderation root is writable. */
export async function probeDiscoveryModerationWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getModerationRoot()
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

export function getDiscoveryModerationRoot(): string {
  return getModerationRoot()
}
