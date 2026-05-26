import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import type { ToolResult } from '@/lib/ai-tools-registry'
import { AGENTS } from '@/lib/ai-agent-system'
import { checkAIQuota, recordTokenUsage, checkModelAccess, checkFeatureAccess, getPlanLimits } from '@/lib/plan-limits'
import { prisma } from '@/lib/prisma'
import { createAITraceId } from '@/lib/ai-internal-trace'
import { persistAITrace } from '@/lib/ai-trace-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { buildAiProviderSetupMetadata } from '@/lib/capability-constants'
import {
  AI_DEMO_MODEL,
  AI_DEMO_PROVIDER,
  buildDemoChatContent,
  demoRouteMetadata,
  isAiDemoModeEnabled,
} from '@/lib/server/ai-demo-mode'
import { consumeAiDemoUsage } from '@/lib/server/ai-demo-usage'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard'
import { MAX_ROLE_CONTEXT_CHARS } from '@/lib/server/advanced-chat-policy'
import { createComponentLogger } from '@/lib/observability/logger'
import { buildAdvancedChatContext } from './context'
import {
  clampAgentCount,
  clampText,
  getMissingProviderForModel,
  inferProviderFromModel,
  normalizeModelName,
  summarizeCritic,
} from './model-policy'
import { handleAgentRequest, handleStreamingResponse } from './agent-and-streaming'
import type { AdvancedChatRequest, ChatMessage, ChatResponse } from './types'

const logger = createComponentLogger('server.ai-chat-advanced.orchestrator')

