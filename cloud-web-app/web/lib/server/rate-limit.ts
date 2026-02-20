import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitEntry = {
  count: number
  resetAtMs: number
}

type RateLimitStore = Map<string, RateLimitEntry>

type EnforceRateLimitInput = {
  scope: string
  key: string
  max: number
  windowMs: number
  error?: string
  message?: string
  status?: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
  resetAtMs: number
  backend: 'upstash' | 'memory' | 'memory-fallback'
}

type RuntimeRateLimitStats = {
  upstashHits: number
  memoryHits: number
  memoryFallbackHits: number
  lastFallbackAt?: string
  lastFallbackError?: string
}

const STORE_KEY = '__AETHEL_RATE_LIMIT_STORE__'
const REDIS_KEY = '__AETHEL_RATE_LIMIT_REDIS__'
const LIMITER_CACHE_KEY = '__AETHEL_RATE_LIMIT_LIMITERS__'
const STATS_KEY = '__AETHEL_RATE_LIMIT_RUNTIME_STATS__'

function getStore(): RateLimitStore {
  const globalRef = globalThis as typeof globalThis & {
    [STORE_KEY]?: RateLimitStore
  }

  if (!globalRef[STORE_KEY]) {
    globalRef[STORE_KEY] = new Map<string, RateLimitEntry>()
  }

  return globalRef[STORE_KEY] as RateLimitStore
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const globalRef = globalThis as typeof globalThis & {
    [REDIS_KEY]?: Redis
  }

  if (!globalRef[REDIS_KEY]) {
    globalRef[REDIS_KEY] = new Redis({ url, token })
  }

  return globalRef[REDIS_KEY] as Redis
}

function getRuntimeStats(): RuntimeRateLimitStats {
  const globalRef = globalThis as typeof globalThis & {
    [STATS_KEY]?: RuntimeRateLimitStats
  }

  if (!globalRef[STATS_KEY]) {
    globalRef[STATS_KEY] = {
      upstashHits: 0,
      memoryHits: 0,
      memoryFallbackHits: 0,
    }
  }

  return globalRef[STATS_KEY] as RuntimeRateLimitStats
}

function markRateLimitBackend(backend: RateLimitResult['backend'], fallbackError?: unknown) {
  const stats = getRuntimeStats()
  if (backend === 'upstash') {
    stats.upstashHits += 1
    return
  }
  if (backend === 'memory') {
    stats.memoryHits += 1
    return
  }
  stats.memoryFallbackHits += 1
  stats.lastFallbackAt = new Date().toISOString()
  if (fallbackError) {
    stats.lastFallbackError =
      fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
  }
}

export function getRateLimitBackendInfo() {
  const hasUpstashConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  )
  return {
    hasUpstashConfig,
    configuredBackend: hasUpstashConfig ? 'upstash' : 'memory',
    fallbackPolicy: hasUpstashConfig ? 'memory-fallback-on-upstash-failure' : 'memory-only',
  } as const
}

export function getRateLimitRuntimeDiagnostics() {
  const stats = getRuntimeStats()
  return {
    ...getRateLimitBackendInfo(),
    runtime: {
      upstashHits: stats.upstashHits,
      memoryHits: stats.memoryHits,
      memoryFallbackHits: stats.memoryFallbackHits,
      lastFallbackAt: stats.lastFallbackAt || null,
      lastFallbackError: stats.lastFallbackError || null,
    },
  }
}

function windowToDuration(windowMs: number): Duration {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000))
  if (seconds % 3600 === 0) return `${seconds / 3600} h` as Duration
  if (seconds % 60 === 0) return `${seconds / 60} m` as Duration
  return `${seconds} s` as Duration
}

