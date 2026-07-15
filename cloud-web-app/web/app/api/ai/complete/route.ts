import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { aiService, type LLMProvider, type Message } from '@/lib/ai-service'
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
import { consumeAiDemoUsage } from '@/lib/server/ai-demo-usage'
import { AI_INLINE_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'
import { applyProjectRulesToMessages, loadProjectRulesContext } from '@/lib/server/project-rules'
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  applyAgentHandoffContextToMessages,
  loadAgentHandoffContext,
} from '@/lib/production/agent-handoff-context'
import {
  auditByokUsage,
  byokMissingCredentialResponse,
  enforceByokProxyRateLimit,
  parseByokFromRequest,
} from '@/lib/ai/byok-request'

const logger = createComponentLogger('api.ai.complete')

/**
 * POST /api/ai/complete
 * Autocomplete endpoint (L1) aligned with AI_SYSTEM_SPEC.
 * Block 6E: BYOK header-only (never User.byokKey).
 */

const SYSTEM_PROMPT = `You are an inline code completion engine (ghost text).
Rules:
- Return ONLY the text to insert at the cursor.
- Do NOT include markdown or explanations.
- Do NOT repeat existing prefix/suffix.
- Keep it short and natural.`

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function readString(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key]
  return typeof v === 'string' ? v : undefined
}

