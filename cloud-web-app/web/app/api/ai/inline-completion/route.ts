import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/db'
import { checkAIQuota, checkModelAccess, recordTokenUsage, getPlanLimits } from '@/lib/plan-limits'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

/**
 * Inline Completion API (compat surface for ghost-text clients)
 * POST /api/ai/inline-completion
 *
 * Returns both `suggestion` (canonical) and `text` (compat alias).
 */

const SYSTEM_PROMPT = `You are an inline code completion engine.
Rules:
- Return only the text to insert at cursor.
- Do not add markdown or explanations.
- Do not repeat prefix/suffix content.
- Keep completion concise.`

const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'google', 'groq'] as const

function normalizeCompletion(text: string): string {
  return String(text || '')
    .replace(/```[\w]*\n?/g, '')
    .replace(/```$/g, '')
    .replace(/<\|[^|]+\|>/g, '')
    .trimEnd()
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-inline-completion',
      key: user.userId,
      max: 120,
      windowMs: 60 * 1000,
      message: 'Too many inline completion requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const prompt = typeof (body as any).prompt === 'string' ? (body as any).prompt : ''
    const requestedProviderRaw =
      typeof (body as any).provider === 'string' ? String((body as any).provider).trim().toLowerCase() : ''
    if (requestedProviderRaw && !SUPPORTED_PROVIDERS.includes(requestedProviderRaw as (typeof SUPPORTED_PROVIDERS)[number])) {
      return NextResponse.json(
        {
          error: 'INVALID_PROVIDER',
          message: 'Requested provider is not supported.',
          supportedProviders: [...SUPPORTED_PROVIDERS],
        },
        { status: 400 }
      )
    }
    const provider = requestedProviderRaw
      ? (requestedProviderRaw as (typeof SUPPORTED_PROVIDERS)[number])
      : undefined
    const model = typeof (body as any).model === 'string' ? (body as any).model : undefined
    const maxTokens = typeof (body as any).maxTokens === 'number' ? Math.max(1, Math.floor((body as any).maxTokens)) : 256
    const temperature = typeof (body as any).temperature === 'number' ? Math.min(1, Math.max(0, (body as any).temperature)) : 0.1

    if (!prompt) {
      return NextResponse.json({ suggestion: '', text: '' })
    }

    const userRow = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true } })
    const limits = getPlanLimits(userRow?.plan || 'starter_trial')

    const estimatedTokens = Math.max(300, Math.ceil(prompt.length / 4) + 300 + maxTokens)
    if (estimatedTokens > limits.maxTokensPerRequest) {
      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: `Request too large. Limit: ${limits.maxTokensPerRequest.toLocaleString()} tokens.`,
          maxTokensPerRequest: limits.maxTokensPerRequest,
        },
        { status: 413 }
      )
    }

    const quotaCheck = await checkAIQuota(user.userId, estimatedTokens)
    if (!quotaCheck.allowed) {
      const status = quotaCheck.code === 'CREDITS_EXHAUSTED' ? 402 : 429
      return NextResponse.json({ error: quotaCheck.code, message: quotaCheck.reason }, { status })
    }

    if (model) {
      const modelCheck = await checkModelAccess(user.userId, model)
      if (!modelCheck.allowed) {
        return NextResponse.json({ error: modelCheck.code, message: modelCheck.reason }, { status: 403 })
      }
    }

    const availableProviders = aiService.getAvailableProviders()
    if (availableProviders.length === 0) {
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: 'AI provider is not configured for current runtime.',
        status: 503,
        capability: 'AI_INLINE_COMPLETION',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: {
          requestedProvider: provider || null,
          availableProviders: [],
        },
      })
    }
    if (provider && !availableProviders.includes(provider as (typeof availableProviders)[number])) {
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: 'Requested AI provider is not configured for current runtime.',
        status: 503,
        capability: 'AI_INLINE_COMPLETION',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: {
          requestedProvider: provider,
          availableProviders,
        },
      })
    }

    const response = await aiService.chat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      provider,
      model,
      temperature,
      maxTokens,
    })

    recordTokenUsage(user.userId, response.tokensUsed).catch(() => {})
    const suggestion = normalizeCompletion(response.content)

    return NextResponse.json({
      suggestion,
      text: suggestion,
      provider: response.provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
    })
  } catch (error) {
    console.error('[AI Inline Completion] Error:', error)
    return NextResponse.json(
      { error: 'AI_ERROR', message: error instanceof Error ? error.message : 'AI request failed' },
      { status: 500 }
    )
  }
}
