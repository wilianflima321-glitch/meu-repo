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
export const AI_EXPENSIVE_IMAGE_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 60 * 1000, maxRequests: 20 }
export const AI_EXPENSIVE_3D_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 60 * 1000, maxRequests: 20 }
export const AI_EXPENSIVE_MUSIC_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 60 * 1000, maxRequests: 30 }
export const AI_EXPENSIVE_VOICE_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 60 * 1000, maxRequests: 50 }
export const AI_VOICE_TRANSCRIBE_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 60 * 1000, maxRequests: 120 }
export const AI_AGENT_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 20 }
export const AI_CHANGE_MUTATION_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 45 }
export const AI_CONTEXT_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 60 }
export const AI_DIRECTOR_ACTION_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 }
export const AI_DIRECTOR_READ_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 45 }
export const AI_QUERY_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 }
export const AI_STATUS_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 120 }
export const AI_AGENT_READ_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 60 }
export const AI_CHANGE_READ_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 75 }
export const AI_CHANGE_FEEDBACK_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 }
export const AI_SUGGESTIONS_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 60 }
export const AI_TRACE_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 120 }
export const AI_THINKING_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 90 }
export const AI_CORE_LOOP_FEEDBACK_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 }

export const AI_GENERATION_RATE_LIMITS = {
  image: AI_EXPENSIVE_IMAGE_RATE_LIMIT,
  model3d: AI_EXPENSIVE_3D_RATE_LIMIT,
  music: AI_EXPENSIVE_MUSIC_RATE_LIMIT,
  voice: AI_EXPENSIVE_VOICE_RATE_LIMIT,
  voiceTranscribe: AI_VOICE_TRANSCRIBE_RATE_LIMIT,
} as const

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
