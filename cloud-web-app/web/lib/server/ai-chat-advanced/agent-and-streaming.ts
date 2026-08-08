import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import { AgentExecutor } from '@/lib/ai-agent-system'
import { getPlanById } from '@/lib/plans'
import { prisma } from '@/lib/prisma'
import { beginChatSpendSession, type ChatSpendSession } from '@/lib/ai/chat-spend-session'
import { createAITraceId, type AITraceSummary } from '@/lib/ai-internal-trace'
import { persistAITrace } from '@/lib/ai-trace-store'
import { loadProjectRulesContext } from '@/lib/server/project-rules'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ChatMessage } from './types'

const logger = createComponentLogger('server.ai-chat-advanced.agent-streaming')

async function resolvePlanLimits(userId: string, byokOverride?: boolean) {
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })
  const planDef =
    getPlanById(String(userRow?.plan || 'free').replace(/_trial$/, '')) || getPlanById('free')!
  return {
    planDef,
    byok: Boolean(byokOverride),
  }
}

function buildAgentTask(
  userId: string,
  messages: ChatMessage[],
  projectId: string | undefined,
  projectRulesContext: string | null,
) {
  const lastMessage = messages[messages.length - 1]
  return {
    id: `task-${Date.now()}`,
    description: projectRulesContext
      ? `${lastMessage.content}

${projectRulesContext}`
      : lastMessage.content,
    context:
      [projectId ? `Project ID: ${projectId}` : null, projectRulesContext || null]
        .filter(Boolean)
        .join('\n\n') || undefined,
    executionContext: {
      userId,
      projectId,
      enforceAgentScope: Boolean(projectId),
    },
  }
}

function buildAgentTraceSummary(params: {
  traceId: string
  agentId: string
  steps: Array<{
    action?: { tool?: string }
    observation?: string
    result?: { success?: boolean }
  }>
  artifactsCount: number
  estimatedTokens: number
  projectId?: string
}): AITraceSummary {
  const { traceId, agentId, steps, artifactsCount, estimatedTokens, projectId } = params
  return {
    traceId,
    summary: `AgentExecutor response (agent: ${agentId}).`,
    decisionRecord: {
      decision: 'Execute via AgentExecutor; stream ANSWER: deltas when stream=true.',
    },
    evidence: [
      {
        kind: 'tool',
        label: 'AgentExecutor.execute',
        detail: `steps=${steps.length}; artifacts=${artifactsCount}`,
      },
      ...steps
        .filter((step) => step.action?.tool)
        .slice(0, 20)
        .map((step) => ({
          kind: 'tool' as const,
          label: String(step.action?.tool),
          detail: (step.observation || '').slice(0, 280),
        })),
      ...(projectId
        ? ([
            {
              kind: 'context' as const,
              label: 'projectContext',
              detail: `projectId=${projectId}`,
            },
          ] as const)
        : []),
    ],
    toolRuns: steps
      .filter((step) => step.action?.tool)
      .slice(0, 25)
      .map((step) => ({
        toolName: String(step.action?.tool),
        status: step.result?.success ? 'ok' : 'error',
      })),
    telemetry: {
      estimatedTokens,
      tokensUsed: estimatedTokens,
    },
  }
}