function readNumber(body: Record<string, unknown>, key: string): number | undefined {
  const v = body[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function readProvider(body: Record<string, unknown>): LLMProvider | undefined {
  const v = body.provider
  if (v !== 'openai' && v !== 'openrouter' && v !== 'anthropic' && v !== 'google' && v !== 'groq') {
    return undefined
  }
  return v
}

function buildPrompt(input: {
  prompt?: string
  prefix?: string
  suffix?: string
  language?: string
  filepath?: string
}): string {
  if (input.prompt?.trim()) return input.prompt.trim()
  const prefix = input.prefix || ''
  const suffix = input.suffix || ''
  const meta = [
    input.language ? `language=${input.language}` : null,
    input.filepath ? `file=${input.filepath}` : null,
  ]
    .filter(Boolean)
    .join(' ')
  return `${meta ? `// ${meta}\n` : ''}${prefix}<CURSOR>${suffix}`
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'AI_COMPLETE',
      route: '/api/ai/complete',
      config: AI_INLINE_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited
    const body = asRecord(await req.json().catch(() => null))
    if (!body) {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const prompt = buildPrompt({
      prompt: readString(body, 'prompt'),
      prefix: readString(body, 'prefix'),
      suffix: readString(body, 'suffix'),
      language: readString(body, 'language'),
      filepath: readString(body, 'filepath'),
    })

    const provider = readProvider(body)
    const model = readString(body, 'model')
    const projectId = readString(body, 'projectId')
    const requestedMaxTokens = readNumber(body, 'maxTokens')
    const requestedTemperature = readNumber(body, 'temperature')
    const maxTokens = requestedMaxTokens !== undefined ? Math.max(1, Math.floor(requestedMaxTokens)) : 256
    const temperature = requestedTemperature !== undefined ? Math.min(1, Math.max(0, requestedTemperature)) : 0.1

    if (!prompt) {
      return NextResponse.json({ suggestion: '' })
    }

    const byokParsed = parseByokFromRequest(req)
    const isByok = byokParsed.active

    if (req.headers.get('x-aethel-byok-active') === '1' && !isByok) {
      return NextResponse.json(byokMissingCredentialResponse(), { status: 400 })
    }

    const rateLimitedByok = enforceByokProxyRateLimit(req, '/api/ai/complete')
    if (rateLimitedByok) return rateLimitedByok

    const userRow = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    })
    const limits = getPlanLimits(userRow?.plan || 'starter_trial')

    const estimatedTokens = Math.max(300, Math.ceil(prompt.length / 4) + 300 + maxTokens)

    if (estimatedTokens > limits.maxTokensPerRequest && !isByok) {
      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: `Request too large. Limit: ${limits.maxTokensPerRequest.toLocaleString()} tokens.`,
          maxTokensPerRequest: limits.maxTokensPerRequest,
        },
        { status: 413 },
      )
    }

    if (!isByok) {
      const quotaCheck = await checkAIQuota(user.userId, estimatedTokens)
      if (!quotaCheck.allowed) {
        return NextResponse.json({ error: quotaCheck.code, message: quotaCheck.reason }, { status: 429 })
      }
    }

    if (model && !isByok) {
      const modelCheck = await checkModelAccess(user.userId, model)
      if (!modelCheck.allowed) {
        return NextResponse.json({ error: modelCheck.code, message: modelCheck.reason }, { status: 403 })
      }
    }

    let byokKey: string | undefined
    if (byokParsed.active) {
      byokKey = byokParsed.apiKey
      auditByokUsage({
        userId: user.userId,
        route: '/api/ai/complete',
        modelId: model,
        estimatedTokens,
        provider: byokParsed.provider,
      })
    }

    if (aiService.getAvailableProviders().length === 0 && !byokKey) {
      const blocked = blockIfSimulationDisabled({
        capability: 'AI_COMPLETE',
        reason: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'AI provider not configured. Configure a real provider to run completion.',
        missingEnv: ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
      })
      if (blocked) return blocked
      if (isAiDemoModeEnabled()) {
        const demoUsage = await consumeAiDemoUsage({
          userId: user.userId,
          route: '/api/ai/complete',
        })
        if (!demoUsage.allowed) {
          return capabilityResponse({
            error: 'AI_DEMO_LIMIT_REACHED',
            status: 429,
            message: 'AI demo daily limit reached for this user.',
            capability: 'AI_COMPLETE',
            capabilityStatus: 'PARTIAL',
            milestone: 'P0',
            metadata: {
              ...buildAiProviderSetupMetadata({ route: '/api/ai/complete' }),
              demoMode: true,
              demoLimit: demoUsage.limit,
              demoUsed: demoUsage.used,
              demoRemaining: demoUsage.remaining,
              demoResetAt: demoUsage.resetAt,
            },
          })
        }
        const demo = demoRouteMetadata({ route: '/api/ai/complete', capability: 'AI_COMPLETE' })
        const suggestion = buildDemoCompletion({
          prompt: readString(body, 'prompt'),
          prefix: readString(body, 'prefix'),
          language: readString(body, 'language'),
        })
        return NextResponse.json({
          suggestion,
          text: suggestion,
          provider: AI_DEMO_PROVIDER,
          model: AI_DEMO_MODEL,
          tokensUsed: 0,
          latencyMs: 0,
          demoRemaining: demoUsage.remaining,
          demoLimit: demoUsage.limit,
          demoResetAt: demoUsage.resetAt,
          ...demo,
        })
      }

      return capabilityResponse({
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        status: 503,
        message: 'AI provider not configured.',
        capability: 'AI_COMPLETE',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: buildAiProviderSetupMetadata({ route: '/api/ai/complete' }),
      })
    }

    const projectRulesContext = await loadProjectRulesContext({ userId: user.userId, projectId })
    const baseMessages: Message[] = applyProjectRulesToMessages<Message>(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      projectRulesContext,
    )
    const agentHandoff = await loadAgentHandoffContext({
      userId: user.userId,
      projectId,
      routeKind: 'completion',
      requestedAgent: readString(body, 'agent'),
      promptText: prompt,
      filePath: readString(body, 'filepath'),
    })
    const messages = applyAgentHandoffContextToMessages(baseMessages, agentHandoff.context)

    const response = await aiService.chat({
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      userId: user.userId,
      isBYOK: isByok,
      apiKeyOverride: byokKey,
    })

    if (!isByok) {
      recordTokenUsage(user.userId, response.tokensUsed).catch(() => {})
    }

    const suggestion = String(response.content || '')
    return NextResponse.json({
      suggestion,
      text: suggestion,
      provider: response.provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
      billingMode: isByok ? 'byok' : 'platform',
    })
  } catch (error) {
    logger.error('Complete error', error)
    return NextResponse.json(
      {
        error: 'AI_ERROR',
        message: error instanceof Error ? error.message : 'Completion failed',
      },
      { status: 500 },
    )
  }
}
