/**
 * R19 — Advanced chat must consume real SSE (single-agent tokens or Apex coordinator).
 * Never invent a typewriter over completed JSON.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  streamAdvancedChat,
  foldCoordinatorStreamIntoNexus,
} from '@/lib/ai-chat-advanced-client'

function sseBlock(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

describe('streamAdvancedChat (AIChatPanelPro / chat-advanced)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('delivers incremental SSE deltas before the stream completes', async () => {
    const deltas: string[] = []
    let resolveSecond: (() => void) | undefined
    const secondChunkGate = new Promise<void>((resolve) => {
      resolveSecond = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const encoder = new TextEncoder()
        let step = 0
        const body = new ReadableStream<Uint8Array>({
          async pull(controller) {
            if (step === 0) {
              controller.enqueue(
                encoder.encode(
                  sseBlock({ type: 'meta', traceId: 'tr-1', model: 'test-model' }) +
                    sseBlock({ type: 'content', delta: 'Hel', content: 'Hel' }),
                ),
              )
              step = 1
              return
            }
            if (step === 1) {
              await secondChunkGate
              controller.enqueue(
                encoder.encode(
                  sseBlock({ type: 'content', delta: 'lo', content: 'Hello' }) +
                    sseBlock({ type: 'done', tokensUsed: 2, traceId: 'tr-1', content: 'Hello' }),
                ),
              )
              step = 2
              return
            }
            controller.close()
          },
        })
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }),
    )

    const seenBeforeComplete: string[] = []
    const done = streamAdvancedChat({
      message: 'hi',
      model: 'test-model',
      messages: [{ role: 'user', content: 'hi' }],
      profileOverride: { qualityMode: 'standard', agentCount: 1, enableWebResearch: false },
      onDelta: (chunk) => {
        deltas.push(chunk)
        if (deltas.length === 1) {
          seenBeforeComplete.push(...deltas)
          resolveSecond?.()
        }
      },
    })

    const result = await done
    expect(seenBeforeComplete).toEqual(['Hel'])
    expect(deltas).toEqual(['Hel', 'lo'])
    expect(result.content).toBe('Hello')
    expect(result.traceId).toBe('tr-1')
    expect(result.aborted).toBe(false)

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/chat-advanced',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"stream":true'),
      }),
    )
  })

  it('fail-closes when the response is JSON instead of an event-stream (no theater)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ message: { role: 'assistant', content: 'done' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      streamAdvancedChat({
        message: 'hi',
        model: 'test-model',
        messages: [{ role: 'user', content: 'hi' }],
        profileOverride: { qualityMode: 'standard', agentCount: 1, enableWebResearch: false },
        onDelta: () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'AI_STREAM_UNAVAILABLE', status: 502 })
  })

  it('streams Apex coordinator status + final_complete without claiming per-agent tokens', async () => {
    const statuses: string[] = []
    const cells: string[] = []
    const deltas: Array<{ chunk: string; tokenSource?: string }> = []
    let resolveAfterStatus: (() => void) | undefined
    const afterStatusGate = new Promise<void>((resolve) => {
      resolveAfterStatus = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        const body = typeof init?.body === 'string' ? init.body : ''
        expect(body).toContain('"stream":true')
        expect(body).toContain('"agentCount":3')
        expect(body).toContain('"enableApexMoA":true')

        const encoder = new TextEncoder()
        let step = 0
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            if (step === 0) {
              controller.enqueue(
                encoder.encode(
                  sseBlock({
                    type: 'meta',
                    streamMode: 'apex_coordinator',
                    notice: 'Coordinator status + final answer only.',
                    traceId: 'tr-moa',
                    model: 'test-model',
                  }) +
                    sseBlock({
                      type: 'status',
                      phase: 'maestro_planning',
                      label: 'Maestro planning…',
                      at: '2026-08-08T12:00:00.000Z',
                    }) +
                    sseBlock({
                      type: 'status',
                      phase: 'swarm_parallel',
                      label: 'Swarm on parallel cells…',
                      detail: '2 cell(s)',
                      at: '2026-08-08T12:00:01.000Z',
                    }) +
                    sseBlock({
                      type: 'cell',
                      taskId: 't-crit',
                      role: 'critical',
                      status: 'started',
                    }),
                ),
              )
              step = 1
              return
            }
            if (step === 1) {
              await afterStatusGate
              controller.enqueue(
                encoder.encode(
                  sseBlock({
                    type: 'cell',
                    taskId: 't-crit',
                    role: 'critical',
                    status: 'completed',
                    moaVerdict: 'CANDIDATE',
                    healVerdict: 'APPLY',
                    healRounds: 1,
                  }) +
                    sseBlock({
                      type: 'status',
                      phase: 'apply',
                      label: 'Apply candidate ready',
                      at: '2026-08-08T12:00:02.000Z',
                    }) +
                    sseBlock({
                      type: 'content',
                      delta: 'export const x = 1\n',
                      content: 'export const x = 1\n',
                      tokenSource: 'final_complete',
                    }) +
                    sseBlock({
                      type: 'done',
                      tokensUsed: 1200,
                      traceId: 'tr-moa',
                      content: 'export const x = 1\n',
                      streamMode: 'apex_coordinator',
                      apexMission: {
                        missionId: 'm-1',
                        verdict: 'APPLY',
                        nexus: {
                          missionId: 'm-1',
                          currentPhase: 'apply',
                          phaseLabel: 'Apply candidate ready',
                          phases: [],
                          cells: [],
                          verdict: 'APPLY',
                          estimatedSpendTokens: 1200,
                        },
                      },
                    }),
                ),
              )
              step = 2
              return
            }
            controller.close()
          },
        })
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'X-Aethel-Stream-Mode': 'apex_coordinator',
          },
        })
      }),
    )

    const result = await streamAdvancedChat({
      message: 'deep audit implement refactor',
      model: 'test-model',
      messages: [{ role: 'user', content: 'deep audit implement refactor' }],
      profileOverride: { qualityMode: 'studio', agentCount: 3, enableWebResearch: true },
      onDelta: (chunk, _acc, meta) => {
        deltas.push({ chunk, tokenSource: meta?.tokenSource })
      },
      onStatus: (s) => {
        statuses.push(s.phase)
        if (statuses.length === 2) resolveAfterStatus?.()
      },
      onCell: (c) => {
        cells.push(`${c.taskId}:${c.status}`)
      },
    })

    expect(statuses).toEqual(['maestro_planning', 'swarm_parallel', 'apply'])
    expect(cells).toEqual(['t-crit:started', 't-crit:completed'])
    expect(deltas).toEqual([{ chunk: 'export const x = 1\n', tokenSource: 'final_complete' }])
    expect(result.streamMode).toBe('apex_coordinator')
    expect(result.content).toBe('export const x = 1\n')
    expect(result.apexMission?.verdict).toBe('APPLY')
    expect(result.meta?.streamMode).toBe('apex_coordinator')
    expect(result.aborted).toBe(false)
  })

  it('streams AgentExecutor agentId path with status + ANSWER deltas (not JSON theater)', async () => {
    const statuses: string[] = []
    const deltas: Array<{ chunk: string; tokenSource?: string }> = []
    let resolveAfterStatus: (() => void) | undefined
    const afterStatusGate = new Promise<void>((resolve) => {
      resolveAfterStatus = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        const body = typeof init?.body === 'string' ? init.body : ''
        expect(body).toContain('"stream":true')
        expect(body).toContain('"agentId":"coder"')
        expect(body).toContain('"agentCount":1')

        const encoder = new TextEncoder()
        let step = 0
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            if (step === 0) {
              controller.enqueue(
                encoder.encode(
                  sseBlock({
                    type: 'meta',
                    streamMode: 'agent_executor',
                    agentId: 'coder',
                    notice: 'AgentExecutor SSE',
                    traceId: 'tr-agent',
                  }) +
                    sseBlock({
                      type: 'status',
                      phase: 'maestro_planning',
                      label: 'Thinking (iteration 1)',
                      at: '2026-08-08T12:00:00.000Z',
                      agentPhase: 'thinking',
                      iteration: 1,
                    }),
                ),
              )
              step = 1
              return
            }
            if (step === 1) {
              await afterStatusGate
              controller.enqueue(
                encoder.encode(
                  sseBlock({
                    type: 'status',
                    phase: 'apply',
                    label: 'Final answer',
                    at: '2026-08-08T12:00:01.000Z',
                    agentPhase: 'final',
                    iteration: 1,
                  }) +
                    sseBlock({
                      type: 'content',
                      delta: 'Done',
                      content: 'Done',
                      tokenSource: 'agent_answer',
                    }) +
                    sseBlock({
                      type: 'content',
                      delta: ' patch',
                      content: 'Done patch',
                      tokenSource: 'agent_answer',
                    }) +
                    sseBlock({
                      type: 'done',
                      tokensUsed: 42,
                      traceId: 'tr-agent',
                      content: 'Done patch',
                      streamMode: 'agent_executor',
                      agentExecution: { steps: 1, artifacts: 0 },
                    }),
                ),
              )
              step = 2
              return
            }
            controller.close()
          },
        })
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'X-Aethel-Stream-Mode': 'agent_executor',
          },
        })
      }),
    )

    const result = await streamAdvancedChat({
      message: 'fix the bug',
      model: 'test-model',
      messages: [{ role: 'user', content: 'fix the bug' }],
      agentId: 'coder',
      profileOverride: { qualityMode: 'studio', agentCount: 3, enableWebResearch: true },
      onDelta: (chunk, _acc, meta) => {
        deltas.push({ chunk, tokenSource: meta?.tokenSource })
      },
      onStatus: (s) => {
        statuses.push(s.phase)
        if (statuses.length === 1) resolveAfterStatus?.()
      },
    })

    expect(statuses).toEqual(['maestro_planning', 'apply'])
    expect(deltas).toEqual([
      { chunk: 'Done', tokenSource: 'agent_answer' },
      { chunk: ' patch', tokenSource: 'agent_answer' },
    ])
    expect(result.streamMode).toBe('agent_executor')
    expect(result.content).toBe('Done patch')
    expect(result.agentExecution?.steps).toBe(1)
    expect(result.meta?.streamMode).toBe('agent_executor')
    expect(result.meta?.agentId).toBe('coder')
    expect(result.aborted).toBe(false)
  })

  it('foldCoordinatorStreamIntoNexus accumulates phases and cells as RUNNING then APPLY', () => {
    let nexus = foldCoordinatorStreamIntoNexus(null, {
      kind: 'status',
      status: {
        phase: 'maestro_planning',
        label: 'Maestro planning…',
        at: 't0',
      },
    })
    expect(nexus.verdict).toBe('RUNNING')
    expect(nexus.phases).toHaveLength(1)

    nexus = foldCoordinatorStreamIntoNexus(nexus, {
      kind: 'cell',
      cell: { taskId: 'a', role: 'critical', status: 'started' },
    })
    expect(nexus.cells[0]?.status).toBe('working')

    nexus = foldCoordinatorStreamIntoNexus(nexus, {
      kind: 'status',
      status: {
        phase: 'apply',
        label: 'Apply candidate ready',
        at: 't1',
      },
    })
    expect(nexus.verdict).toBe('APPLY')
    expect(nexus.phases).toHaveLength(2)
  })
})

describe('handleApexCoordinatorStream (server SSE contract)', () => {
  it('emits apex_coordinator meta, status, final_complete content, and done', async () => {
    vi.resetModules()
    const settle = vi.fn(async () => undefined)
    const cancel = vi.fn(async () => undefined)
    const settleZero = vi.fn(async () => undefined)

    vi.doMock('@/lib/production/apex-mission-orchestrator', () => ({
      runApexCodeMission: vi.fn(async (input: {
        onPhase?: (e: { phase: string; label: string; at: string; detail?: string }) => void
        onCell?: (e: {
          taskId: string
          role: 'critical' | 'peripheral'
          status: 'started' | 'completed' | 'blocked'
        }) => void
      }) => {
        input.onPhase?.({
          phase: 'maestro_planning',
          label: 'Maestro planning…',
          at: '2026-08-08T00:00:00.000Z',
        })
        input.onCell?.({ taskId: 'c1', role: 'critical', status: 'started' })
        input.onCell?.({ taskId: 'c1', role: 'critical', status: 'completed' })
        input.onPhase?.({
          phase: 'apply',
          label: 'Apply candidate ready',
          at: '2026-08-08T00:00:01.000Z',
        })
        return {
          missionId: 'mission-1',
          plan: { trivialBypass: false, peripheralTasks: [], criticalTask: { taskId: 'c1', allowedPaths: ['x.ts'], intent: 'i', riskScore: 40 } },
          estimatedSpendTokens: 900,
          cells: [
            {
              taskId: 'c1',
              role: 'critical',
              moa: { verdict: 'CANDIDATE', generatorWidth: 1 },
              heal: { verdict: 'APPLY', turns: [{}], finalPatch: 'const ok = true\n' },
              finalPatch: 'const ok = true\n',
            },
          ],
          verdict: 'APPLY',
          supremePatch: 'const ok = true\n',
          liveProvider: true,
          phases: [
            { phase: 'maestro_planning', label: 'Maestro planning…', at: '2026-08-08T00:00:00.000Z' },
            { phase: 'apply', label: 'Apply candidate ready', at: '2026-08-08T00:00:01.000Z' },
          ],
          nucleusRole: 'architect',
          peripheralRoles: [],
        }
      }),
    }))
    vi.doMock('@/lib/production/nexus-mission-ui', () => ({
      buildNexusMissionUiPayload: vi.fn(() => ({
        missionId: 'mission-1',
        currentPhase: 'apply',
        phaseLabel: 'Apply candidate ready',
        phases: [],
        cells: [],
        verdict: 'APPLY',
        estimatedSpendTokens: 900,
      })),
    }))
    vi.doMock('@/lib/production/apex-mission-evidence', () => ({
      buildApexMissionEvidenceLedger: vi.fn(() => ({ entries: [] })),
    }))
    vi.doMock('@/lib/server/ai-change-apply/persist-governed-evidence', () => ({
      persistGovernedTaskEvidence: vi.fn(async () => undefined),
    }))
    vi.doMock('@/lib/production/creative-fusion-transaction', () => ({
      createMemoryFusionScopeStore: vi.fn(() => ({
        applySnapshot: vi.fn(),
      })),
      beginCreativeFusionTransaction: vi.fn(async () => ({
        id: 'tx-1',
        snapshotHashBefore: 'h0',
      })),
      commitCreativeFusionTransaction: vi.fn(async () => ({
        snapshotHashAfter: 'h1',
        record: { id: 'tx-1' },
      })),
      abortCreativeFusionTransaction: vi.fn(async () => undefined),
    }))
    vi.doMock('@/lib/production/fusion-tx-client-handoff', () => ({
      buildFusionTxClientHandoff: vi.fn(() => ({ id: 'tx-1' })),
      serializeFusionTxClientHandoff: vi.fn(() => '{"id":"tx-1"}'),
    }))
    vi.doMock('@/lib/production/architecture-context-spine', () => ({
      buildArchitectureContextSpine: vi.fn(async () => ({
        promptSection: '',
        lawsPackId: 'l',
        contextPackId: 'c',
        projectMemoryDigestId: 'm',
        cartographyManifestId: 'k',
      })),
    }))

    const { handleApexCoordinatorStream } = await import(
      '@/lib/server/ai-chat-advanced/apex-coordinator-stream'
    )

    const response = await handleApexCoordinatorStream({
      userId: 'u1',
      planId: 'pro',
      model: 'test-model',
      lastUserMessage: 'ship it',
      enhancedSystemMessage: 'sys',
      projectId: 'p1',
      targetFilePath: 'mission/candidate.ts',
      riskScore: 55,
      enableLlmFuse: true,
      spendSession: {
        reservationId: 'r1',
        lane: 'subscription_fast',
        modelId: 'test-model',
        headers: {},
        settle,
        cancel,
        settleZero,
      },
      traceId: 'tr-server',
    })

    expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    expect(response.headers.get('X-Aethel-Stream-Mode')).toBe('apex_coordinator')

    const text = await response.text()
    expect(text).toContain('"streamMode":"apex_coordinator"')
    expect(text).toContain('"type":"status"')
    expect(text).toContain('"type":"cell"')
    expect(text).toContain('"tokenSource":"final_complete"')
    expect(text).toContain('const ok = true')
    expect(text).toContain('"type":"done"')
    expect(settle).toHaveBeenCalledWith(900)
    expect(cancel).not.toHaveBeenCalled()
  })
})

describe('handleAgentExecutorStream (server SSE contract)', () => {
  it('emits agent_executor meta, status, ANSWER chatStream deltas, and done', async () => {
    vi.resetModules()
    const settle = vi.fn(async () => undefined)
    const cancel = vi.fn(async () => undefined)
    const settleZero = vi.fn(async () => undefined)

    vi.doMock('@/lib/ai/chat-spend-session', () => ({
      beginChatSpendSession: vi.fn(async () => ({
        ok: true,
        session: {
          reservationId: 'r-agent',
          lane: 'subscription_fast',
          modelId: 'openai/gpt-4o-mini',
          headers: {},
          noticeCode: undefined,
          settle,
          cancel,
          settleZero,
        },
      })),
    }))
    vi.doMock('@/lib/plans', () => ({
      getPlanById: vi.fn(() => ({ id: 'pro', limits: {} })),
    }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({ plan: 'pro' })),
        },
      },
    }))
    vi.doMock('@/lib/server/project-rules', () => ({
      loadProjectRulesContext: vi.fn(async () => null),
    }))
    vi.doMock('@/lib/ai-trace-store', () => ({
      persistAITrace: vi.fn(async () => undefined),
    }))
    vi.doMock('@/lib/ai-internal-trace', () => ({
      createAITraceId: vi.fn(() => 'tr-agent-server'),
    }))

    const chatStream = vi.fn(async function* () {
      yield 'THOUGHT: done\n'
      yield 'ACTION: FINAL_ANSWER\n'
      yield 'ANSWER: '
      yield 'Hello'
      yield ' world'
    })

    vi.doMock('@/lib/ai-service', () => ({
      aiService: {
        chatStream,
        chat: vi.fn(),
        getAvailableProviders: vi.fn(() => ['openai']),
      },
    }))
    vi.doMock('@/lib/ai/fusion-role-map', () => ({
      resolveTaskKindForRole: vi.fn(() => ({ taskKind: 'code_edit' })),
    }))
    vi.doMock('@/lib/server/agent-context/assemble-agent-context', () => ({
      assembleAgentContext: vi.fn(async () => ({ text: '' })),
    }))
    vi.doMock('@/lib/ai-tools-registry', () => ({
      aiTools: {
        getAll: vi.fn(() => []),
        get: vi.fn(() => undefined),
        execute: vi.fn(),
      },
    }))

    // Import after mocks so AgentExecutor uses chatStream.
    const { handleAgentExecutorStream } = await import(
      '@/lib/server/ai-chat-advanced/agent-and-streaming'
    )

    const response = await handleAgentExecutorStream({
      userId: 'u1',
      agentId: 'coder',
      messages: [{ role: 'user', content: 'say hi' }],
      includeTrace: true,
    })

    expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    expect(response.headers.get('X-Aethel-Stream-Mode')).toBe('agent_executor')

    const text = await response.text()
    expect(text).toContain('"streamMode":"agent_executor"')
    expect(text).toContain('"type":"status"')
    expect(text).toContain('"tokenSource":"agent_answer"')
    expect(text).toContain('Hello')
    expect(text).toContain(' world')
    expect(text).toContain('"type":"done"')
    expect(chatStream).toHaveBeenCalled()
    expect(settle).toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
  })

  it('JSON agentId path (stream=false) still returns application/json — not SSE theater', async () => {
    vi.resetModules()
    const settle = vi.fn(async () => undefined)
    const cancel = vi.fn(async () => undefined)
    const settleZero = vi.fn(async () => undefined)

    vi.doMock('@/lib/ai/chat-spend-session', () => ({
      beginChatSpendSession: vi.fn(async () => ({
        ok: true,
        session: {
          reservationId: 'r-json',
          lane: 'subscription_fast',
          modelId: 'openai/gpt-4o-mini',
          headers: {},
          settle,
          cancel,
          settleZero,
        },
      })),
    }))
    vi.doMock('@/lib/plans', () => ({
      getPlanById: vi.fn(() => ({ id: 'pro', limits: {} })),
    }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({ plan: 'pro' })),
        },
      },
    }))
    vi.doMock('@/lib/server/project-rules', () => ({
      loadProjectRulesContext: vi.fn(async () => null),
    }))
    vi.doMock('@/lib/ai-trace-store', () => ({
      persistAITrace: vi.fn(async () => undefined),
    }))
    vi.doMock('@/lib/ai-internal-trace', () => ({
      createAITraceId: vi.fn(() => 'tr-json'),
    }))
    vi.doMock('@/lib/ai-service', () => ({
      aiService: {
        chat: vi.fn(async () => ({
          content: 'THOUGHT: ok\nACTION: FINAL_ANSWER\nANSWER: JSON only path',
        })),
        chatStream: vi.fn(),
        getAvailableProviders: vi.fn(() => ['openai']),
      },
    }))
    vi.doMock('@/lib/ai/fusion-role-map', () => ({
      resolveTaskKindForRole: vi.fn(() => ({ taskKind: 'code_edit' })),
    }))
    vi.doMock('@/lib/server/agent-context/assemble-agent-context', () => ({
      assembleAgentContext: vi.fn(async () => ({ text: '' })),
    }))
    vi.doMock('@/lib/ai-tools-registry', () => ({
      aiTools: {
        getAll: vi.fn(() => []),
        get: vi.fn(() => undefined),
        execute: vi.fn(),
      },
    }))

    const { handleAgentRequest } = await import('@/lib/server/ai-chat-advanced/agent-and-streaming')
    const response = await handleAgentRequest(
      'u1',
      'coder',
      [{ role: 'user', content: 'hi' }],
      undefined,
      false,
    )

    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(response.headers.get('Content-Type') || '').not.toContain('text/event-stream')
    const json = await response.json()
    expect(json.message?.content).toContain('JSON only path')
    expect(settle).toHaveBeenCalled()
  })
})
