import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import { aiTools } from '@/lib/ai-tools-registry'
import { AgentExecutor, AGENTS } from '@/lib/ai-agent-system'
import { recordTokenUsage } from '@/lib/plan-limits'
import { createAITraceId, type AITraceSummary } from '@/lib/ai-internal-trace'
import { persistAITrace } from '@/lib/ai-trace-store'
import { loadProjectRulesContext } from '@/lib/server/project-rules'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ChatMessage } from './types'

const logger = createComponentLogger('server.ai-chat-advanced.agent-streaming')

export async function handleAgentRequest(
  userId: string,
  agentId: string,
  messages: ChatMessage[],
  projectId: string | undefined,
  includeTrace: boolean
): Promise<NextResponse> {
  try {
    const lastMessage = messages[messages.length - 1]
    const projectRulesContext = await loadProjectRulesContext({ userId, projectId })

    const executor = new AgentExecutor(agentId)
    const execution = await executor.execute({
      id: `task-${Date.now()}`,
      description: projectRulesContext
        ? `${lastMessage.content}

${projectRulesContext}`
        : lastMessage.content,
      context: [projectId ? `Project ID: ${projectId}` : null, projectRulesContext || null]
        .filter(Boolean)
        .join('\n\n') || undefined,
      executionContext: {
        userId,
        projectId,
        enforceAgentScope: Boolean(projectId),
      },
    })

    const traceId = createAITraceId()
    const estimatedTokens = execution.steps.length * 1000
    await recordTokenUsage(userId, estimatedTokens)

    const content = execution.finalAnswer || 'Task completed.'
    const artifactsSummary = execution.artifacts.length > 0
      ? `

Artefatos criados: ${execution.artifacts.map((artifact) => artifact.name).join(', ')}`
      : ''

    const traceSummary: AITraceSummary = {
      traceId,
      summary: `Resposta gerada (modo agente: ${agentId}).`,
      decisionRecord: {
        decision: 'Executar tarefa via AgentExecutor e consolidar resposta final.',
      },
      evidence: [
        {
          kind: 'tool',
          label: 'AgentExecutor.execute',
          detail: `steps=${execution.steps.length}; artifacts=${execution.artifacts.length}`,
        },
        ...(execution.steps
          .filter((step) => step.action?.tool)
          .slice(0, 20)
          .map((step) => ({
            kind: 'tool' as const,
            label: String(step.action?.tool),
            detail: (step.observation || '').slice(0, 280),
          }))),
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
      toolRuns: execution.steps
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
      agentExecution: {
        steps: execution.steps.length,
        artifacts: execution.artifacts.length,
      },
      traceId: includeTrace ? traceId : undefined,
      traceSummary: includeTrace ? traceSummary : undefined,
    })
  } catch (error) {
    logger.error('Agent execution error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent execution failed' },
      { status: 500 }
    )
  }
}

export async function handleStreamingResponse(
  userId: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  traceId: string,
  estimatedTokens: number
): Promise<NextResponse> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const meta = JSON.stringify({ type: 'meta', traceId, model, estimatedTokens })
        controller.enqueue(encoder.encode(`data: ${meta}

`))

        const historyContext = messages
          .slice(0, -1)
          .filter((message) => message.role !== 'tool')
          .map((message) => `${message.role}: ${message.content}`)
          .join('\n')

        const result = await aiService.query(
          messages[messages.length - 1].content,
          historyContext || undefined,
          { model, systemPrompt }
        )

        const data = JSON.stringify({ type: 'content', content: result.content })
        controller.enqueue(encoder.encode(`data: ${data}

`))

        await recordTokenUsage(userId, result.tokensUsed)

        persistAITrace({
          userId,
          kind: 'stream',
          trace: {
            traceId,
            summary: 'Resposta gerada (modo chat streaming).',
            decisionRecord: {
              decision: 'Responder via streaming com backpressure.',
            },
            evidence: [{ kind: 'context', label: `historyContextMessages=${messages.length - 1}` }],
            telemetry: { model, estimatedTokens, tokensUsed: result.tokensUsed },
          },
        }).catch((err) => logger.warn('Failed to persist streaming trace', err, { traceId }))

        const doneData = JSON.stringify({ type: 'done', tokensUsed: result.tokensUsed, traceId })
        controller.enqueue(encoder.encode(`data: ${doneData}

`))
        controller.close()
      } catch (error) {
        logger.error('Advanced chat streaming error', error, { traceId })
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Stream error',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}

`))
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export function getAdvancedChatMetadata(): NextResponse {
  const agents = Object.values(AGENTS).map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    description: agent.description,
    toolCount: agent.tools.length,
  }))

  const tools = aiTools.getAll().map((tool) => ({
    name: tool.name,
    category: tool.category,
    description: tool.description,
  }))

  return NextResponse.json({
    agents,
    tools,
    capabilities: {
      functionCalling: true,
      streaming: true,
      multiAgent: true,
    },
  })
}
