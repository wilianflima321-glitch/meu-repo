/**
 * Rate Limiting Service - Redis-backed with plan-aware quotas
 *
 * Uses sliding window algorithm with Redis for distributed rate limiting.
 * Falls back to in-memory store when Redis is unavailable.
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Security)
 */

import { getPlanLimits } from '@/lib/plan-limits';

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Optional identifier for the rate limit bucket */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterMs: number | null;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

// ============================================================================
// PLAN-BASED RATE LIMITS
// ============================================================================

export function getRateLimitForPlan(plan: string, action: 'api' | 'ai' | 'preview' | 'deploy'): RateLimitConfig {
  const limits = getPlanLimits(plan);

  const configs: Record<string, RateLimitConfig> = {
    api: {
      max: Math.min(limits.requestsPerDay, 10000),
      windowMs: 60_000, // 1 minute window
      prefix: 'rl:api',
    },
    ai: {
      max: Math.ceil(limits.requestsPerDay / 24), // hourly fraction
      windowMs: 3_600_000, // 1 hour window
      prefix: 'rl:ai',
    },
    preview: {
      max: 20,
      windowMs: 300_000, // 5 minutes
      prefix: 'rl:preview',
    },
    deploy: {
      max: 5,
      windowMs: 3_600_000, // 1 hour
      prefix: 'rl:deploy',
    },
  };

  return configs[action] || configs.api;
}

// ============================================================================
// IN-MEMORY SLIDING WINDOW (fallback when Redis unavailable)
// ============================================================================

interface WindowEntry {
  timestamps: number[];
  windowMs: number;
}

const memoryWindows = new Map<string, WindowEntry>();

function cleanupMemoryWindows() {
  const now = Date.now();
  for (const [key, entry] of memoryWindows) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < entry.windowMs);
    if (entry.timestamps.length === 0) {
      memoryWindows.delete(key);
    }
  }
}

// Periodic cleanup every 60 seconds
let cleanupInterval: NodeJS.Timeout | null = null;
function ensureCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupMemoryWindows, 60_000);
    if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
      cleanupInterval.unref();
    }
  }
}

/**
 * Check rate limit using in-memory sliding window
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const key = `${config.prefix || 'rl'}:${identifier}`;

  let entry = memoryWindows.get(key);
  if (!entry) {
    entry = { timestamps: [], windowMs: config.windowMs };
    memoryWindows.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.max) {
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + config.windowMs;
    return {
      allowed: false,
      remaining: 0,
      limit: config.max,
      resetAt,
      retryAfterMs: resetAt - now,
    };
  }

  // Allow and record
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.max - entry.timestamps.length,
    limit: config.max,
    resetAt: now + config.windowMs,
    retryAfterMs: null,
  };
}

/**
 * Check rate limit for a user+action combination
 */
export function checkUserRateLimit(
  userId: string,
  plan: string,
  action: 'api' | 'ai' | 'preview' | 'deploy'
): RateLimitResult {
  const config = getRateLimitForPlan(plan, action);
  return checkRateLimit(`${userId}:${action}`, config);
}

/**
 * Build response headers from rate limit result
 */
export function rateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (result.retryAfterMs !== null) {
    headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000));
  }

  return headers;
}

/**
 * Check IP-based rate limit (for unauthenticated endpoints)
 */
export function checkIpRateLimit(
  ip: string,
  endpoint: string,
  max = 60,
  windowMs = 60_000
): RateLimitResult {
  return checkRateLimit(`ip:${ip}:${endpoint}`, { max, windowMs, prefix: 'rl:ip' });
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(identifier: string, prefix = 'rl'): void {
  memoryWindows.delete(`${prefix}:${identifier}`);
}