export async function handleAgentRequest(
  userId: string,
  agentId: string,
  messages: ChatMessage[],
  projectId: string | undefined,
  includeTrace: boolean,
  byok = false,
  byokApiKey?: string,
): Promise<NextResponse> {
  void byokApiKey // AgentExecutor path uses spend BYOK skip; provider keys via tool bus later
  const { planDef, byok: isByok } = await resolvePlanLimits(userId, byok)
  const spend = await beginChatSpendSession({
    userId,
    planId: planDef.id,
    planLimits: planDef.limits,
    modelId: 'openai/gpt-4o-mini',
    estimatedRawTokens: 10_000,
    byok: isByok,
    operationType: 'chat_advanced',
  })
  if (!spend.ok) return spend.response
  const session = spend.session

  try {
    const projectRulesContext = await loadProjectRulesContext({ userId, projectId })
    const executor = new AgentExecutor(agentId)
    const execution = await executor.execute(buildAgentTask(userId, messages, projectId, projectRulesContext))

    const traceId = createAITraceId()
    const estimatedTokens = Math.max(1, execution.steps.length * 1000)
    await session.settle(estimatedTokens)

    const content = execution.finalAnswer || 'Task completed.'
    const artifactsSummary =
      execution.artifacts.length > 0
        ? `\n\nArtifacts created: ${execution.artifacts.map((artifact) => artifact.name).join(', ')}`
        : ''

    const traceSummary = buildAgentTraceSummary({
      traceId,
      agentId,
      steps: execution.steps,
      artifactsCount: execution.artifacts.length,
      estimatedTokens,
      projectId,
    })

    if (includeTrace) {
      persistAITrace({
        userId,
        kind: 'agent',
        trace: traceSummary,
        projectId,
      }).catch((err) => logger.warn('Failed to persist agent request trace', err, { traceId, projectId }))
    }

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: content + artifactsSummary,
      },
      tokensUsed: estimatedTokens,
      spendLane: session.lane,
      agentExecution: {
        steps: execution.steps.length,
        artifacts: execution.artifacts.length,
      },
      traceId: includeTrace ? traceId : undefined,
      traceSummary: includeTrace ? traceSummary : undefined,
    })
  } catch (error) {
    await session.cancel().catch(() => {})
    logger.error('Agent execution error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent execution failed' },
      { status: 500 },
    )
  }
}

/**
 * R19 — AgentExecutor (`agentId`) cancelable SSE.
 *
 * Honest contract:
 * - Emits `status` for each ReAct iteration / tool (not fake token theater).
 * - Final user-visible text streams as real `aiService.chatStream` deltas from the
 *   `ANSWER:` portion only (`tokenSource: agent_answer`).
 * - AbortSignal cancels spend + stops the executor loop.
 */