export async function handleAdvancedChatRequest(params: {
  userId: string
  body: AdvancedChatRequest
}): Promise<NextResponse> {
  const { userId, body } = params
  const {
    messages,
    projectId,
    agentId,
    model: rawModel = DEFAULT_OPENROUTER_MODEL_ID,
    qualityMode: rawQualityMode = 'studio',
    enableWebResearch = true,
    agentCount: requestedAgentCount = 1,
    roleModels,
    stream = false,
    includeTrace = false,
  } = body

  const model = normalizeModelName(rawModel)
  const qualityMode: 'standard' | 'delivery' | 'studio' =
    rawQualityMode === 'standard' || rawQualityMode === 'delivery' || rawQualityMode === 'studio'
      ? rawQualityMode
      : 'studio'

  const traceId = createAITraceId()
  const availableProviders = aiService.getAvailableProviders()

  if (availableProviders.length === 0) {
    const blocked = blockIfSimulationDisabled({
      capability: 'AI_CHAT_ADVANCED',
      reason: 'AI_PROVIDER_NOT_CONFIGURED',
      message: 'AI provider not configured. Configure a real provider to run advanced chat.',
      missingEnv: ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
    })
    if (blocked) return blocked

    if (isAiDemoModeEnabled()) {
      const demoUsage = await consumeAiDemoUsage({
        userId,
        route: '/api/ai/chat-advanced',
      })
      if (!demoUsage.allowed) {
        return capabilityResponse({
          error: 'AI_DEMO_LIMIT_REACHED',
          status: 429,
          message: 'AI demo daily limit reached for this user.',
          capability: 'AI_CHAT_ADVANCED',
          capabilityStatus: 'PARTIAL',
          milestone: 'P0',
          metadata: {
            ...buildAiProviderSetupMetadata({ route: '/api/ai/chat-advanced' }),
            demoMode: true,
            demoLimit: demoUsage.limit,
            demoUsed: demoUsage.used,
            demoRemaining: demoUsage.remaining,
            demoResetAt: demoUsage.resetAt,
          },
        })
      }
      const demo = demoRouteMetadata({ route: '/api/ai/chat-advanced', capability: 'AI_CHAT_ADVANCED' })
      const demoMessage = buildDemoChatContent({ messages })
      return NextResponse.json({
        message: { role: 'assistant', content: demoMessage },
        tokensUsed: 0,
        toolsExecuted: [],
        traceId,
        traceSummary: {
          traceId,
          summary: 'Demo mode response generated because no real AI provider is configured.',
          telemetry: {
            provider: AI_DEMO_PROVIDER,
            model: AI_DEMO_MODEL,
            tokensUsed: 0,
            latencyMs: 0,
          },
        },
        provider: AI_DEMO_PROVIDER,
        model: AI_DEMO_MODEL,
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
      capability: 'AI_CHAT_ADVANCED',
      capabilityStatus: 'PARTIAL',
      milestone: 'P0',
      metadata: buildAiProviderSetupMetadata({
        mode: 'advanced-chat',
        requestedModel: model,
        route: '/api/ai/chat-advanced',
      }),
    })
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }

  const userPlan = await prisma.user.findFirst({ where: { id: userId }, select: { plan: true } })
  const limits = getPlanLimits(userPlan?.plan || 'starter_trial')
  const rawChars = messages.map((message) => String(message.content || '')).join('\n').length
  const estimatedTokensPerRole = Math.max(800, Math.ceil(rawChars / 4) + 800)
  const agentCount = clampAgentCount(requestedAgentCount)
  const estimatedTokens = estimatedTokensPerRole * agentCount

  if (estimatedTokens > limits.maxTokensPerRequest) {
    return NextResponse.json(
      {
        error: 'REQUEST_TOO_LARGE',
        message: `Request muito grande para o seu plano. Limite estimado: ${limits.maxTokensPerRequest.toLocaleString()} tokens por mensagem.`,
        maxTokensPerRequest: limits.maxTokensPerRequest,
      },
      { status: 413 }
    )
  }

  const quotaCheck = await checkAIQuota(userId, estimatedTokens)
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { error: quotaCheck.reason || 'AI quota exceeded' },
      { status: 429 }
    )
  }

  if (agentCount > 1) {
    const agentsFeature = await checkFeatureAccess(userId, 'agents')
    if (!agentsFeature.allowed) {
      return NextResponse.json(
        { error: agentsFeature.code || 'FEATURE_NOT_ALLOWED', message: agentsFeature.reason || 'Agents not available in your plan' },
        { status: 403 }
      )
    }

    if (agentCount > limits.maxAgents) {
      return NextResponse.json(
        {
          error: 'AGENTS_LIMIT_EXCEEDED',
          message: `Your plan allows at most ${limits.maxAgents} agent(s).`,
          maxAgents: limits.maxAgents,
        },
        { status: 403 }
      )
    }

    if (stream) {
      return NextResponse.json(
        { error: 'STREAM_NOT_SUPPORTED_FOR_MULTI_ROLE', message: 'Streaming is not supported in multi-role mode yet.' },
        { status: 400 }
      )
    }
  }

  if (agentCount <= 1) {
    const modelAccess = await checkModelAccess(userId, model)
    if (!modelAccess.allowed) {
      return NextResponse.json(
        { error: modelAccess.reason || `Model ${model} not available` },
        { status: 403 }
      )
    }

    const missingProvider = getMissingProviderForModel(model, availableProviders)
    if (missingProvider) {
      return capabilityResponse({
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        status: 503,
        message: `Provider ${missingProvider} not configured for model ${model}.`,
        capability: 'AI_PROVIDER_CONFIG',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: buildAiProviderSetupMetadata({
          requestedModel: model,
          expectedProvider: missingProvider,
          availableProviders,
          route: '/api/ai/chat-advanced',
        }),
      })
    }
  } else {
    const architectModel = normalizeModelName((roleModels?.architect || model).trim())
    const engineerModel = normalizeModelName((roleModels?.engineer || model).trim())
    const criticModel = normalizeModelName((roleModels?.critic || model).trim())

    const needed: Array<{ role: 'architect' | 'engineer' | 'critic'; model: string }> = [
      { role: 'architect', model: architectModel },
      { role: 'engineer', model: engineerModel },
    ]
    if (agentCount === 3) needed.push({ role: 'critic', model: criticModel })

    for (const item of needed) {
      const access = await checkModelAccess(userId, item.model)
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.code || 'MODEL_NOT_ALLOWED', message: access.reason || `Model ${item.model} not available`, role: item.role },
          { status: 403 }
        )
      }

      const missingProvider = getMissingProviderForModel(item.model, availableProviders)
      if (missingProvider) {
        return capabilityResponse({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          status: 503,
          message: `Provider ${missingProvider} not configured for role ${item.role}.`,
          capability: 'AI_PROVIDER_CONFIG',
          capabilityStatus: 'PARTIAL',
          milestone: 'P0',
          metadata: buildAiProviderSetupMetadata({
            role: item.role,
            requestedModel: item.model,
            expectedProvider: missingProvider,
            availableProviders,
            route: '/api/ai/chat-advanced',
          }),
        })
      }
    }
  }

  if (agentId && AGENTS[agentId]) {
    const agentsFeature = await checkFeatureAccess(userId, 'agents')
    if (!agentsFeature.allowed) {
      return NextResponse.json(
        { error: agentsFeature.code || 'FEATURE_NOT_ALLOWED', message: agentsFeature.reason || 'Agents not available in your plan' },
        { status: 403 }
      )
    }
    return handleAgentRequest(userId, agentId, messages, projectId, includeTrace)
  }

  const {
    lastUserMessage,
    mentionContext,
    webBenchmark,
    contextMemoryPlan,
    enhancedSystemMessage,
    historyContext,
  } = await buildAdvancedChatContext({
    userId,
    projectId,
    messages,
    qualityMode,
    enableWebResearch,
  })

  if (stream) {
    return handleStreamingResponse(userId, enhancedSystemMessage, messages, model, traceId, estimatedTokens)
  }

  let response: ChatMessage
  let totalTokens = 0
  const toolsExecuted: { name: string; result: ToolResult }[] = []

  if (agentCount > 1) {
    const architectModel = normalizeModelName((roleModels?.architect || model).trim())
    const engineerModel = normalizeModelName((roleModels?.engineer || model).trim())
    const criticModel = normalizeModelName((roleModels?.critic || model).trim())
    const architectContext = historyContext || undefined

    const architectResult = await aiService.query(lastUserMessage, architectContext, {
      model: architectModel,
      provider: inferProviderFromModel(architectModel),
      systemPrompt: `${enhancedSystemMessage}

ROLE: ARCHITECT
Deliver only:
- objective plan (max 6 bullets)
- risks (max 3)
- acceptance criteria (max 3)
- open questions (max 2, only if required)
Do not write code and do not answer as the final user-facing response.`,
    })

    const architectSnippet = clampText(architectResult.content, 2000)
    const engineerContext = clampText(
      `${historyContext || ''}

=== Architect (internal) ===
${architectSnippet}`,
      MAX_ROLE_CONTEXT_CHARS
    )
    const engineerResult = await aiService.query(lastUserMessage, engineerContext, {
      model: engineerModel,
      provider: inferProviderFromModel(engineerModel),
      systemPrompt: `${enhancedSystemMessage}

ROLE: ENGINEER
You are the execution engineer. Deliver the final answer for the user's request.
Rules:
- use the Architect plan as private guidance without repeating it fully;
- produce a final answer with actionable steps and minimum validation;
- if there is a real limitation, state it and propose a practical workaround.`,
    })

    totalTokens = (architectResult.tokensUsed || 0) + (engineerResult.tokensUsed || 0)
    let finalContent = engineerResult.content
    let criticTokensUsed = 0
    let criticLatencyMs: number | undefined
    let criticSummary: { verdict?: string; bullets?: string[]; raw?: string } | null = null

    if (agentCount === 3) {
      const criticContext = clampText(
        `${historyContext || ''}

=== Architect (internal) ===
${architectSnippet}

=== Engineer response (internal) ===
${clampText(engineerResult.content, 2000)}`,
        MAX_ROLE_CONTEXT_CHARS
      )
      const criticResult = await aiService.query(lastUserMessage, criticContext, {
        model: criticModel,
        provider: inferProviderFromModel(criticModel),
        systemPrompt: `${enhancedSystemMessage}

ROLE: CRITIC
You are QA Critic. Do not rewrite the full response.
Return only:
VEREDITO: PASS|WARN|FAIL
- 1 to 3 risks or minimal fixes
No endless debate.`,
      })
      criticTokensUsed = criticResult.tokensUsed || 0
      criticLatencyMs = criticResult.latencyMs || undefined
      totalTokens += criticTokensUsed
      criticSummary = summarizeCritic(criticResult.content)
      if (criticSummary?.verdict && (criticSummary.bullets?.length || 0) > 0) {
        finalContent = `${finalContent}

Critical: ${criticSummary.verdict} ${criticSummary.bullets?.slice(0, 3).join(' ')}`
      }
    }

    response = { role: 'assistant', content: finalContent }
    await recordTokenUsage(userId, totalTokens)

    const latencyMs = (architectResult.latencyMs || 0) + (engineerResult.latencyMs || 0)
    const chatResponse: ChatResponse = {
      message: response,
      tokensUsed: totalTokens,
      roleUsage: {
        architect: {
          model: architectModel,
          tokensUsed: architectResult.tokensUsed || 0,
          latencyMs: architectResult.latencyMs || undefined,
        },
        engineer: {
          model: engineerModel,
          tokensUsed: engineerResult.tokensUsed || 0,
          latencyMs: engineerResult.latencyMs || undefined,
        },
        ...(agentCount === 3
          ? {
              critic: {
                model: criticModel,
                tokensUsed: criticTokensUsed,
                latencyMs: criticLatencyMs,
              },
            }
          : {}),
      },
      toolsExecuted: toolsExecuted.length > 0 ? toolsExecuted : undefined,
      traceId: includeTrace ? traceId : undefined,
      traceSummary: includeTrace
        ? {
            traceId,
            summary: `Resposta gerada (multi-role: ${agentCount} agentes).`,
            decisionRecord: {
              decision: 'Executar Arquiteto/Engenheiro/Critical internamente e publicar uma resposta consolidada.',
              reasons: ['Separated planning', 'Focused execution', ...(agentCount === 3 ? ['Short critic review'] : [])],
            },
            evidence: [
              { kind: 'context', label: `historyContextMessages=${messages.length - 1}` },
              { kind: 'other', label: `agentCount=${agentCount}` },
              { kind: 'other', label: `qualityMode=${qualityMode}` },
              ...(mentionContext.tags.length > 0
                ? ([{ kind: 'other', label: 'mentionTags', detail: mentionContext.tags.join(', ') }] as const)
                : []),
              ...(contextMemoryPlan
                ? ([
                    {
                      kind: 'context',
                      label: `contextMemory=${contextMemoryPlan.status}/${contextMemoryPlan.compressionLane}`,
                      detail: `planned=${contextMemoryPlan.plannedInputTokens}/${contextMemoryPlan.usableInputTokens}; uiThread=${contextMemoryPlan.canUseUiThread ? 'yes' : 'no'}; next=${contextMemoryPlan.nextAction}`,
                    },
                  ] as const)
                : []),
              { kind: 'other', label: 'models', detail: `architect=${architectModel}; engineer=${engineerModel}${agentCount === 3 ? `; critic=${criticModel}` : ''}` },
              { kind: 'other', label: 'architectOutput', detail: clampText(architectResult.content, 800) },
              ...(webBenchmark.evidence.map((ref) => ({
                kind: 'search' as const,
                label: ref.title,
                detail: ref.url,
              }))),
              ...(agentCount === 3 && criticSummary?.raw
                ? ([{ kind: 'other', label: 'criticOutput', detail: clampText(criticSummary.raw, 800) }] as const)
                : []),
            ],
            telemetry: {
              model: engineerModel,
              provider: inferProviderFromModel(engineerModel),
              estimatedTokens,
              tokensUsed: totalTokens,
              latencyMs: latencyMs || undefined,
            },
          }
        : undefined,
    }

    if (includeTrace && chatResponse.traceSummary) {
      persistAITrace({
        userId,
        trace: chatResponse.traceSummary,
        kind: 'chat',
        projectId,
      }).catch((err) => logger.warn('Failed to persist multi-role chat trace', err, { traceId, projectId }))
    }

    return NextResponse.json(chatResponse)
  }

  const result = await aiService.query(lastUserMessage, historyContext || undefined, {
    model,
    provider: inferProviderFromModel(model),
    systemPrompt: enhancedSystemMessage,
  })

  totalTokens = result.tokensUsed
  response = {
    role: 'assistant',
    content: result.content,
  }

  await recordTokenUsage(userId, totalTokens)

  const chatResponse: ChatResponse = {
    message: response,
    tokensUsed: totalTokens,
    roleUsage: {
      engineer: {
        model,
        tokensUsed: totalTokens,
        latencyMs: result.latencyMs || undefined,
      },
    },
    toolsExecuted: toolsExecuted.length > 0 ? toolsExecuted : undefined,
    traceId: includeTrace ? traceId : undefined,
    traceSummary: includeTrace
      ? {
          traceId,
          summary: 'Resposta gerada (modo chat).',
          decisionRecord: {
            decision: 'Respond to the user based on history and project context.',
          },
          evidence: [
            {
              kind: 'context',
              label: `historyContextMessages=${messages.length - 1}`,
            },
            ...(projectId
              ? ([
                  {
                    kind: 'context',
                    label: 'projectContext',
                    detail: `projectId=${projectId}`,
                  },
                ] as const)
              : []),
            { kind: 'other', label: `qualityMode=${qualityMode}` },
            ...(mentionContext.tags.length > 0
              ? ([{ kind: 'other', label: 'mentionTags', detail: mentionContext.tags.join(', ') }] as const)
              : []),
            ...(contextMemoryPlan
              ? ([
                  {
                    kind: 'context',
                    label: `contextMemory=${contextMemoryPlan.status}/${contextMemoryPlan.compressionLane}`,
                    detail: `planned=${contextMemoryPlan.plannedInputTokens}/${contextMemoryPlan.usableInputTokens}; uiThread=${contextMemoryPlan.canUseUiThread ? 'yes' : 'no'}; next=${contextMemoryPlan.nextAction}`,
                  },
                ] as const)
              : []),
            ...(webBenchmark.evidence.map((ref) => ({
              kind: 'search' as const,
              label: ref.title,
              detail: ref.url,
            }))),
          ],
          toolRuns: toolsExecuted.map((tool) => ({ toolName: tool.name, status: 'ok' })),
          telemetry: {
            model,
            provider: inferProviderFromModel(model),
            estimatedTokens,
            tokensUsed: totalTokens,
            latencyMs: result.latencyMs || undefined,
          },
        }
      : undefined,
  }

  if (includeTrace && chatResponse.traceSummary) {
    persistAITrace({
      userId,
      trace: chatResponse.traceSummary,
      kind: 'chat',
      projectId,
    }).catch((err) => logger.warn('Failed to persist chat trace', err, { traceId, projectId }))
  }

  return NextResponse.json(chatResponse)
}
