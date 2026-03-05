import type { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, type RateLimitConfig } from '@/lib/rate-limit'
import { capabilityResponse } from '@/lib/server/capability-response'

type PreviewRuntimeRateLimitOptions = {
  req: NextRequest
  capability: string
  route: string
  config: RateLimitConfig
}

const DEFAULT_DISCOVERY_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 60,
}

const DEFAULT_HEALTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 120,
}

const DEFAULT_PROVISION_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 20,
}

export const PREVIEW_DISCOVERY_RATE_LIMIT = DEFAULT_DISCOVERY_RATE_LIMIT
export const PREVIEW_HEALTH_RATE_LIMIT = DEFAULT_HEALTH_RATE_LIMIT
export const PREVIEW_PROVISION_RATE_LIMIT = DEFAULT_PROVISION_RATE_LIMIT

export function enforcePreviewRuntimeRateLimit(options: PreviewRuntimeRateLimitOptions): NextResponse | null {
  const verdict = checkRateLimit(options.req, options.config)
  if (verdict.allowed) return null

  const retryAfterSeconds = Math.max(1, Math.ceil((verdict.resetTime - Date.now()) / 1000))
  return capabilityResponse({
    error: 'PREVIEW_RUNTIME_RATE_LIMIT_EXCEEDED',
    status: 429,
    message: 'Too many preview runtime operations. Retry after cooldown window.',
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
      'X-RateLimit-Limit': String(options.config.maxRequests),
      'X-RateLimit-Remaining': String(verdict.remaining),
      'X-RateLimit-Reset': String(Math.ceil(verdict.resetTime / 1000)),
    },
  })
}
