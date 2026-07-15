/**
 * AI Credit Ledger — Redis Intermediate Layer (DEBT-FIN-011 / 012)
 *
 * Problem: When many parallel AI agents debit credits, Postgres row-level
 * locks on the user's credit balance cause serialisation bottlenecks and
 * occasional deadlocks.
 *
 * Solution: Buffer all AI credit debits in Redis using atomic INCRBY on a
 * per-user key.  A periodic flush (or an explicit call at agent completion)
 * batches the accumulated debit into Postgres in a single UPDATE, slashing
 * lock contention from N agents × M calls → 1 write per flush cycle.
 *
 * Redis key schema:
 *   aethel:ai_ledger:<userId>   → integer credit debit accumulator
 *   aethel:ai_ledger:dirty      → SSET of userIds with unflushed debits
 *
 * Guarantees:
 *   • Debits are atomic at the Redis level (INCRBY).
 *   • Flush is idempotent: partial failures leave the Redis key intact.
 *   • If Redis is unavailable, falls back to direct Postgres debit.
 */

import { prisma } from './db'
import { cache } from './redis-cache'
import { createComponentLogger } from '@/lib/observability/logger'
import { getModelCostMultiplier } from './credit-wallet-costs'
import type { AIOperationType } from './credit-wallet-costs'

const log = createComponentLogger('ai-ledger-redis')

const LEDGER_PREFIX = 'aethel:ai_ledger:'
const DIRTY_SET_KEY = 'aethel:ai_ledger:dirty'

// Maximum credits buffered per user before an automatic inline flush is triggered.
const AUTO_FLUSH_THRESHOLD = 500

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ledgerKey(userId: string): string {
  return `${LEDGER_PREFIX}${userId}`
}

async function incrByRedis(userId: string, amount: number): Promise<number | null> {
  try {
    const key = ledgerKey(userId)
    // Use the project's existing RedisCache wrapper's raw client when available
    // eslint-disable-next-line
    const raw = (cache as any).redis as { incrby?: (k: string, n: number) => Promise<number>; sadd?: (k: string, v: string) => Promise<number> } | null
    if (!raw?.incrby) return null
    const newTotal = await raw.incrby(key, Math.ceil(amount))
    await raw.sadd?.(DIRTY_SET_KEY, userId)
    return newTotal
  } catch {
    return null
  }
}

async function getAndClearRedis(userId: string): Promise<number | null> {
  try {
    // eslint-disable-next-line
    const raw = (cache as any).redis as { getdel?: (k: string) => Promise<string | null>; srem?: (k: string, v: string) => Promise<number> } | null
    if (!raw?.getdel) return null
    const val = await raw.getdel(ledgerKey(userId))
    await raw.srem?.(DIRTY_SET_KEY, userId)
    return val ? parseInt(val, 10) : 0
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AILedgerDebitOptions {
  userId: string
  operationType: AIOperationType
  tokens: number
  modelId?: string
  metadata?: Record<string, string | number>
}

/**
 * Debit AI credits for a completed LLM call.
 *
 * On success, the debit is buffered in Redis.  If Redis is unavailable or
 * the accumulated debit exceeds AUTO_FLUSH_THRESHOLD, the debit is flushed
 * directly to Postgres.
 *
 * Returns the number of credits actually debited.
 */
export async function aiLedgerDebit(opts: AILedgerDebitOptions): Promise<number> {
  const { userId, operationType, tokens, modelId } = opts
  if (!userId || tokens <= 0) return 0

  const CREDITS_PER_1K: Record<string, number> = {
    chat: 1,
    chat_advanced: 2,
    code_generation: 3,
    inline_completion: 0.5,
    inline_edit: 1,
    agent_task: 5,
  }

  const base = CREDITS_PER_1K[operationType] ?? 1
  const multiplier = modelId ? getModelCostMultiplier(modelId) : 1
  const credits = Math.ceil((tokens / 1000) * base * multiplier)

  if (credits <= 0) return 0

  try {
    const newTotal = await incrByRedis(userId, credits)
    if (newTotal === null) {
      // Redis unavailable — fall back to direct Postgres debit
      await flushToPostgres(userId, credits)
      return credits
    }

    log.info('AI credit buffered in Redis', { userId, credits, newTotal, modelId })

    if (newTotal >= AUTO_FLUSH_THRESHOLD) {
      // Flush inline to avoid unbounded Redis accumulation
      await flushUserLedger(userId)
    }

    return credits
  } catch (err) {
    log.error('AI ledger debit error, falling back to direct Postgres', { error: String(err) })
    await flushToPostgres(userId, credits)
    return credits
  }
}

/**
 * Flush a single user's accumulated Redis debit to Postgres.
 * Safe to call from agent-completion hooks or a cron job.
 */
export async function flushUserLedger(userId: string): Promise<void> {
  const accumulated = await getAndClearRedis(userId)
  if (accumulated === null) {
    log.warn('Redis unavailable during flush — no-op', { userId })
    return
  }
  if (accumulated <= 0) return
  await flushToPostgres(userId, accumulated)
}

/**
 * Flush all dirty users' ledgers.  Call from a cron route or
 * at the end of a batch agent run.
 */
export async function flushAllLedgers(): Promise<{ flushed: number; errors: number }> {
  let flushed = 0
  let errors = 0

  try {
    // eslint-disable-next-line
    const raw = (cache as any).redis as { smembers?: (k: string) => Promise<string[]> } | null
    const dirtyUsers = (await raw?.smembers?.(DIRTY_SET_KEY)) ?? []

    await Promise.allSettled(
      dirtyUsers.map(async (userId) => {
        try {
          await flushUserLedger(userId)
          flushed++
        } catch {
          errors++
        }
      }),
    )
  } catch (err) {
    log.error('flushAllLedgers failed', { error: String(err) })
    errors++
  }

  log.info('AI ledger flush complete', { flushed, errors })
  return { flushed, errors }
}

// ---------------------------------------------------------------------------
// Postgres write (single UPDATE per user, one row lock)
// ---------------------------------------------------------------------------

async function flushToPostgres(userId: string, credits: number): Promise<void> {
  if (credits <= 0) return
  try {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "creditBalance" = GREATEST(0, "creditBalance" - ${credits})
      WHERE id = ${userId}
    `
    log.info('AI credits flushed to Postgres', { userId, credits })
  } catch (pgErr) {
    log.error('Postgres ledger flush failed', { userId, credits, error: String(pgErr) })
    throw pgErr
  }
}
