/**
 * Block 6G.1 / DEBT-FIN-011 — Redis metering buffer for UsageBucket.
 *
 * Hot path: atomic INCRBY in Redis (no Postgres row locks).
 * Flush: batch upsert into UsageBucket (one write per user×window).
 * Redis unavailable → caller falls back to direct Postgres upserts.
 *
 * Supersedes parallel orphans:
 *   - lib/billing/redis-billing-accumulator.ts (stream — do not wire)
 *   - lib/billing/billing-sync-worker.ts (stream consumer — do not wire)
 * Credit-ledger buffering remains lib/ai-ledger-redis.ts (different concern).
 */

import { cache } from '@/lib/redis-cache'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('metering-redis-buffer')

const PREFIX = 'meter:v1'
const WINDOW_TTL_SECONDS = 72 * 60 * 60
/** Auto-flush a user when pending weighted tokens exceed this. */
export const METER_AUTO_FLUSH_TOKENS = 50_000

export type MeterWindowId = 'hour' | 'day' | string

export type MeterBufferDelta = {
  userId: string
  window: MeterWindowId
  windowStart: Date
  windowEnd: Date
  requests: number
  tokens: number
}

function reqKey(d: Pick<MeterBufferDelta, 'userId' | 'window' | 'windowStart'>): string {
  return `${PREFIX}:${d.userId}:${d.window}:${d.windowStart.getTime()}:req`
}

function tokKey(d: Pick<MeterBufferDelta, 'userId' | 'window' | 'windowStart'>): string {
  return `${PREFIX}:${d.userId}:${d.window}:${d.windowStart.getTime()}:tok`
}

function windowsKey(userId: string): string {
  return `${PREFIX}:windows:${userId}`
}

function dirtyKey(userId: string): string {
  return `${PREFIX}:dirty:${userId}`
}

type WindowMeta = {
  window: string
  windowStart: string
  windowEnd: string
}

async function rememberWindow(delta: MeterBufferDelta): Promise<void> {
  const key = windowsKey(delta.userId)
  const existing = (await cache.get<WindowMeta[]>(key)) ?? []
  const startIso = delta.windowStart.toISOString()
  const id = `${delta.window}:${startIso}`
  if (!existing.some((w) => `${w.window}:${w.windowStart}` === id)) {
    existing.push({
      window: String(delta.window),
      windowStart: startIso,
      windowEnd: delta.windowEnd.toISOString(),
    })
    await cache.set(key, existing, { ttl: WINDOW_TTL_SECONDS })
  }
  await cache.increment(dirtyKey(delta.userId), 1)
  await cache.expire(dirtyKey(delta.userId), WINDOW_TTL_SECONDS)
}

/**
 * Returns false when Redis/memory path cannot buffer (caller must use Postgres).
 * On success, returns post-increment pending totals for this window.
 */
export async function bufferMeterDelta(
  delta: MeterBufferDelta,
): Promise<{ ok: true; pendingRequests: number; pendingTokens: number } | { ok: false }> {
  const requests = Math.max(0, Math.floor(delta.requests))
  const tokens = Math.max(0, Math.floor(delta.tokens))
  if (requests === 0 && tokens === 0) {
    return { ok: true, pendingRequests: 0, pendingTokens: 0 }
  }

  try {
    const pendingRequests =
      requests > 0 ? await cache.increment(reqKey(delta), requests) : await getPendingField(reqKey(delta))
    const pendingTokens =
      tokens > 0 ? await cache.increment(tokKey(delta), tokens) : await getPendingField(tokKey(delta))

    // increment() returns 0 on hard failure — treat as unavailable when we expected growth
    if (requests > 0 && pendingRequests < requests) {
      return { ok: false }
    }
    if (tokens > 0 && pendingTokens < tokens) {
      return { ok: false }
    }

    await Promise.all([
      cache.expire(reqKey(delta), WINDOW_TTL_SECONDS),
      cache.expire(tokKey(delta), WINDOW_TTL_SECONDS),
      rememberWindow(delta),
    ])

    return {
      ok: true,
      pendingRequests: Math.max(0, pendingRequests),
      pendingTokens: Math.max(0, pendingTokens),
    }
  } catch (error) {
    log.warn('meter_buffer.failed_fallback_postgres', { error })
    return { ok: false }
  }
}

