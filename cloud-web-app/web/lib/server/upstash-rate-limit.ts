/**
 * Distributed (Upstash Redis) rate limiting for routes that drive real cost or
 * abuse risk across multiple server instances / serverless invocations, where
 * the in-memory `lib/rate-limit.ts` store (per-instance, resets on redeploy)
 * is not sufficient.
 *
 * Mirrors the exact pattern already proven in
 * `app/api/auth/forgot-password/route.ts`: `@upstash/ratelimit` +
 * `@upstash/redis`, lazily constructed from `UPSTASH_REDIS_REST_URL` /
 * `UPSTASH_REDIS_REST_TOKEN`, with a transparent in-memory fallback so routes
 * keep working (degraded to per-instance limiting) in environments where
 * Upstash isn't configured (local dev, self-hosted without Redis).
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import { checkRateLimit, type RateLimitConfig } from '@/lib/rate-limit'

export interface DistributedRateLimitVerdict {
  allowed: boolean
  limit: number
  remaining: number
  /** Unix seconds. */
  resetAtSeconds: number
}

let cachedRedis: Redis | null | undefined

function getUpstashRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    cachedRedis = null
    return cachedRedis
  }

  cachedRedis = new Redis({ url, token })
  return cachedRedis
}

/**
 * Public accessor for callers that need the raw Upstash client for atomic
 * operations beyond the sliding-window/token-bucket helpers below (e.g.
 * `lib/observability/cost-guard.ts`, which needs real error propagation on
 * a Redis outage instead of `lib/redis-cache.ts`'s silent-null fallback, to
 * implement its fail-open/fail-closed policy). Returns `null` when Upstash
 * isn't configured — callers should fall back to another store in that case,
 * not treat `null` as "the backend is down".
 */
export function getUpstashRedisClient(): Redis | null {
  return getUpstashRedis()
}

const limiterCache = new Map<string, Ratelimit>()

/**
 * Fixed/sliding-window distributed limiter, keyed by `prefix`. Use for
 * "N requests per window" style limits (the common case for API routes).
 */
function getSlidingWindowLimiter(prefix: string, maxRequests: number, windowMs: number): Ratelimit | null {
  const redis = getUpstashRedis()
  if (!redis) return null

  const cacheKey = `sw:${prefix}:${maxRequests}:${windowMs}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    const windowSeconds = Math.max(1, Math.round(windowMs / 1000))
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      analytics: true,
      prefix: `aethel:${prefix}`,
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

/**
 * Atomic Redis-backed token bucket, for burst-tolerant throttling (e.g. AI
 * orchestrator request cadence): `capacity` tokens refill at `refillTokens`
 * per `refillIntervalMs`, and every call to `.limit()` atomically consumes one
 * token via a Lua script on the Upstash side — no read-then-write race.
 */
function getTokenBucketLimiter(prefix: string, capacity: number, refillTokens: number, refillIntervalMs: number): Ratelimit | null {
  const redis = getUpstashRedis()
  if (!redis) return null

  const cacheKey = `tb:${prefix}:${capacity}:${refillTokens}:${refillIntervalMs}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    const refillSeconds = Math.max(1, Math.round(refillIntervalMs / 1000))
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(refillTokens, `${refillSeconds} s`, capacity),
      analytics: true,
      prefix: `aethel:${prefix}`,
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

/**
 * Checks a sliding-window limit for `identifier` under `prefix`, using
 * distributed Upstash Redis when configured and transparently falling back to
 * the existing in-memory `lib/rate-limit.ts` limiter (scoped by prefix so it
 * doesn't collide with other callers) when it isn't.
 */
export async function checkDistributedRateLimit(
  prefix: string,
  identifier: string,
  config: RateLimitConfig
): Promise<DistributedRateLimitVerdict> {
  const limiter = getSlidingWindowLimiter(prefix, config.maxRequests, config.windowMs)

  if (limiter) {
    const result = await limiter.limit(identifier)
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAtSeconds: Math.ceil(result.reset / 1000),
    }
  }

  // Fallback path: reuse the in-memory limiter, namespaced with a synthetic
  // NextRequest-free key so it doesn't need the request object.
  return checkInMemoryByKey(`${prefix}:${identifier}`, config)
}

/**
 * Checks an atomic Redis token bucket for `identifier`. When Upstash isn't
 * configured, falls back to the same in-memory limiter used elsewhere
 * (approximated as a fixed window of `capacity` requests per
 * `refillIntervalMs`) — not a true bucket, but keeps the guard functional in
 * environments without Redis instead of failing open or throwing.
 */
export async function checkDistributedTokenBucket(
  prefix: string,
  identifier: string,
  capacity: number,
  refillTokens: number,
  refillIntervalMs: number
): Promise<DistributedRateLimitVerdict> {
  const limiter = getTokenBucketLimiter(prefix, capacity, refillTokens, refillIntervalMs)

  if (limiter) {
    const result = await limiter.limit(identifier)
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAtSeconds: Math.ceil(result.reset / 1000),
    }
  }

  return checkInMemoryByKey(`${prefix}:${identifier}`, { windowMs: refillIntervalMs, maxRequests: capacity })
}

const memoryStoreState = new Map<string, { count: number; resetTime: number }>()

/** Same algorithm as `lib/rate-limit.ts#checkRateLimit`, but keyed directly instead of derived from a `NextRequest`. */
function checkInMemoryByKey(key: string, config: RateLimitConfig): DistributedRateLimitVerdict {
  const now = Date.now()
  const current = memoryStoreState.get(key)

  if (!current || current.resetTime <= now) {
    const resetTime = now + config.windowMs
    memoryStoreState.set(key, { count: 1, resetTime })
    return { allowed: true, limit: config.maxRequests, remaining: config.maxRequests - 1, resetAtSeconds: Math.ceil(resetTime / 1000) }
  }

  current.count += 1
  const allowed = current.count <= config.maxRequests
  return {
    allowed,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - current.count),
    resetAtSeconds: Math.ceil(current.resetTime / 1000),
  }
}

/** True once `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set — useful for diagnostics/health checks. */
export function isDistributedRateLimitBackendConfigured(): boolean {
  return getUpstashRedis() !== null
}

// Re-exported so callers that only need the request-derived client identifier
// don't need to reach into `lib/rate-limit.ts` directly.
export { checkRateLimit } from '@/lib/rate-limit'
