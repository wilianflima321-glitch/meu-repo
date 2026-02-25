import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { aiService, type LLMProvider } from '@/lib/ai-service'
import { prisma } from '@/lib/db'
import { checkAIQuota, checkModelAccess, getPlanLimits, recordTokenUsage } from '@/lib/plan-limits'
import { AITraceSummary, createAITraceId } from '@/lib/ai-internal-trace'
import { persistAITrace } from '@/lib/ai-trace-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

type QueryBody = {
  query?: unknown
  context?: unknown
  provider?: unknown
  model?: unknown
}

const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'google', 'groq'] as const

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function providerConfigError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('not configured') ||
    normalized.includes('nao configurado') ||
    normalized.includes('provider not supported') ||
    normalized.includes('provider nao suportado')
  )
}

/**
 * POST /api/ai/query
 * Direct query endpoint with explicit entitlement and capability contracts.
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-query',
      key: user.userId,
      max: 40,
      windowMs: 60 * 1000,
      message: 'Too many AI query requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const rawBody = (await req.json().catch(() => null)) as QueryBody | null
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'INVALID_BODY', message: 'Invalid JSON body.' },
        { status: 400 }
      )
    }

    const query = asOptionalString(rawBody.query) || ''
    const context = asOptionalString(rawBody.context)
    const requestedProvider = asOptionalString(rawBody.provider)
    const model = asOptionalString(rawBody.model)
    const traceId = createAITraceId()

    if (!query) {
      return NextResponse.json(
        { error: 'MISSING_QUERY', message: 'Query is required.' },
        { status: 400 }
      )
    }

    const userRow = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    })
    const limits = getPlanLimits(userRow?.plan || 'starter_trial')
    const estimatedTokens = Math.max(600, Math.ceil(query.length / 4) + 600)

    if (estimatedTokens > limits.maxTokensPerRequest) {
      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: `Query too large for current plan. Limit: ${limits.maxTokensPerRequest.toLocaleString()} tokens per request.`,
          maxTokensPerRequest: limits.maxTokensPerRequest,
          upgradeUrl: '/pricing',
        },
        { status: 413 }
      )
    }

    const quotaCheck = await checkAIQuota(user.userId, estimatedTokens)
    if (!quotaCheck.allowed) {
      const status = quotaCheck.code === 'CREDITS_EXHAUSTED' ? 402 : 429
      return NextResponse.json(
        {
          error: quotaCheck.code,
          message: quotaCheck.reason,
          upgradeUrl: '/pricing',
        },
        { status }
      )
    }

    if (model) {
      const modelCheck = await checkModelAccess(user.userId, model)
      if (!modelCheck.allowed) {
        return NextResponse.json(
          {
            error: modelCheck.code,
            message: modelCheck.reason,
            availableModels: limits.models,
            upgradeUrl: '/pricing',
          },
          { status: 403 }
        )
      }
    }

    const availableProviders = aiService.getAvailableProviders()
    if (requestedProvider && !SUPPORTED_PROVIDERS.includes(requestedProvider as (typeof SUPPORTED_PROVIDERS)[number])) {
      return NextResponse.json(
        {
          error: 'INVALID_PROVIDER',
          message: 'Requested provider is not supported.',
          supportedProviders: [...SUPPORTED_PROVIDERS],
        },
        { status: 400 }
      )
    }
    if (availableProviders.length === 0) {
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: 'AI provider is not configured for current runtime.',
        status: 503,
        capability: 'AI_QUERY',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: {
          requestedProvider: requestedProvider || null,
          availableProviders: [],
        },
      })
    }
    if (requestedProvider && !availableProviders.includes(requestedProvider as (typeof availableProviders)[number])) {
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: 'Requested AI provider is not configured for current runtime.',
        status: 503,
        capability: 'AI_QUERY',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: {
          requestedProvider,
          availableProviders,
        },
      })
    }

    const provider = requestedProvider as LLMProvider | undefined
    const response = await aiService.query(query, context, { provider, model })

    recordTokenUsage(user.userId, response.tokensUsed).catch((dbError) => {
      console.warn('[AI Query] Failed to record token usage:', dbError)
    })

    const evidence: NonNullable<AITraceSummary['evidence']> = [
      { kind: 'context', label: 'query', detail: `chars=${query.length}` },
    ]
    if (context) {
      evidence.push({ kind: 'context', label: 'context', detail: `chars=${context.length}` })
    }

    const traceSummary: AITraceSummary = {
      traceId,
      summary: 'Response generated in query mode.',
      evidence,
      telemetry: {
        model: response.model,
        provider: response.provider,
        estimatedTokens,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
      },
    }

    persistAITrace({
      userId: user.userId,
      trace: traceSummary,
      kind: 'query',
    }).catch((traceError) => {
      console.warn('[AI Trace] Failed to persist trace:', traceError)
    })

    return NextResponse.json({
      answer: response.content,
      model: response.model,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
      availableProviders,
      traceId,
      traceSummary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI query failed'
    console.error('[AI Query] Error:', error)

    if (message === 'Unauthorized' || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }

    if (providerConfigError(message)) {
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: 'Requested AI provider is not configured for current runtime.',
        status: 503,
        capability: 'AI_QUERY',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: {
          availableProviders: aiService.getAvailableProviders(),
          reason: message,
        },
      })
    }

    return NextResponse.json({ error: 'AI_ERROR', message }, { status: 500 })
  }
}