async function getPendingField(key: string): Promise<number> {
  // incrby 0 reads the integer counter without changing it (keys are raw ints, not JSON).
  try {
    const value = await cache.increment(key, 0)
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  } catch {
    return 0
  }
}

export async function getPendingMeterWindow(params: {
  userId: string
  window: MeterWindowId
  windowStart: Date
}): Promise<{ requests: number; tokens: number }> {
  const [requests, tokens] = await Promise.all([
    getPendingField(reqKey(params)),
    getPendingField(tokKey(params)),
  ])
  return { requests, tokens }
}

/**
 * Roll back a just-buffered delta after a limit rejection (best-effort).
 */
export async function rollbackMeterDelta(delta: MeterBufferDelta): Promise<void> {
  const requests = Math.max(0, Math.floor(delta.requests))
  const tokens = Math.max(0, Math.floor(delta.tokens))
  try {
    if (requests > 0) await cache.increment(reqKey(delta), -requests)
    if (tokens > 0) await cache.increment(tokKey(delta), -tokens)
  } catch (error) {
    log.warn('meter_buffer.rollback_failed', { userId: delta.userId, error })
  }
}

async function clearPendingWindow(params: {
  userId: string
  window: string
  windowStart: Date
}): Promise<{ requests: number; tokens: number }> {
  const rKey = reqKey(params)
  const tKey = tokKey(params)
  const [requests, tokens] = await Promise.all([getPendingField(rKey), getPendingField(tKey)])
  await Promise.all([cache.delete(rKey), cache.delete(tKey)])
  return { requests, tokens }
}

/**
 * Flush one user's buffered windows into UsageBucket. Idempotent under retries
 * if Redis clear happens after successful upsert (deltas already applied).
 */
export async function flushMeteringBufferForUser(userId: string): Promise<number> {
  if (!userId) return 0
  const metas = (await cache.get<WindowMeta[]>(windowsKey(userId))) ?? []
  if (metas.length === 0) {
    await cache.delete(dirtyKey(userId))
    return 0
  }

  let flushed = 0
  const remaining: WindowMeta[] = []

  for (const meta of metas) {
    const windowStart = new Date(meta.windowStart)
    const windowEnd = new Date(meta.windowEnd)
    const pending = await clearPendingWindow({
      userId,
      window: meta.window,
      windowStart,
    })

    if (pending.requests <= 0 && pending.tokens <= 0) {
      continue
    }

    await prisma.usageBucket.upsert({
      where: {
        userId_window_windowStart: {
          userId,
          window: meta.window,
          windowStart,
        },
      },
      create: {
        userId,
        window: meta.window,
        windowStart,
        windowEnd,
        requests: pending.requests,
        tokens: pending.tokens,
      },
      update: {
        ...(pending.requests > 0 ? { requests: { increment: pending.requests } } : {}),
        ...(pending.tokens > 0 ? { tokens: { increment: pending.tokens } } : {}),
      },
    })
    flushed += 1
  }

  await cache.set(windowsKey(userId), remaining, { ttl: WINDOW_TTL_SECONDS })
  await cache.delete(dirtyKey(userId))
  return flushed
}

export async function maybeAutoFlushUser(userId: string, pendingTokens: number): Promise<void> {
  if (pendingTokens < METER_AUTO_FLUSH_TOKENS) return
  try {
    await flushMeteringBufferForUser(userId)
  } catch (error) {
    log.warn('meter_buffer.auto_flush_failed', { userId, error })
  }
}

/**
 * Read Postgres bucket + Redis pending (non-locking) for limit projection.
 */
export async function readProjectedMeterWindow(params: {
  userId: string
  window: MeterWindowId
  windowStart: Date
}): Promise<{ requests: number; tokens: number; windowEnd: Date | null }> {
  const [row, pending] = await Promise.all([
    prisma.usageBucket.findUnique({
      where: {
        userId_window_windowStart: {
          userId: params.userId,
          window: String(params.window),
          windowStart: params.windowStart,
        },
      },
      select: { requests: true, tokens: true, windowEnd: true },
    }),
    getPendingMeterWindow(params),
  ])

  return {
    requests: (row?.requests ?? 0) + pending.requests,
    tokens: (row?.tokens ?? 0) + pending.tokens,
    windowEnd: row?.windowEnd ?? null,
  }
}