export async function handleAgentExecutorStream(params: {
  userId: string
  agentId: string
  messages: ChatMessage[]
  projectId?: string
  includeTrace: boolean
  byok?: boolean
  byokApiKey?: string
  abortSignal?: AbortSignal
}): Promise<NextResponse> {
  const {
    userId,
    agentId,
    messages,
    projectId,
    includeTrace,
    byok = false,
    byokApiKey,
    abortSignal,
  } = params
  void byokApiKey

  const encoder = new TextEncoder()
  const { planDef, byok: isByok } = await resolvePlanLimits(userId, byok)
  let activeSession: ChatSpendSession | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const spend = await beginChatSpendSession({
        userId,
        planId: planDef.id,
        planLimits: planDef.limits,
        modelId: 'openai/gpt-4o-mini',
        estimatedRawTokens: 10_000,
        byok: isByok,
        operationType: 'chat_advanced',
      })
      if (!spend.ok) {
        const body = await spend.response.json()
        enqueue({ type: 'error', error: body.error || 'SPEND_BLOCKED', ...body })
        controller.close()
        return
      }
      const session = spend.session
      activeSession = session

      const onAbort = () => {
        void session.cancel().catch(() => {})
      }
      if (abortSignal) {
        if (abortSignal.aborted) {
          await session.cancel().catch(() => {})
          controller.close()
          return
        }
        abortSignal.addEventListener('abort', onAbort, { once: true })
      }

      const traceId = createAITraceId()
      let accumulated = ''

      try {
        enqueue({
          type: 'meta',
          streamMode: 'agent_executor',
          agentId,
          traceId,
          spendLane: session.lane,
          noticeCode: session.noticeCode,
          notice:
            'AgentExecutor SSE: step status + real ANSWER: chatStream deltas. ReAct tool text is not token-fanned to the client.',
        })

        const projectRulesContext = await loadProjectRulesContext({ userId, projectId })
        const executor = new AgentExecutor(agentId)

        const execution = await executor.execute(
          buildAgentTask(userId, messages, projectId, projectRulesContext),
          {
            abortSignal,
            onStep: (event) => {
              if (abortSignal?.aborted) return
              enqueue({
                type: 'status',
                phase:
                  event.phase === 'final'
                    ? 'apply'
                    : event.phase === 'tool'
                      ? 'swarm_parallel'
                      : 'maestro_planning',
                label:
                  event.phase === 'tool'
                    ? `Tool: ${event.tool || 'unknown'}`
                    : event.phase === 'final'
                      ? 'Final answer'
                      : `Thinking (iteration ${event.iteration})`,
                detail: event.detail || event.thought,
                at: new Date().toISOString(),
                agentId,
                iteration: event.iteration,
                agentPhase: event.phase,
                tool: event.tool,
              })
            },
            onFinalAnswerDelta: (delta) => {
              if (abortSignal?.aborted || !delta) return
              accumulated += delta
              enqueue({
                type: 'content',
                delta,
                content: accumulated,
                tokenSource: 'agent_answer',
              })
            },
          },
        )

        if (abortSignal?.aborted || execution.status === 'aborted') {
          await session.cancel().catch(() => {})
          activeSession = null
          enqueue({ type: 'done', aborted: true, traceId, content: accumulated, streamMode: 'agent_executor' })
          controller.close()
          return
        }

        if (execution.status === 'failed') {
          await session.cancel().catch(() => {})
          activeSession = null
          enqueue({
            type: 'error',
            error: execution.error || 'Agent execution failed',
            streamMode: 'agent_executor',
          })
          controller.close()
          return
        }

        const artifactsSummary =
          execution.artifacts.length > 0
            ? `\n\nArtifacts created: ${execution.artifacts.map((artifact) => artifact.name).join(', ')}`
            : ''

        if (!accumulated && execution.finalAnswer) {
          // Fallback when the model returned FINAL_ANSWER without ANSWER: prefix streaming.
          accumulated = execution.finalAnswer
          enqueue({
            type: 'content',
            delta: accumulated,
            content: accumulated,
            tokenSource: 'final_complete',
          })
        }

        if (artifactsSummary) {
          accumulated += artifactsSummary
          enqueue({
            type: 'content',
            delta: artifactsSummary,
            content: accumulated,
            tokenSource: 'final_complete',
          })
        }

        const estimatedTokens = Math.max(
          1,
          Math.ceil(accumulated.length / 4) || execution.steps.length * 1000,
        )
        await session.settle(estimatedTokens)
        activeSession = null

        const traceSummary = buildAgentTraceSummary({
          traceId,
          agentId,
          steps: execution.steps,
          artifactsCount: execution.artifacts.length,
          estimatedTokens,
          projectId,
        })

        if (includeTrace) {
          persistAITrace({
            userId,
            kind: 'agent',
            trace: traceSummary,
            projectId,
          }).catch((err) => logger.warn('Failed to persist agent stream trace', err, { traceId, projectId }))
        }

        enqueue({
          type: 'done',
          tokensUsed: estimatedTokens,
          traceId,
          content: accumulated || execution.finalAnswer || 'Task completed.',
          streamMode: 'agent_executor',
          agentExecution: {
            steps: execution.steps.length,
            artifacts: execution.artifacts.length,
          },
          traceSummary: includeTrace ? traceSummary : undefined,
        })
        controller.close()
      } catch (error) {
        await session.cancel().catch(() => {})
        activeSession = null
        logger.error('AgentExecutor streaming error', error, { agentId, traceId })
        enqueue({
          type: 'error',
          error: error instanceof Error ? error.message : 'Agent stream error',
          streamMode: 'agent_executor',
        })
        controller.close()
      } finally {
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort)
        }
      }
    },
    cancel() {
      if (activeSession) {
        void activeSession.cancel().catch(() => {})
        activeSession = null
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Aethel-Spend-Resolver': '1',
      'X-Aethel-Stream-Mode': 'agent_executor',
    },
  })
}

