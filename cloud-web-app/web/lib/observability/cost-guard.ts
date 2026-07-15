/**
 * AI Spend Guard — Redis-backed per-user and global spend caps.
 *
 * Architecture:
 *  - Per-user daily budget: tracked via lib/redis-cache.ts (real @upstash/redis-
 *    compatible ioredis client when configured, transparent in-memory fallback
 *    otherwise — see lib/redis-cache.ts#RedisCache.connect).
 *  - Global daily cap: prevents runaway platform-wide spend.
 *  - Orchestrator rate limiter: fixed-window per-minute request cap.
 *
 * Buckets are keyed by UTC day/minute (e.g. `cost-guard:user:<id>:2026-07-03`)
 * so windows reset naturally at period boundaries instead of depending on a
 * precise per-key TTL countdown; the TTL set on each key only exists to let
 * Redis garbage-collect old buckets and intentionally outlives the bucket's
 * own period.
 *
 * NOTE ON SCOPE: this module is a coarse, provider-agnostic circuit breaker.
 * The primary per-request AI billing path (reservation/settlement, plan
 * quotas) is `lib/credit-wallet.ts` + `lib/plan-limits.ts` + `lib/metering.ts`,
 * already wired into `app/api/ai/chat/route.ts` and friends. `costGuard` here
 * is NOT currently invoked by any route (verified via full-repo search,
 * 2026-07-03) — it exists as an emergency global/per-user USD cap that product
 * can wire in front of any AI route as a last-resort safety net. Fixing its
 * storage backend to real Redis (this change) makes it correct to adopt in a
 * multi-instance deployment; deciding *where* to call it is a follow-up
 * product/infra decision, not done here to avoid duplicating the existing
 * credit-wallet enforcement path without a considered design.
 *
 * Usage:
 *   import { costGuard } from '@/lib/observability/cost-guard';
 *   const { allowed, reason } = await costGuard.checkBudget(userId, estimatedCostUSD);
 *   if (!allowed) return NextResponse.json({ error: reason }, { status: 429 });
 *   // ... call AI ...
 *   await costGuard.recordSpend(userId, actualCostUSD);
 */

import { cache } from '@/lib/redis-cache';
import { checkDistributedTokenBucket, getUpstashRedisClient } from '@/lib/server/upstash-rate-limit';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('cost-guard');

export interface SpendCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
  /** True when this verdict was produced by the outage failover policy below, not a real budget read. */
  degraded?: boolean;
}

export interface CheckBudgetOptions {
  /**
   * Whether `userId` is on a paying plan. Drives the outage failover policy
   * (Severe Risk Warning — Timeout Defense):
   *  - Free accounts:    Redis outage → FAIL-CLOSED (block the request). A
   *    free user losing one AI call during a Redis blip is an acceptable
   *    cost; an unmetered free-tier request during an outage is not — it is
   *    exactly the runaway-spend scenario this guard exists to prevent.
   *  - Premium accounts: Redis outage → FAIL-OPEN (allow the request). A
   *    paying customer's workflow must never be blocked by an internal
   *    infra blip; the financial exposure of a few unmetered requests from
   *    known, paying accounts is bounded and acceptable, unlike free tier.
   */
  isPremium?: boolean;
}

