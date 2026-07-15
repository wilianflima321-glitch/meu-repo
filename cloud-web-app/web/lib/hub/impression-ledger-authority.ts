/**
 * I.1 — Discovery launch impression ledger (disk-backed).
 * Lane A 2k CAC budget: unique served impressions within 30d window.
 * Anti-bot: session/viewer key dedupe + daily cap. Never invents fake counts.
 * Layout: `.aethel/hub/impressions/<gameId>.json`
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('impression-ledger-authority')

/** Lane A platform CAC — unique served impressions per title (Law XIV.1 / Decision #71). */
export const IMPRESSION_LEDGER_BUDGET = 2000

/** Rolling window for launch guarantee ledger (matches discovery launch window). */
export const IMPRESSION_LEDGER_WINDOW_DAYS = 30

/** Anti-burn daily cap — prevents emptying 2k in one bot flood day. */
export const DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP = 200

export interface ImpressionServeEvent {
  viewerKey: string
  at: string
}

export interface ImpressionLedgerRecord {
  gameId: string
  budget: number
  windowDays: number
  dailyCap: number
  events: ImpressionServeEvent[]
  updatedAt: string
}

export interface ImpressionBudgetSnapshot {
  gameId: string
  impressionsLogged: number
  remaining: number
  budget: number
  windowDays: number
  dailyServed: number
  dailyCap: number
  dailyRemaining: number
  exhausted: boolean
}

export type RecordImpressionResult =
  | {
      counted: true
      snapshot: ImpressionBudgetSnapshot
      code: 'COUNTED'
    }
  | {
      counted: false
      snapshot: ImpressionBudgetSnapshot
      code: 'DEDUPED' | 'BUDGET_EXHAUSTED' | 'DAILY_CAP' | 'VIEWER_KEY_REQUIRED'
      reason: string
    }

const IMPRESSIONS_DIR_SEGMENTS = ['.aethel', 'hub', 'impressions'] as const

function getImpressionsRoot(): string {
  const base = process.env.AETHEL_HUB_IMPRESSIONS_ROOT
    ? path.resolve(process.env.AETHEL_HUB_IMPRESSIONS_ROOT)
    : path.resolve(process.cwd(), ...IMPRESSIONS_DIR_SEGMENTS)
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

function ledgerPath(gameId: string): string {
  return path.join(getImpressionsRoot(), `${sanitize(gameId)}.json`)
}

function dayKey(isoOrMs: string | number): string {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs)
  if (Number.isNaN(d.getTime())) return 'invalid'
  return d.toISOString().slice(0, 10)
}

function createEmptyLedger(gameId: string): ImpressionLedgerRecord {
  return {
    gameId,
    budget: IMPRESSION_LEDGER_BUDGET,
    windowDays: IMPRESSION_LEDGER_WINDOW_DAYS,
    dailyCap: DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP,
    events: [],
    updatedAt: new Date().toISOString(),
  }
}

