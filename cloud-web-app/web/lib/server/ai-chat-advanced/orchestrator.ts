import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import type { ToolResult } from '@/lib/ai-tools-registry'
import { AGENTS } from '@/lib/ai-agent-system'
import { checkAIQuota, checkModelAccess, checkFeatureAccess, getPlanLimits } from '@/lib/plan-limits'
import { getPlanById } from '@/lib/plans'
import { beginChatSpendSession, type ChatSpendSession } from '@/lib/ai/chat-spend-session'
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
import {
  handleAgentExecutorStream,
  handleAgentRequest,
  handleStreamingResponse,
} from './agent-and-streaming'
import { handleApexCoordinatorStream } from './apex-coordinator-stream'
import type { AdvancedChatRequest, ChatMessage, ChatResponse } from './types'
import { runApexCodeMission, estimateMoASpendTokens } from '@/lib/production/apex-mission-orchestrator'
import { buildNexusMissionUiPayload } from '@/lib/production/nexus-mission-ui'
import { buildApexMissionEvidenceLedger } from '@/lib/production/apex-mission-evidence'
import { persistGovernedTaskEvidence } from '@/lib/server/ai-change-apply/persist-governed-evidence'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  createMemoryFusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import { adaptiveMoAWidth } from '@/lib/ai/fusion-specialist-registry'
import { buildArchitectureContextSpine } from '@/lib/production/architecture-context-spine'

const logger = createComponentLogger('server.ai-chat-advanced.orchestrator')

