/**
 * GET /api/ai/models/registry
 *
 * Returns the live OpenRouter model catalogue with pricing data.
 *
 * Cache strategy (mutex via DB timestamp):
 *   • If `IdeSetting` key `openrouter_pricing_cache` is fresher than
 *     CACHE_TTL_MS (1 hour), return the cached value immediately.
 *   • If a concurrent request is already refreshing (detected by a
 *     temporary `openrouter_pricing_cache_lock` row), serve stale cache
 *     rather than hammering OpenRouter's API.
 *   • Otherwise, fetch from OpenRouter, upsert into `IdeSetting`, and
 *     return the fresh catalogue.
 *
 * No auth required — public price data, no user PII.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'
import { AI_AGENT_READ_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'

const log = createComponentLogger('api.ai.models.registry')

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
const CACHE_KEY = 'openrouter_pricing_cache'
const LOCK_KEY = 'openrouter_pricing_cache_lock'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const LOCK_TTL_MS = 30 * 1000 // 30 s max lock age

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenRouterModelEntry {
  id: string
  name: string
  description?: string
  context_length: number
  pricing: {
    prompt: string  // cost per token in USD as decimal string
    completion: string
  }
  top_provider?: {
    max_completion_tokens?: number
  }
  architecture?: {
    modality?: string
    tokenizer?: string
  }
}

export interface ModelRegistryEntry {
  id: string
  name: string
  contextWindow: number
  maxOutput: number
  inputCostPer1M: number
  outputCostPer1M: number
  supportsVision: boolean
  supportsTools: boolean
}

export interface ModelRegistryResponse {
  models: ModelRegistryEntry[]
  cachedAt: string
  source: 'live' | 'cache' | 'stale-lock'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePricePer1M(raw: string): number {
  const n = parseFloat(raw)
  return Number.isFinite(n) ? Math.round(n * 1_000_000 * 100) / 100 : 0
}

function normaliseEntry(raw: OpenRouterModelEntry): ModelRegistryEntry {
  const modality = raw.architecture?.modality ?? ''
  return {
    id: raw.id,
    name: raw.name,
    contextWindow: raw.context_length,
    maxOutput: raw.top_provider?.max_completion_tokens ?? 4096,
    inputCostPer1M: parsePricePer1M(raw.pricing.prompt),
    outputCostPer1M: parsePricePer1M(raw.pricing.completion),
    supportsVision: modality.includes('image') || modality.includes('vision'),
    supportsTools: true, // OpenRouter exposes this per-call; assume capable by default
  }
}

async function fetchFromOpenRouter(): Promise<ModelRegistryEntry[]> {
  const res = await fetch(OPENROUTER_MODELS_URL, {
    headers: { 'HTTP-Referer': 'https://aethel.io', 'X-Title': 'Aethel Engine' },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    throw new Error(`OpenRouter models fetch failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as { data?: OpenRouterModelEntry[] }
  const raw = json.data ?? []
  return raw.map(normaliseEntry)
}

async function tryReleaseLock(): Promise<void> {
  try {
    await prisma.ideSetting.deleteMany({ where: { key: LOCK_KEY, scope: 'global' } })
  } catch {
    // best-effort
  }
}

// Prisma stores JSON as `Prisma.JsonValue` which isn't directly castable to
// our strongly-typed payload.  Round-trip through JSON to get a plain object.
function fromPrismaJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse<ModelRegistryResponse>> {
  const rateLimited = enforceAiCoreRateLimit({
    req: request,
    capability: 'ai.models.registry',
    route: '/api/ai/models/registry',
    config: AI_AGENT_READ_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited as any

  // 1. Check the cache
  try {
    const cached = await prisma.ideSetting.findUnique({
      where: { key_scope: { key: CACHE_KEY, scope: 'global' } },
    })

    if (cached) {
      const ageMs = Date.now() - cached.updatedAt.getTime()
      if (ageMs < CACHE_TTL_MS) {
        log.info('Serving cached OpenRouter model registry', { ageMs })
        const payload = fromPrismaJson<{ models: ModelRegistryEntry[]; cachedAt: string }>(cached.value)
        return NextResponse.json({ ...payload, source: 'cache' })
      }
    }

    // 2. Check lock — another process may already be refreshing
    const lock = await prisma.ideSetting.findUnique({
      where: { key_scope: { key: LOCK_KEY, scope: 'global' } },
    })
    if (lock) {
      const lockAgeMs = Date.now() - lock.updatedAt.getTime()
      if (lockAgeMs < LOCK_TTL_MS) {
        log.info('Serving stale cache while concurrent refresh is in progress')
        if (cached) {
          const payload = fromPrismaJson<{ models: ModelRegistryEntry[]; cachedAt: string }>(cached.value)
          return NextResponse.json({ ...payload, source: 'stale-lock' })
        }
      } else {
        // Stale lock — clear it and proceed with a fresh fetch
        await tryReleaseLock()
      }
    }

    // 3. Acquire lock
    await prisma.ideSetting.upsert({
      where: { key_scope: { key: LOCK_KEY, scope: 'global' } },
      create: { key: LOCK_KEY, scope: 'global', value: { locked: true } },
      update: { value: { locked: true } },
    })

    // 4. Fetch from OpenRouter
    let models: ModelRegistryEntry[]
    try {
      models = await fetchFromOpenRouter()
      log.info('Fetched OpenRouter model registry', { count: models.length })
    } catch (fetchErr) {
      await tryReleaseLock()
      log.warn('OpenRouter fetch failed, serving stale cache if available', { error: String(fetchErr) })
      if (cached) {
        const payload = fromPrismaJson<{ models: ModelRegistryEntry[]; cachedAt: string }>(cached.value)
        return NextResponse.json({ ...payload, source: 'stale-lock' })
      }
      throw fetchErr
    }

    // 5. Persist to IdeSetting cache
    const cachedAt = new Date().toISOString()
    const cachePayload = JSON.parse(JSON.stringify({ models, cachedAt })) as Prisma.InputJsonValue
    await prisma.ideSetting.upsert({
      where: { key_scope: { key: CACHE_KEY, scope: 'global' } },
      create: { key: CACHE_KEY, scope: 'global', value: cachePayload },
      update: { value: cachePayload },
    })

    await tryReleaseLock()

    return NextResponse.json({ models, cachedAt, source: 'live' })
  } catch (err) {
    await tryReleaseLock()
    log.error('Model registry route error', { error: String(err) })
    return NextResponse.json(
      { models: [], cachedAt: new Date().toISOString(), source: 'live' } as ModelRegistryResponse,
      { status: 500 },
    )
  }
}
