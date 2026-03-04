import { NextRequest, NextResponse } from 'next/server'
import {
  buildRoleScope,
  DEFAULT_AGENT_SET,
  getOrchestrator,
  ORCHESTRATOR_COORDINATION_POLICY,
  ORCHESTRATOR_CAPABILITY_STATUS,
  ORCHESTRATOR_DISCLAIMER,
  ORCHESTRATOR_EXECUTION_MODE,
  OrchestrationTask,
  SUPPORTED_AGENT_TYPES,
  type AgentType,
} from '@/lib/agent-orchestrator'
import { aiService } from '@/lib/ai-service'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import {
  acquireConcurrencyLease,
  consumeMeteredUsage,
  estimateTokensFromText,
  releaseConcurrencyLease,
} from '@/lib/metering'
import { capabilityResponse } from '@/lib/server/capability-response'

export const runtime = 'nodejs'

type StreamRequestBody = {
  prompt?: unknown
  agents?: unknown
  priority?: unknown
  executionMode?: unknown
}

const MAX_PROMPT_LENGTH = 12_000

function normalizePriority(input: unknown): OrchestrationTask['priority'] {
  return input === 'low' || input === 'high' ? input : 'normal'
}

function getMaxAgentsForPlan(concurrentLimit: number): number {
  if (concurrentLimit === -1) return SUPPORTED_AGENT_TYPES.length
  return Math.max(1, Math.min(SUPPORTED_AGENT_TYPES.length, concurrentLimit || 1))
}

function isAgentAllowedByPlan(agent: AgentType, allowedAgents: string[]): boolean {
  if (allowedAgents.includes('all') || allowedAgents.includes('all-standard') || allowedAgents.includes('custom') || allowedAgents.includes('private')) {
    return true
  }

  if (allowedAgents.includes(agent)) return true

  // Compatibility mapping between older plan-agent ids and the stream roles.
  if (allowedAgents.includes('coder') && agent === 'engineer') return true
  if (allowedAgents.includes('universal') && (agent === 'architect' || agent === 'designer' || agent === 'engineer')) return true

  return false
}

function normalizeAgents(input: unknown): AgentType[] {
  const raw = Array.isArray(input) ? input : DEFAULT_AGENT_SET
  const normalized = raw
    .map((value) => String(value || '').toLowerCase().trim())
    .filter((value): value is AgentType => (SUPPORTED_AGENT_TYPES as readonly string[]).includes(value))

  return Array.from(new Set(normalized))
}

function normalizeExecutionMode(input: unknown): 'heuristic' | 'provider-backed' {
  return input === 'provider-backed' ? 'provider-backed' : 'heuristic'
}

function getAvailableModes(): Array<'heuristic' | 'provider-backed'> {
  const providers = aiService.getAvailableProviders()
  if (providers.length > 0) return ['heuristic', 'provider-backed']
  return ['heuristic']
}

function buildProviderBackedMessages(agent: AgentType, prompt: string, priority: OrchestrationTask['priority']) {
  const priorityHint =
    priority === 'high'
      ? 'Priority: high. Focus on reliability and critical path completion first.'
      : priority === 'low'
        ? 'Priority: low. Prefer incremental and low-risk closure.'
        : 'Priority: normal. Balance speed and reliability.'

  const system = [
    'You are part of a multi-agent engineering squad.',
    `Role=${agent}.`,
    `Scope=${buildRoleScope(agent)}`,
    'Do not overlap other roles; provide output strictly for your role scope.',
    'Return concise, actionable output with deterministic checks when possible.',
    priorityHint,
  ].join(' ')

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: prompt },
  ]
}

