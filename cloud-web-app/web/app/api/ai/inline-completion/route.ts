import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/db'
import { checkAIQuota, checkModelAccess, recordTokenUsage, getPlanLimits } from '@/lib/plan-limits'
import { capabilityResponse } from '@/lib/server/capability-response'
import { buildAiProviderSetupMetadata } from '@/lib/capability-constants'
import {
  AI_DEMO_MODEL,
  AI_DEMO_PROVIDER,
  buildDemoCompletion,
  demoRouteMetadata,
  isAiDemoModeEnabled,
} from '@/lib/server/ai-demo-mode'

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
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const prompt = typeof (body as any).prompt === 'string' ? (body as any).prompt : ''
    const provider = typeof (body as any).provider === 'string' ? (body as any).provider : undefined
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
      return NextResponse.json({ error: quotaCheck.code, message: quotaCheck.reason }, { status: 429 })
    }

    if (model) {
      const modelCheck = await checkModelAccess(user.userId, model)
      if (!modelCheck.allowed) {
        return NextResponse.json({ error: modelCheck.code, message: modelCheck.reason }, { status: 403 })
      }
    }

    if (aiService.getAvailableProviders().length === 0) {
      if (isAiDemoModeEnabled()) {
        const demo = demoRouteMetadata({ route: '/api/ai/inline-completion', capability: 'AI_INLINE_COMPLETION' })
        const suggestion = buildDemoCompletion({ prompt })
        return NextResponse.json({
          suggestion,
          text: suggestion,
          provider: AI_DEMO_PROVIDER,
          model: AI_DEMO_MODEL,
          tokensUsed: 0,
          latencyMs: 0,
          ...demo,
        })
      }

      return capabilityResponse({
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        status: 503,
        message: 'AI provider not configured.',
        capability: 'AI_INLINE_COMPLETION',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: buildAiProviderSetupMetadata({ route: '/api/ai/inline-completion' }),
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
