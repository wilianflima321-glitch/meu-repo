import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/db'
import { checkAIQuota, checkModelAccess, recordTokenUsage, getPlanLimits } from '@/lib/plan-limits'
import { capabilityResponse, notImplementedCapability } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

/**
 * POST /api/ai/complete
 * Autocomplete endpoint (L1) aligned with AI_SYSTEM_SPEC.
 *
 * Accepts either:
 * - { prefix, suffix, language, filepath }
 * - { prompt }
 */

const SYSTEM_PROMPT = `You are an inline code completion engine (ghost text).
Rules:
- Return ONLY the text to insert at the cursor.
- Do NOT include markdown or explanations.
- Do NOT repeat existing prefix/suffix.
- Keep it short and natural.`

const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'google', 'groq'] as const

function buildPrompt(args: {
  prefix?: string
  suffix?: string
  language?: string
  filepath?: string
  prompt?: string
}) {
  if (args.prompt) return args.prompt

  const prefix = args.prefix || ''
  const suffix = args.suffix || ''
  const language = args.language || 'text'
  const filepath = args.filepath || 'file'

  return `<|fim_prefix|># File: ${filepath}
# Language: ${language}

${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`
}

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
      scope: 'ai-complete',
      key: user.userId,
      max: 120,
      windowMs: 60 * 1000,
      message: 'Too many autocomplete requests. Slow down and retry in a few seconds.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const prompt = buildPrompt({
      prompt: typeof (body as any).prompt === 'string' ? (body as any).prompt : undefined,
      prefix: typeof (body as any).prefix === 'string' ? (body as any).prefix : undefined,
      suffix: typeof (body as any).suffix === 'string' ? (body as any).suffix : undefined,
      language: typeof (body as any).language === 'string' ? (body as any).language : undefined,
      filepath: typeof (body as any).filepath === 'string' ? (body as any).filepath : undefined,
    })

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
      return NextResponse.json({ suggestion: '' })
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
      return notImplementedCapability({
        error: 'NOT_IMPLEMENTED',
        status: 501,
        message: 'AI provider not configured.',
        capability: 'AI_COMPLETE',
        milestone: 'P0',
      })
    }
    if (provider && !availableProviders.includes(provider as (typeof availableProviders)[number])) {
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: 'Requested AI provider is not configured for current runtime.',
        status: 503,
        capability: 'AI_COMPLETE',
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
      text: suggestion, // compatibility alias (1 cycle) for legacy consumers
      provider: response.provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
    })
  } catch (error) {
    console.error('[AI Complete] Error:', error)
    return NextResponse.json(
      { error: 'AI_ERROR', message: error instanceof Error ? error.message : 'AI request failed' },
      { status: 500 }
    )
  }
}