/**
 * POST /api/agents/stream
 * Streams responses from multiple AI roles in parallel with auth, plan limits and metering.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let leaseId: string | null = null

  try {
    const auth = requireAuth(request)
    const entitlements = await requireEntitlementsForUser(auth.userId)

    const body = (await request.json().catch(() => null)) as StreamRequestBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON invalido.' }, { status: 400 })
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) {
      return NextResponse.json({ error: 'INVALID_PROMPT', message: 'Prompt obrigatorio.' }, { status: 400 })
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          error: 'PROMPT_TOO_LARGE',
          message: `Prompt excede o limite de ${MAX_PROMPT_LENGTH} caracteres.`,
          maxPromptLength: MAX_PROMPT_LENGTH,
        },
        { status: 413 }
      )
    }

    const requestedAgents = normalizeAgents(body.agents)
    const priority = normalizePriority(body.priority)
    const executionMode = normalizeExecutionMode(body.executionMode)

    const maxAgentsForPlan = getMaxAgentsForPlan(entitlements.plan.limits.concurrent)

    const planAllowedAgents = Array.isArray(entitlements.plan.allowedAgents)
      ? entitlements.plan.allowedAgents
      : []

    const filteredByPlan = requestedAgents.filter((agent) =>
      isAgentAllowedByPlan(agent, planAllowedAgents)
    )

    if (filteredByPlan.length === 0) {
      return capabilityResponse({
        error: 'FEATURE_NOT_AVAILABLE',
        message: 'Seu plano atual nao habilita os roles solicitados para orquestracao multi-agente.',
        status: 403,
        capability: 'multi_agent_orchestration',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          planId: entitlements.plan.id,
          requestedAgents,
          allowedAgents: planAllowedAgents,
        },
      })
    }

    if (filteredByPlan.length > maxAgentsForPlan) {
      return capabilityResponse({
        error: 'FEATURE_NOT_AVAILABLE',
        message: `Seu plano permite no maximo ${maxAgentsForPlan} agente(s) simultaneo(s).`,
        status: 403,
        capability: 'multi_agent_orchestration',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          planId: entitlements.plan.id,
          maxAgentsForPlan,
          requestedCount: filteredByPlan.length,
          requestedAgents: filteredByPlan,
        },
      })
    }

    const selectedAgents = filteredByPlan.slice(0, maxAgentsForPlan)
    const task: OrchestrationTask = {
      id: `task-${Date.now()}`,
      prompt,
      agents: selectedAgents,
      priority,
      timeout: 45_000,
      createdAt: Date.now(),
    }

    leaseId = (
      await acquireConcurrencyLease({
        userId: auth.userId,
        key: 'api/agents/stream',
        concurrencyLimit: entitlements.plan.limits.concurrent,
        ttlSeconds: 120,
      })
    )?.leaseId ?? null

    const estimatedTokens = estimateTokensFromText(prompt) + selectedAgents.length * 450
    const meteringDecision = await consumeMeteredUsage({
      userId: auth.userId,
      limits: entitlements.plan.limits,
      cost: { requests: 1, tokens: estimatedTokens },
    })

    if (executionMode === 'provider-backed') {
      const availableProviders = aiService.getAvailableProviders()
      if (availableProviders.length === 0) {
        return capabilityResponse({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: 'Provider-backed mode requires at least one configured AI provider.',
          status: 503,
          capability: 'multi_agent_orchestration_provider',
          capabilityStatus: 'PARTIAL',
          milestone: 'P2',
          metadata: {
            requestedMode: executionMode,
            availableModes: getAvailableModes(),
            setupUrl: '/settings?tab=api',
            setupAction: 'OPEN_AI_PROVIDER_SETTINGS',
          },
        })
      }

      const encoder = new TextEncoder()
      let streamClosed = false
      let leaseReleased = false
      const releaseLease = async (): Promise<void> => {
        if (leaseReleased || !leaseId) return
        leaseReleased = true
        await releaseConcurrencyLease(leaseId)
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'ready',
                  taskId: task.id,
                  selectedAgents,
                  mode: 'provider-backed',
                  capability: 'multi_agent_orchestration_provider',
                  capabilityStatus: 'PARTIAL',
                  disclaimer:
                    'Provider-backed mode is experimental. Outputs still require deterministic validation before apply.',
                  coordination: {
                    ...ORCHESTRATOR_COORDINATION_POLICY,
                    selectedScopes: selectedAgents.map((agent) => ({
                      role: agent,
                      scope: buildRoleScope(agent),
                    })),
                  },
                  providers: availableProviders,
                  timestamp: Date.now(),
                })}\n\n`
              )
            )

            const executions = selectedAgents.map(async (agent) => {
              if (streamClosed) return
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'agent_start',
                    taskId: task.id,
                    agentType: agent,
                    timestamp: Date.now(),
                    status: 'streaming',
                  })}\n\n`
                )
              )

              try {
                const response = await aiService.chat({
                  messages: buildProviderBackedMessages(agent, prompt, priority),
                  maxTokens: 700,
                  temperature: 0.2,
                })

                if (streamClosed) return
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'agent_message',
                      taskId: task.id,
                      agentType: agent,
                      content: response.content,
                      model: response.model,
                      provider: response.provider,
                      tokensUsed: response.tokensUsed,
                      latencyMs: response.latencyMs,
                      timestamp: Date.now(),
                      status: 'complete',
                    })}\n\n`
                  )
                )
              } catch (error) {
                if (streamClosed) return
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'agent_error',
                      taskId: task.id,
                      agentType: agent,
                      error: error instanceof Error ? error.message : 'Agent execution failed',
                      timestamp: Date.now(),
                      status: 'error',
                    })}\n\n`
                  )
                )
              }
            })

            await Promise.all(executions)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'complete',
                  taskId: task.id,
                  timestamp: Date.now(),
                  mode: 'provider-backed',
                })}\n\n`
              )
            )
            controller.close()
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  taskId: task.id,
                  error: error instanceof Error ? error.message : 'Unknown stream error',
                  timestamp: Date.now(),
                })}\n\n`
              )
            )
            controller.close()
          } finally {
            await releaseLease()
          }
        },
        async cancel() {
          streamClosed = true
          await releaseLease()
        },
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          ...(meteringDecision.remaining?.requestsPerHour !== undefined
            ? { 'X-Usage-Remaining-RequestsPerHour': String(meteringDecision.remaining.requestsPerHour) }
            : {}),
          ...(meteringDecision.remaining?.tokensPerDay !== undefined
            ? { 'X-Usage-Remaining-TokensPerDay': String(meteringDecision.remaining.tokensPerDay) }
            : {}),
          ...(meteringDecision.remaining?.tokensPerMonth !== undefined
            ? { 'X-Usage-Remaining-TokensPerMonth': String(meteringDecision.remaining.tokensPerMonth) }
            : {}),
        },
      })
    }

    const orchestrator = getOrchestrator()
    const encoder = new TextEncoder()
    let streamClosed = false
    let leaseReleased = false

    const releaseLease = async (): Promise<void> => {
      if (leaseReleased || !leaseId) return
      leaseReleased = true
      await releaseConcurrencyLease(leaseId)
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'ready',
                taskId: task.id,
                selectedAgents,
                mode: ORCHESTRATOR_EXECUTION_MODE,
                capability: 'multi_agent_orchestration',
                capabilityStatus: ORCHESTRATOR_CAPABILITY_STATUS,
                disclaimer: ORCHESTRATOR_DISCLAIMER,
                coordination: {
                  ...ORCHESTRATOR_COORDINATION_POLICY,
                  selectedScopes: selectedAgents.map((agent) => ({
                    role: agent,
                    scope: buildRoleScope(agent),
                  })),
                },
                timestamp: Date.now(),
              })}\n\n`
            )
          )

          const generator = orchestrator.executeParallel(task)
          for await (const message of generator) {
            if (streamClosed) break
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                taskId: task.id,
                timestamp: Date.now(),
              })}\n\n`
            )
          )
          controller.close()
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                taskId: task.id,
                error: error instanceof Error ? error.message : 'Unknown stream error',
                timestamp: Date.now(),
              })}\n\n`
            )
          )
          controller.close()
        } finally {
          await releaseLease()
        }
      },
      async cancel() {
        streamClosed = true
        orchestrator.cancelTask(task.id)
        await releaseLease()
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...(meteringDecision.remaining?.requestsPerHour !== undefined
          ? { 'X-Usage-Remaining-RequestsPerHour': String(meteringDecision.remaining.requestsPerHour) }
          : {}),
        ...(meteringDecision.remaining?.tokensPerDay !== undefined
          ? { 'X-Usage-Remaining-TokensPerDay': String(meteringDecision.remaining.tokensPerDay) }
          : {}),
        ...(meteringDecision.remaining?.tokensPerMonth !== undefined
          ? { 'X-Usage-Remaining-TokensPerMonth': String(meteringDecision.remaining.tokensPerMonth) }
          : {}),
      },
    })
  } catch (error) {
    if (leaseId) {
      await releaseConcurrencyLease(leaseId)
    }

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Internal server error', 500)
  }
}

/**
 * GET /api/agents/stream/status
 * Returns current role status.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAuth(request)
    const entitlements = await requireEntitlementsForUser(auth.userId)
    const maxAgentsForPlan = getMaxAgentsForPlan(entitlements.plan.limits.concurrent)

    const orchestrator = getOrchestrator()
    const agents = orchestrator.getAgentStatus()

    return NextResponse.json({
      agents,
      mode: ORCHESTRATOR_EXECUTION_MODE,
      capability: 'multi_agent_orchestration',
      capabilityStatus: ORCHESTRATOR_CAPABILITY_STATUS,
      disclaimer: ORCHESTRATOR_DISCLAIMER,
      coordination: {
        ...ORCHESTRATOR_COORDINATION_POLICY,
      },
      limits: {
        planId: entitlements.plan.id,
        maxAgentsForPlan,
        concurrentLimit: entitlements.plan.limits.concurrent,
      },
      availableModes: getAvailableModes(),
      timestamp: Date.now(),
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to get agent status', 500)
  }
}