/** Thrown by the direct-Upstash budget read/write path on a genuine backend failure (timeout, network error, 5xx). */
class CostGuardBackendError extends Error {
  constructor(cause: unknown) {
    super(`cost-guard Redis backend unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'CostGuardBackendError';
  }
}

export interface CostGuardConfig {
  userDailyLimitUSD: number;
  globalDailyLimitUSD: number;
  orchestratorRPM: number; // requests per minute
}

const DEFAULT_CONFIG: CostGuardConfig = {
  userDailyLimitUSD: 5.0,
  globalDailyLimitUSD: 500.0,
  orchestratorRPM: 30,
};

/** Spend is stored as integer micro-USD so Redis INCRBY stays atomic (no float drift). */
const MICROS_PER_USD = 1_000_000;
/** Outlives a UTC-day bucket so it survives clock skew between app instances. */
const DAILY_KEY_TTL_SECONDS = 2 * 24 * 60 * 60;

function utcDayBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function nextUtcMidnight(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

/**
 * Reads a budget counter with real failure propagation when Upstash is
 * configured (direct REST call, no silent-null fallback), so `checkBudget`
 * can apply its explicit fail-open/fail-closed policy instead of
 * `lib/redis-cache.ts`'s generic "return null on error" behavior — which
 * would otherwise make every outage look like "$0 spent so far" and
 * silently fail OPEN for every tier, defeating the guard during an outage.
 *
 * When Upstash isn't configured at all (local dev, self-hosted without
 * Redis), falls back to the shared `cache` — there is no "outage" to detect
 * in that mode, it's simply running on the in-memory store by design.
 */
async function readMicros(key: string): Promise<number> {
  const redis = getUpstashRedisClient();
  if (!redis) {
    const value = await cache.get<number>(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  try {
    const value = await redis.get<number>(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  } catch (error) {
    throw new CostGuardBackendError(error);
  }
}

async function incrementWithExpiry(key: string, amount: number, ttlSeconds: number): Promise<number> {
  const redis = getUpstashRedisClient();
  if (!redis) {
    const total = await cache.increment(key, amount);
    // Fire-and-forget: EXPIRE failing (e.g. memory fallback returns false) must
    // never block the caller — the bucket key itself already rotates by name.
    void cache.expire(key, ttlSeconds);
    return total;
  }

  try {
    const total = await redis.incrby(key, amount);
    void redis.expire(key, ttlSeconds).catch(() => undefined);
    return total;
  } catch (error) {
    throw new CostGuardBackendError(error);
  }
}

class CostGuard {
  private config: CostGuardConfig;

  constructor(config: Partial<CostGuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a spend is within budget before making the AI call.
   *
   * `options.isPremium` controls what happens if the Redis backend itself is
   * unreachable (timeout/outage) — see `CheckBudgetOptions` and
   * `CostGuardBackendError` above for the fail-open/fail-closed rationale.
   */
  async checkBudget(userId: string, estimatedCostUSD: number, options: CheckBudgetOptions = {}): Promise<SpendCheckResult> {
    const bucket = utcDayBucket();
    const globalKey = `cost-guard:global:${bucket}`;
    const userKey = `cost-guard:user:${userId}:${bucket}`;

    let globalMicros: number;
    let userMicros: number;
    try {
      [globalMicros, userMicros] = await Promise.all([readMicros(globalKey), readMicros(userKey)]);
    } catch (error) {
      if (error instanceof CostGuardBackendError) {
        if (options.isPremium) {
          log.warn('cost-guard.backend_outage.fail_open_premium', { userId, message: error.message });
          return { allowed: true, remaining: this.config.userDailyLimitUSD, degraded: true };
        }
        log.error('cost-guard.backend_outage.fail_closed_free', error, { userId });
        return {
          allowed: false,
          remaining: 0,
          reason: 'Usage limits are temporarily unavailable. Please try again in a moment.',
          degraded: true,
        };
      }
      throw error;
    }

    const globalSpentUSD = globalMicros / MICROS_PER_USD;
    const userSpentUSD = userMicros / MICROS_PER_USD;

    if (globalSpentUSD + estimatedCostUSD > this.config.globalDailyLimitUSD) {
      return {
        allowed: false,
        remaining: Math.max(0, this.config.globalDailyLimitUSD - globalSpentUSD),
        reason: 'Platform daily AI budget exceeded. Please try again tomorrow.',
      };
    }

    if (userSpentUSD + estimatedCostUSD > this.config.userDailyLimitUSD) {
      const hoursUntilReset = Math.max(1, Math.ceil((nextUtcMidnight().getTime() - Date.now()) / 3_600_000));
      return {
        allowed: false,
        remaining: Math.max(0, this.config.userDailyLimitUSD - userSpentUSD),
        reason: `Daily AI budget limit reached ($${this.config.userDailyLimitUSD.toFixed(2)} USD). Resets in ${hoursUntilReset}h.`,
      };
    }

    return {
      allowed: true,
      remaining: this.config.userDailyLimitUSD - userSpentUSD,
    };
  }

  /**
   * Record actual spend after a successful AI call. Runs the global and
   * per-user increments concurrently; both are independent atomic counters.
   */
  async recordSpend(userId: string, actualCostUSD: number): Promise<void> {
    const micros = Math.round(actualCostUSD * MICROS_PER_USD);
    if (micros <= 0) return;

    const bucket = utcDayBucket();
    try {
      await Promise.all([
        incrementWithExpiry(`cost-guard:global:${bucket}`, micros, DAILY_KEY_TTL_SECONDS),
        incrementWithExpiry(`cost-guard:user:${userId}:${bucket}`, micros, DAILY_KEY_TTL_SECONDS),
      ]);
    } catch (error) {
      // The AI call already completed and billed the user — never throw from
      // spend recording. Worst case here is one day's counter under-counting
      // by a single request during a Redis outage, not a crashed response.
      log.error('cost-guard.record_spend.backend_outage', error, { userId });
    }
  }

  /**
   * Atomic Redis token bucket for orchestrator endpoints: capacity equals the
   * configured RPM, refilling at the same rate once per minute. Unlike a fixed
   * window, a token bucket doesn't allow a 2x burst at the window boundary
   * (e.g. `RPM` requests at 0:59 and another `RPM` at 1:00) — every `.limit()`
   * call atomically consumes one token via a Lua script on the Upstash side,
   * so concurrent requests from the same user can never race past the cap.
   * Falls back to an approximated in-memory window when Upstash isn't
   * configured (see `lib/server/upstash-rate-limit.ts`).
   */
  async checkOrchestratorRate(userId: string): Promise<SpendCheckResult> {
    const verdict = await checkDistributedTokenBucket(
      'cost-guard:orchestrator',
      userId,
      this.config.orchestratorRPM,
      this.config.orchestratorRPM,
      60_000
    );

    if (!verdict.allowed) {
      return {
        allowed: false,
        remaining: 0,
        reason: `Rate limit: max ${this.config.orchestratorRPM} requests/minute.`,
      };
    }

    return {
      allowed: true,
      remaining: verdict.remaining,
    };
  }

  /**
   * Get current spend stats for a user (for dashboard display).
   */
  async getSpendStats(userId: string): Promise<{ spentUSD: number; limitUSD: number; resetsAt: number }> {
    const micros = await readMicros(`cost-guard:user:${userId}:${utcDayBucket()}`);
    return {
      spentUSD: micros / MICROS_PER_USD,
      limitUSD: this.config.userDailyLimitUSD,
      resetsAt: nextUtcMidnight().getTime(),
    };
  }

  /**
   * Overrides the process-wide default daily limit. This is a *global*
   * override, not per-user — true per-user overrides require a persisted
   * admin table (e.g. a `userId -> limitUSD` row), which does not exist yet.
   * Kept explicit rather than silently doing nothing, as the previous
   * implementation did (it took `userId` but only ever mutated the shared
   * config, discarding the argument).
   */
  setUserDailyLimit(userId: string, limitUSD: number): void {
    log.warn('cost-guard.setUserDailyLimit.applies-globally-not-per-user', { requestedByUserId: userId, limitUSD });
    this.config.userDailyLimitUSD = limitUSD;
  }
}

export const costGuard = new CostGuard({
  userDailyLimitUSD: parseFloat(process.env.COST_GUARD_USER_DAILY_USD ?? '5'),
  globalDailyLimitUSD: parseFloat(process.env.COST_GUARD_GLOBAL_DAILY_USD ?? '500'),
  orchestratorRPM: parseInt(process.env.COST_GUARD_ORCHESTRATOR_RPM ?? '30', 10),
});

export { CostGuard };