export async function handleAdvancedChatRequest(params: {
  userId: string
  body: AdvancedChatRequest
  abortSignal?: AbortSignal
  /** Block 6E — header-derived BYOK (never DB byokKey) */
  byok?: boolean
  byokProvider?: string
  byokApiKey?: string
}): Promise<NextResponse> {
  const { userId, body, abortSignal, byok = false, byokProvider, byokApiKey } = params
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
    enableApexMoA: enableApexMoARaw = false,
    apexTargetFilePath,
    apexRiskScore,
  } = body

  const model = normalizeModelName(rawModel)
  const qualityMode: 'standard' | 'delivery' | 'studio' =
    rawQualityMode === 'standard' || rawQualityMode === 'delivery' || rawQualityMode === 'studio'
      ? rawQualityMode
      : 'studio'

  // J.2 — multi-agent console runs Nexus MoA (width still plan-gated inside orchestrator)
  const enableApexMoA =
    enableApexMoARaw === true ||
    (typeof requestedAgentCount === 'number' && requestedAgentCount >= 2)

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
  const riskForMoA = typeof apexRiskScore === 'number' ? apexRiskScore : 55
  const estimatedTokens = enableApexMoA
    ? estimateMoASpendTokens({
        width: adaptiveMoAWidth(riskForMoA, String(userPlan?.plan || 'free').replace(/_trial$/, '')),
        peripheralCount: riskForMoA >= 70 ? 1 : 0,
      })
    : estimatedTokensPerRole * agentCount

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

  const quotaCheck = byok
    ? { allowed: true as const, code: undefined as string | undefined, reason: undefined as string | undefined }
    : await checkAIQuota(userId, estimatedTokens, model)
  if (!quotaCheck.allowed && quotaCheck.code !== 'PREMIUM_POOL_EXHAUSTED') {
    return NextResponse.json(
      { error: quotaCheck.code || 'QUOTA_EXCEEDED', message: quotaCheck.reason || 'AI quota exceeded' },
      { status: quotaCheck.code === 'ULTRA_REQUIRES_WALLET' ? 402 : 429 },
    )
  }

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })
  const planDef = getPlanById(String(userRow?.plan || 'free').replace(/_trial$/, '')) || getPlanById('free')!
  let spendSession: ChatSpendSession | null = null

  if (!agentId || !AGENTS[agentId]) {
    const spend = await beginChatSpendSession({
      userId,
      planId: planDef.id,
      planLimits: planDef.limits,
      modelId: model,
      estimatedRawTokens: estimatedTokens,
      byok,
      operationType: 'chat_advanced',
    })
    if (!spend.ok) return spend.response
    spendSession = spend.session
  }

  if (agentCount > 1) {
    const agentsFeature = await checkFeatureAccess(userId, 'agents')
    if (!agentsFeature.allowed) {
      if (spendSession) await spendSession.cancel().catch(() => {})
      return NextResponse.json(
        { error: agentsFeature.code || 'FEATURE_NOT_ALLOWED', message: agentsFeature.reason || 'Agents not available in your plan' },
        { status: 403 }
      )
    }

    if (agentCount > limits.maxAgents) {
      if (spendSession) await spendSession.cancel().catch(() => {})
      return NextResponse.json(
        {
          error: 'AGENTS_LIMIT_EXCEEDED',
          message: `Your plan allows at most ${limits.maxAgents} agent(s).`,
          maxAgents: limits.maxAgents,
        },
        { status: 403 }
      )
    }
    // R19 — multi-agent stream is Apex coordinator SSE (status + final), not STREAM_NOT_SUPPORTED_*.
  }

  if (agentCount <= 1) {
    const modelAccess = await checkModelAccess(userId, model)
    if (!modelAccess.allowed) {
      if (spendSession) await spendSession.cancel().catch(() => {})
      return NextResponse.json(
        { error: modelAccess.reason || `Model ${model} not available` },
        { status: 403 }
      )
    }

    const missingProvider = getMissingProviderForModel(model, availableProviders)
    if (missingProvider) {
      if (spendSession) await spendSession.cancel().catch(() => {})
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
        if (spendSession) await spendSession.cancel().catch(() => {})
        return NextResponse.json(
          { error: access.code || 'MODEL_NOT_ALLOWED', message: access.reason || `Model ${item.model} not available`, role: item.role },
          { status: 403 }
        )
      }

      const missingProvider = getMissingProviderForModel(item.model, availableProviders)
      if (missingProvider) {
        if (spendSession) await spendSession.cancel().catch(() => {})
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
      if (spendSession) await spendSession.cancel().catch(() => {})
      return NextResponse.json(
        { error: agentsFeature.code || 'FEATURE_NOT_ALLOWED', message: agentsFeature.reason || 'Agents not available in your plan' },
        { status: 403 }
      )
    }
    // R19 — agentId stream = AgentExecutor SSE (status + ANSWER chatStream deltas).
    if (stream) {
      return handleAgentExecutorStream({
        userId,
        agentId,
        messages,
        projectId,
        includeTrace,
        byok,
        byokApiKey,
        abortSignal,
      })
    }
    return handleAgentRequest(userId, agentId, messages, projectId, includeTrace, byok, byokApiKey)
  }

  const {
    lastUserMessage,
    mentionContext,
    webBenchmark,
    contextMemoryPlan,
    deepContextPack,
    enhancedSystemMessage,
    historyContext,
  } = await buildAdvancedChatContext({
    userId,
    projectId,
    messages,
    qualityMode,
    enableWebResearch,
    model,
  })

  if (enableApexMoA === true) {
    if (!spendSession) {
      return NextResponse.json(
        { error: 'SPEND_SESSION_REQUIRED', message: 'Apex MoA requires an active spend session.' },
        { status: 500 },
      )
    }

    const targetPath = String(apexTargetFilePath || 'mission/candidate.ts').replace(/\\/g, '/')

    // R19 — coordinator SSE: status/cell events + final_complete answer (not per-agent token fan-in).
    if (stream) {
      return handleApexCoordinatorStream({
        userId,
        planId: planDef.id,
        model,
        lastUserMessage,
        enhancedSystemMessage,
        projectId,
        targetFilePath: targetPath,
        riskScore: riskForMoA,
        enableLlmFuse: planDef.id !== 'free',
        spendSession,
        traceId,
        abortSignal,
      })
    }

    try {
      let spinePrompt = enhancedSystemMessage
      let spineIds: {
        lawsPackId?: string
        contextPackId?: string
        projectMemoryDigestId?: string
        cartographyManifestId?: string
      } = {}

      if (projectId) {
        try {
          const spine = await buildArchitectureContextSpine({
            userId,
            projectId,
            query: lastUserMessage,
            mode: 'mixed',
            tokenBudget: 2500,
          })
          spinePrompt = `${enhancedSystemMessage}\n${spine.promptSection}`
          spineIds = {
            lawsPackId: spine.lawsPackId,
            contextPackId: spine.contextPackId,
            projectMemoryDigestId: spine.projectMemoryDigestId,
            cartographyManifestId: spine.cartographyManifestId,
          }
        } catch (spineError) {
          logger.warn('architecture_spine_failed_continuing', spineError)
        }
      }

      const mission = await runApexCodeMission({
        userId,
        planId: planDef.id,
        maestroModelId: model,
        userPrompt: lastUserMessage,
        systemPrompt: spinePrompt,
        targetFilePath: targetPath,
        allowedPaths: [targetPath],
        riskScore: riskForMoA,
        enableLlmFuse: planDef.id !== 'free',
        lawsPackId: spineIds.lawsPackId,
        contextPackId: spineIds.contextPackId,
        projectMemoryDigestId: spineIds.projectMemoryDigestId,
      })

      // Trava II — open fusion tx around mission receipt (manifest scope snapshot).
      // Server isolate store ≠ client Yjs — emit portable fusionHandoffJson for Ctrl+Z.
      let fusionMeta:
        | {
            fusionTransactionId: string
            snapshotHashBefore: string
            snapshotHashAfter?: string
            fusionHandoffJson?: string
          }
        | undefined
      if (projectId) {
        try {
          const store = createMemoryFusionScopeStore()
          store.applySnapshot(
            projectId,
            'manifest',
            JSON.stringify({ missionId: mission.missionId, patch: null }),
          )
          const tx = await beginCreativeFusionTransaction({
            projectId,
            yDocScope: 'manifest',
            store,
          })
          store.applySnapshot(
            projectId,
            'manifest',
            JSON.stringify({
              missionId: mission.missionId,
              patch: mission.supremePatch ?? null,
              verdict: mission.verdict,
            }),
          )
          if (mission.verdict === 'APPLY') {
            const committed = await commitCreativeFusionTransaction(tx.id, store)
            const { buildFusionTxClientHandoff, serializeFusionTxClientHandoff } = await import(
              '@/lib/production/fusion-tx-client-handoff'
            )
            fusionMeta = {
              fusionTransactionId: tx.id,
              snapshotHashBefore: tx.snapshotHashBefore,
              snapshotHashAfter: committed.snapshotHashAfter,
              fusionHandoffJson: serializeFusionTxClientHandoff(
                buildFusionTxClientHandoff(committed.record),
              ),
            }
          } else {
            const { abortCreativeFusionTransaction } = await import(
              '@/lib/production/creative-fusion-transaction'
            )
            await abortCreativeFusionTransaction(tx.id, store)
            fusionMeta = {
              fusionTransactionId: tx.id,
              snapshotHashBefore: tx.snapshotHashBefore,
            }
          }
        } catch (fusionError) {
          logger.warn('fusion_tx_mission_wrap_failed', fusionError)
        }
      }

      const nexus = buildNexusMissionUiPayload(mission, mission.phases, fusionMeta)
      const evidenceLedger = buildApexMissionEvidenceLedger({
        mission,
        projectId: projectId || 'session',
        nexus,
      })
      if (projectId) {
        void persistGovernedTaskEvidence({
          userId,
          projectId,
          ledger: evidenceLedger,
        })
      }

      if (mission.verdict === 'APPLY' && mission.supremePatch) {
        await spendSession.settle(mission.estimatedSpendTokens)
        const chatResponse: ChatResponse = {
          message: {
            role: 'assistant',
            content: mission.supremePatch,
          },
          tokensUsed: mission.estimatedSpendTokens,
          traceId,
          agentExecution: {
            steps: mission.cells.length,
            artifacts: 1,
          },
        }
        return NextResponse.json({
          ...chatResponse,
          apexMission: {
            missionId: mission.missionId,
            verdict: mission.verdict,
            liveProvider: true,
            generatorWidths: mission.cells.map((c) => c.moa.generatorWidth),
            healRounds: mission.cells.map((c) => c.heal?.turns.length ?? 0),
            trivialBypass: mission.plan.trivialBypass,
            architectureSpine: spineIds,
            nexus,
            evidenceLedger,
            undoHint:
              fusionMeta != null
                ? {
                    transactionId: fusionMeta.fusionTransactionId,
                    message:
                      'Ctrl+Z / Cmd+Z reverts this AI edit atomically via CreativeFusionTransaction (Trava II).',
                    fusionHandoffJson: fusionMeta.fusionHandoffJson,
                  }
                : undefined,
          },
          headersEcho: spendSession.headers,
        })
      }

      await spendSession.settleZero()
      return NextResponse.json(
        {
          error: 'APEX_MISSION_BLOCKED',
          message: mission.reason || 'Apex MoA mission did not produce an APPLY candidate.',
          // J.2 — never paint L.5 FAIL as success
          success: false,
          apexMission: {
            missionId: mission.missionId,
            verdict: mission.verdict,
            liveProvider: true,
            cells: mission.cells.map((c) => ({
              taskId: c.taskId,
              role: c.role,
              moaVerdict: c.moa.verdict,
              healVerdict: c.heal?.verdict,
            })),
            nexus,
            evidenceLedger,
          },
        },
        { status: 422 },
      )
    } catch (error) {
      await spendSession.cancel().catch(() => {})
      logger.error('apex_mission_failed', error)
      return NextResponse.json(
        {
          error: 'APEX_MISSION_FAILED',
          message: error instanceof Error ? error.message : 'Apex MoA mission failed',
        },
        { status: 500 },
      )
    }
  }

  if (stream) {
    if (spendSession) await spendSession.cancel().catch(() => {})
    return handleStreamingResponse(
      userId,
      enhancedSystemMessage,
      messages,
      model,
      traceId,
      estimatedTokens,
      abortSignal,
      byok,
      byokApiKey,
    )
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
      isBYOK: byok,
      apiKeyOverride: byokApiKey,
      userId,
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
      isBYOK: byok,
      apiKeyOverride: byokApiKey,
      userId,
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
        isBYOK: byok,
        apiKeyOverride: byokApiKey,
        userId,
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

    if (spendSession) {
      await spendSession.settle(totalTokens)
      spendSession = null
    }

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
              ...(deepContextPack
                ? ([
                    {
                      kind: 'context',
                      label: `deepContextPack=${deepContextPack.status}/${deepContextPack.mode}`,
                      detail: `cache=${deepContextPack.cacheKey}; selected=${deepContextPack.selectedItems.length}; held=${deepContextPack.heldItems.length}; tokens=${deepContextPack.selectedTokens}/${deepContextPack.contextBudgetTokens}; next=${deepContextPack.nextAction}`,
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
    isBYOK: byok,
    apiKeyOverride: byokApiKey,
    userId,
  })

  totalTokens = result.tokensUsed
  response = {
    role: 'assistant',
    content: result.content,
  }

  if (spendSession) {
    await spendSession.settle(totalTokens)
    spendSession = null
  }

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
            ...(deepContextPack
              ? ([
                  {
                    kind: 'context',
                    label: `deepContextPack=${deepContextPack.status}/${deepContextPack.mode}`,
                    detail: `cache=${deepContextPack.cacheKey}; selected=${deepContextPack.selectedItems.length}; held=${deepContextPack.heldItems.length}; tokens=${deepContextPack.selectedTokens}/${deepContextPack.contextBudgetTokens}; next=${deepContextPack.nextAction}`,
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
