import type { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, type RateLimitConfig } from '@/lib/rate-limit'
import { capabilityResponse } from '@/lib/server/capability-response'

type AiCoreRateLimitOptions = {
  req: NextRequest
  capability: string
  route: string
  config?: RateLimitConfig
}

const DEFAULT_AI_CORE_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 30,
}

const DEFAULT_AI_INLINE_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 90,
}

export const AI_CORE_RATE_LIMIT = DEFAULT_AI_CORE_RATE_LIMIT
export const AI_INLINE_RATE_LIMIT = DEFAULT_AI_INLINE_RATE_LIMIT

export function enforceAiCoreRateLimit(options: AiCoreRateLimitOptions): NextResponse | null {
  const config = options.config ?? DEFAULT_AI_CORE_RATE_LIMIT
  const verdict = checkRateLimit(options.req, config)
  if (verdict.allowed) return null

  const retryAfterSeconds = Math.max(1, Math.ceil((verdict.resetTime - Date.now()) / 1000))
  return capabilityResponse({
    error: 'AI_RATE_LIMIT_EXCEEDED',
    status: 429,
    message: 'Too many AI requests. Please retry after cooldown window.',
    capability: options.capability,
    capabilityStatus: 'PARTIAL',
    milestone: 'P0',
    metadata: {
      route: options.route,
      limitWindowMs: config.windowMs,
      limitMaxRequests: config.maxRequests,
      retryAfterSeconds,
      remaining: verdict.remaining,
    },
    headers: {
      'Retry-After': String(retryAfterSeconds),
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(verdict.remaining),
      'X-RateLimit-Reset': String(Math.ceil(verdict.resetTime / 1000)),
    },
  })
}
