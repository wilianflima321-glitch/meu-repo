/**
 * Generic per-route rate limiting helper, mirroring the AI-specific
 * `enforceAiCoreRateLimit` (lib/server/ai-core-rate-limit.ts) but for non-AI
 * surfaces that can still drive real cost or abuse:
 *  - Export job enqueue routes (render-farm compute, see app/api/exports/*)
 *  - Render job routes (GPU/CPU render farm dispatch, see app/api/render/jobs/*)
 *  - Marketplace purchase/install/payout routes (Stripe API calls, DB writes)
 *
 * Backed by `lib/server/upstash-rate-limit.ts`: a real distributed Redis
 * sliding-window limiter when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
 * are configured (correct across multiple server instances / serverless
 * invocations, which is what "severe" rate limiting on cost-bearing routes
 * actually requires), transparently falling back to the existing in-memory
 * limiter otherwise so routes keep working in environments without Redis.
 */

import type { NextRequest, NextResponse } from 'next/server'
import { getClientId, type RateLimitConfig } from '@/lib/rate-limit'
import { checkDistributedRateLimit } from '@/lib/server/upstash-rate-limit'
import { capabilityResponse } from '@/lib/server/capability-response'

/** Export jobs are enqueued to the render farm — real compute cost per call. */
export const EXPORT_JOB_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 10 }

/** Render jobs dispatch to the GPU/CPU render farm — real compute cost per call. */
export const RENDER_JOB_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 10 }

/** Cheap read-only render job status/artifact polling — generous but still bounded. */
export const RENDER_JOB_READ_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 60 }

/** Checkout creates a real Stripe Checkout Session per call. */
export const MARKETPLACE_CHECKOUT_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 10 }

/** Stripe Connect onboarding link creation — real Stripe API call per request. */
export const MARKETPLACE_STRIPE_CONNECT_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 5 }

/** Install/cart/uninstall/favorites mutate DB state per call but carry no direct Stripe cost. */
export const MARKETPLACE_WRITE_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 }

/** Catalog/listing/search reads — cheap individually, but scriptable at scale; keep bots from hammering the DB. */
export const MARKETPLACE_READ_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 120 }

type RouteRateLimitOptions = {
  req: NextRequest
  capability: string
  route: string
  config: RateLimitConfig
  /** Overrides the default IP/auth-header derived identifier (e.g. to key by authenticated userId instead). */
  identifier?: string
}

export async function enforceRouteRateLimit(options: RouteRateLimitOptions): Promise<NextResponse | null> {
  const identifier = options.identifier ?? getClientId(options.req)
  const verdict = await checkDistributedRateLimit(options.route, identifier, options.config)
  if (verdict.allowed) return null

  const retryAfterSeconds = Math.max(1, verdict.resetAtSeconds - Math.floor(Date.now() / 1000))
  return capabilityResponse({
    error: 'RATE_LIMIT_EXCEEDED',
    status: 429,
    message: 'Too many requests. Please retry after the cooldown window.',
    capability: options.capability,
    capabilityStatus: 'PARTIAL',
    milestone: 'P0',
    metadata: {
      route: options.route,
      limitWindowMs: options.config.windowMs,
      limitMaxRequests: options.config.maxRequests,
      retryAfterSeconds,
      remaining: verdict.remaining,
    },
    headers: {
      'Retry-After': String(retryAfterSeconds),
      'X-RateLimit-Limit': String(verdict.limit),
      'X-RateLimit-Remaining': String(verdict.remaining),
      'X-RateLimit-Reset': String(verdict.resetAtSeconds),
    },
  })
}