async function readLedgerFile(file: string): Promise<ImpressionLedgerRecord | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as ImpressionLedgerRecord
    if (!parsed || !parsed.gameId || !Array.isArray(parsed.events)) return null
    return {
      ...createEmptyLedger(parsed.gameId),
      ...parsed,
      events: parsed.events.filter(
        (e) => e && typeof e.viewerKey === 'string' && typeof e.at === 'string',
      ),
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeLedgerFile(file: string, record: ImpressionLedgerRecord): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(record, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

/**
 * Keep only events inside the rolling window; unique by viewerKey (latest kept).
 */
export function pruneImpressionEvents(
  events: ImpressionServeEvent[],
  options: { nowMs?: number; windowDays?: number } = {},
): ImpressionServeEvent[] {
  const nowMs = options.nowMs ?? Date.now()
  const windowDays = options.windowDays ?? IMPRESSION_LEDGER_WINDOW_DAYS
  const cutoff = nowMs - windowDays * 24 * 60 * 60 * 1000
  const byKey = new Map<string, ImpressionServeEvent>()
  for (const event of events) {
    const t = Date.parse(event.at)
    if (!Number.isFinite(t) || t < cutoff) continue
    const key = String(event.viewerKey || '').trim()
    if (!key) continue
    const prev = byKey.get(key)
    if (!prev || Date.parse(prev.at) < t) {
      byKey.set(key, { viewerKey: key, at: new Date(t).toISOString() })
    }
  }
  return [...byKey.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

export function snapshotFromLedger(
  record: ImpressionLedgerRecord,
  options: { nowMs?: number } = {},
): ImpressionBudgetSnapshot {
  const nowMs = options.nowMs ?? Date.now()
  const windowDays = record.windowDays ?? IMPRESSION_LEDGER_WINDOW_DAYS
  const budget = record.budget ?? IMPRESSION_LEDGER_BUDGET
  const dailyCap = record.dailyCap ?? DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP
  const pruned = pruneImpressionEvents(record.events, { nowMs, windowDays })
  const today = dayKey(nowMs)
  const dailyServed = pruned.filter((e) => dayKey(e.at) === today).length
  const impressionsLogged = pruned.length
  const remaining = Math.max(0, budget - impressionsLogged)
  return {
    gameId: record.gameId,
    impressionsLogged,
    remaining,
    budget,
    windowDays,
    dailyServed,
    dailyCap,
    dailyRemaining: Math.max(0, dailyCap - dailyServed),
    exhausted: remaining <= 0,
  }
}

export async function getImpressionBudget(
  gameId: string,
  options: { nowMs?: number } = {},
): Promise<ImpressionBudgetSnapshot> {
  const id = String(gameId || '').trim()
  if (!id) {
    return {
      gameId: '',
      impressionsLogged: 0,
      remaining: IMPRESSION_LEDGER_BUDGET,
      budget: IMPRESSION_LEDGER_BUDGET,
      windowDays: IMPRESSION_LEDGER_WINDOW_DAYS,
      dailyServed: 0,
      dailyCap: DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP,
      dailyRemaining: DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP,
      exhausted: false,
    }
  }
  const existing = (await readLedgerFile(ledgerPath(id))) ?? createEmptyLedger(id)
  return snapshotFromLedger(existing, options)
}

export async function getImpressionBudgets(
  gameIds: string[],
  options: { nowMs?: number } = {},
): Promise<Map<string, ImpressionBudgetSnapshot>> {
  const out = new Map<string, ImpressionBudgetSnapshot>()
  await Promise.all(
    gameIds.map(async (gameId) => {
      const snap = await getImpressionBudget(gameId, options)
      if (snap.gameId) out.set(snap.gameId, snap)
    }),
  )
  return out
}

/**
 * Record one served launch impression for a unique viewer key.
 * Idempotent per (gameId, viewerKey) within the 30d window.
 */
export async function recordServedImpression(input: {
  gameId: string
  viewerKey: string
  nowMs?: number
  servedAt?: string
}): Promise<RecordImpressionResult> {
  const gameId = String(input.gameId || '').trim()
  const viewerKey = String(input.viewerKey || '').trim()
  const nowMs = input.nowMs ?? Date.now()
  const servedAt = input.servedAt ?? new Date(nowMs).toISOString()

  if (!gameId) {
    throw Object.assign(new Error('IMPRESSION_GAME_REQUIRED'), {
      code: 'IMPRESSION_GAME_REQUIRED',
    })
  }

  const file = ledgerPath(gameId)
  const existing = (await readLedgerFile(file)) ?? createEmptyLedger(gameId)
  const pruned = pruneImpressionEvents(existing.events, {
    nowMs,
    windowDays: existing.windowDays,
  })
  const working: ImpressionLedgerRecord = {
    ...existing,
    events: pruned,
  }
  const before = snapshotFromLedger(working, { nowMs })

  if (!viewerKey) {
    return {
      counted: false,
      snapshot: before,
      code: 'VIEWER_KEY_REQUIRED',
      reason: 'session/viewer key required to count a served impression',
    }
  }

  if (pruned.some((e) => e.viewerKey === viewerKey)) {
    return {
      counted: false,
      snapshot: before,
      code: 'DEDUPED',
      reason: 'viewer already counted within 30d window',
    }
  }

  if (before.exhausted) {
    return {
      counted: false,
      snapshot: before,
      code: 'BUDGET_EXHAUSTED',
      reason: `launch impression budget exhausted (${before.budget}/${before.windowDays}d)`,
    }
  }

  if (before.dailyRemaining <= 0) {
    return {
      counted: false,
      snapshot: before,
      code: 'DAILY_CAP',
      reason: `daily impression cap ${before.dailyCap} reached`,
    }
  }

  working.events = [...pruned, { viewerKey, at: servedAt }]
  working.updatedAt = new Date(nowMs).toISOString()
  await writeLedgerFile(file, working)
  const snapshot = snapshotFromLedger(working, { nowMs })
  log.info('impression_recorded', {
    gameId,
    impressionsLogged: snapshot.impressionsLogged,
    remaining: snapshot.remaining,
  })
  return { counted: true, snapshot, code: 'COUNTED' }
}

/**
 * Record launch-lane serves for a feed response (honest CAC).
 * Skips silently when viewerKey missing — does not invent keys.
 */
export async function recordFeedLaunchImpressions(input: {
  gameIds: string[]
  viewerKey?: string | null
  nowMs?: number
}): Promise<{
  attempted: number
  counted: number
  results: Array<{ gameId: string; code: string }>
}> {
  const viewerKey = String(input.viewerKey || '').trim()
  const results: Array<{ gameId: string; code: string }> = []
  let counted = 0
  for (const gameId of input.gameIds) {
    const result = await recordServedImpression({
      gameId,
      viewerKey,
      nowMs: input.nowMs,
    })
    results.push({ gameId, code: result.code })
    if (result.counted) counted += 1
  }
  return { attempted: input.gameIds.length, counted, results }
}

/** Probe used by I.1 honesty — confirms durable impressions root is writable. */
export async function probeImpressionLedgerWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getImpressionsRoot()
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

export function getImpressionLedgerRoot(): string {
  return getImpressionsRoot()
}

export function evaluateLaunchImpressionBudgetGate(input: {
  remaining?: number | null
  impressionLedgerReady?: boolean
} = {}): { allowed: boolean; code?: string; reason: string } {
  if (input.impressionLedgerReady !== true) {
    return {
      allowed: false,
      code: 'IMPRESSION_LEDGER_HELD',
      reason: '2k impression ledger [HELD] — launch budget gate inactive',
    }
  }
  const remaining = input.remaining ?? 0
  if (remaining <= 0) {
    return {
      allowed: false,
      code: 'BUDGET_EXHAUSTED',
      reason: 'Launch impression budget exhausted — no Lane A guarantee remaining',
    }
  }
  return { allowed: true, reason: 'launch_budget_remaining' }
}