export async function handleStreamingResponse(
  userId: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  traceId: string,
  estimatedTokens: number,
  abortSignal?: AbortSignal,
  byok = false,
  byokApiKey?: string,
): Promise<NextResponse> {
  const encoder = new TextEncoder()
  const { planDef, byok: isByok } = await resolvePlanLimits(userId, byok)

  let activeSession: ChatSpendSession | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const spend = await beginChatSpendSession({
        userId,
        planId: planDef.id,
        planLimits: planDef.limits,
        modelId: model || 'openai/gpt-4o-mini',
        estimatedRawTokens: Math.max(1, estimatedTokens),
        byok: isByok,
        operationType: 'chat_advanced',
      })
      if (!spend.ok) {
        const body = await spend.response.json()
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: body.error || 'SPEND_BLOCKED', ...body })}\n\n`,
          ),
        )
        controller.close()
        return
      }
      const session = spend.session
      activeSession = session

      const onAbort = () => {
        void session.cancel().catch(() => {})
      }
      if (abortSignal) {
        if (abortSignal.aborted) {
          await session.cancel().catch(() => {})
          controller.close()
          return
        }
        abortSignal.addEventListener('abort', onAbort, { once: true })
      }

      try {
        const meta = JSON.stringify({
          type: 'meta',
          traceId,
          model,
          estimatedTokens,
          spendLane: session.lane,
          noticeCode: session.noticeCode,
        })
        controller.enqueue(encoder.encode(`data: ${meta}\n\n`))

        // Real token-by-token provider stream — never buffer a completed query then dump.
        const streamMessages = [
          ...(systemPrompt
            ? [{ role: 'system' as const, content: systemPrompt }]
            : []),
          ...messages
            .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'system')
            .map((message) => ({
              role: message.role as 'user' | 'assistant' | 'system',
              content: message.content,
            })),
        ]

        let accumulated = ''
        for await (const delta of aiService.chatStream({
          messages: streamMessages,
          model,
          isBYOK: isByok,
          apiKeyOverride: byokApiKey,
          userId,
        })) {
          if (abortSignal?.aborted) {
            await session.cancel().catch(() => {})
            activeSession = null
            controller.close()
            return
          }
          if (!delta) continue
          accumulated += delta
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'content', delta, content: accumulated })}\n\n`,
            ),
          )
        }

        if (abortSignal?.aborted) {
          await session.cancel().catch(() => {})
          activeSession = null
          controller.close()
          return
        }

        const tokensUsed = Math.max(1, Math.ceil(accumulated.length / 4) || estimatedTokens)
        await session.settle(tokensUsed)
        activeSession = null

        persistAITrace({
          userId,
          kind: 'stream',
          trace: {
            traceId,
            summary: 'Resposta gerada (modo chat streaming token-by-token).',
            decisionRecord: {
              decision: 'Responder via aiService.chatStream com SSE deltas canceláveis.',
            },
            evidence: [{ kind: 'context', label: `historyContextMessages=${messages.length - 1}` }],
            telemetry: { model, estimatedTokens, tokensUsed },
          },
        }).catch((err) => logger.warn('Failed to persist streaming trace', err, { traceId }))

        const doneData = JSON.stringify({ type: 'done', tokensUsed, traceId, content: accumulated })
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
        controller.close()
      } catch (error) {
        await session.cancel().catch(() => {})
        activeSession = null
        logger.error('Advanced chat streaming error', error, { traceId })
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Stream error',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        controller.close()
      } finally {
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort)
        }
      }
    },
    cancel() {
      if (activeSession) {
        void activeSession.cancel().catch(() => {})
        activeSession = null
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Aethel-Spend-Resolver': '1',
    },
  })
}