function getUpstashLimiter(scope: string, max: number, windowMs: number): Ratelimit | null {
  const redis = getRedisClient()
  if (!redis) return null

  const globalRef = globalThis as typeof globalThis & {
    [LIMITER_CACHE_KEY]?: Map<string, Ratelimit>
  }
  if (!globalRef[LIMITER_CACHE_KEY]) {
    globalRef[LIMITER_CACHE_KEY] = new Map<string, Ratelimit>()
  }
  const cache = globalRef[LIMITER_CACHE_KEY] as Map<string, Ratelimit>
  const cacheKey = `${scope}:${max}:${windowMs}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, windowToDuration(windowMs)),
    prefix: `aethel:rl:${scope}`,
    analytics: true,
  })
  cache.set(cacheKey, limiter)
  return limiter
}

function compactStore(store: RateLimitStore, nowMs: number) {
  if (store.size < 5000) return
  for (const [key, value] of store.entries()) {
    if (value.resetAtMs <= nowMs) {
      store.delete(key)
    }
  }
}

function evaluateMemoryRateLimit(
  input: EnforceRateLimitInput,
  backend: 'memory' | 'memory-fallback'
): RateLimitResult {
  const nowMs = Date.now()
  const store = getStore()
  compactStore(store, nowMs)

  const id = `${input.scope}:${input.key}`
  const current = store.get(id)

  if (!current || current.resetAtMs <= nowMs) {
    const next: RateLimitEntry = {
      count: 1,
      resetAtMs: nowMs + input.windowMs,
    }
    store.set(id, next)
    return {
      allowed: true,
      remaining: Math.max(0, input.max - 1),
      retryAfterSec: Math.ceil(input.windowMs / 1000),
      resetAtMs: next.resetAtMs,
      backend,
    }
  }

  const nextCount = current.count + 1
  current.count = nextCount
  store.set(id, current)

  const remaining = Math.max(0, input.max - nextCount)
  const retryAfterSec = Math.max(1, Math.ceil((current.resetAtMs - nowMs) / 1000))

  return {
    allowed: nextCount <= input.max,
    remaining,
    retryAfterSec,
    resetAtMs: current.resetAtMs,
    backend,
  }
}

function rateLimitHeaders(input: EnforceRateLimitInput, result: RateLimitResult): Record<string, string> {
  return {
    'x-aethel-rate-limit-scope': input.scope,
    'x-aethel-rate-limit-key-mode': result.backend,
    'x-ratelimit-limit': String(input.max),
    'x-ratelimit-remaining': String(result.remaining),
    'x-ratelimit-reset': String(Math.floor(result.resetAtMs / 1000)),
    'retry-after': String(result.retryAfterSec),
  }
}

export function getRequestIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp && realIp.trim()) return realIp.trim()

  return 'unknown'
}

async function evaluateRateLimit(input: EnforceRateLimitInput): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(input.scope, input.max, input.windowMs)
  if (limiter) {
    try {
      const result = await limiter.limit(input.key)
      const nowMs = Date.now()
      const maybeMs = result.reset > 10_000_000_000 ? result.reset : result.reset * 1000
      const resetAtMs = Number.isFinite(maybeMs) ? maybeMs : nowMs + input.windowMs
      const payload: RateLimitResult = {
        allowed: result.success,
        remaining: Math.max(0, result.remaining),
        retryAfterSec: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
        resetAtMs,
        backend: 'upstash',
      }
      markRateLimitBackend(payload.backend)
      return payload
    } catch (error) {
      const payload = evaluateMemoryRateLimit(input, 'memory-fallback')
      markRateLimitBackend(payload.backend, error)
      return payload
    }
  }

  const payload = evaluateMemoryRateLimit(input, 'memory')
  markRateLimitBackend(payload.backend)
  return payload
}

export async function enforceRateLimit(input: EnforceRateLimitInput): Promise<NextResponse | null> {
  const result = await evaluateRateLimit(input)
  if (result.allowed) return null

  return NextResponse.json(
    {
      error: input.error || 'RATE_LIMITED',
      message: input.message || 'Too many requests. Please try again later.',
      metadata: {
        scope: input.scope,
        max: input.max,
        windowMs: input.windowMs,
        retryAfterSec: result.retryAfterSec,
      },
    },
    {
      status: input.status || 429,
      headers: rateLimitHeaders(input, result),
    }
  )
}
