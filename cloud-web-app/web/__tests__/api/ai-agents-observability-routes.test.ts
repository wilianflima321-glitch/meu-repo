import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AgentSnapshot } from '@/lib/server/agent-store'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const storeMocks = vi.hoisted(() => ({
  listAgentSnapshots: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/server/agent-store', () => storeMocks)

import { GET as getAgents } from '@/app/api/ai/agents/route'
import { GET as getExecutions } from '@/app/api/ai/agents/executions/route'
import { GET as getMetrics } from '@/app/api/ai/agents/metrics/route'

function request(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

function snapshot(input: Partial<AgentSnapshot>): AgentSnapshot {
  return {
    sessionId: input.sessionId || 'session-1',
    userId: 'user-agent-routes',
    createdAt: input.createdAt || '2026-05-12T10:00:00.000Z',
    updatedAt: input.updatedAt || '2026-05-12T10:05:00.000Z',
    task: input.task || 'Persist agent route state',
    config: input.config || { model: 'openai/gpt-5.4', autonomyLevel: 'supervised', requireApproval: true },
    status: input.status || {},
    steps: input.steps || [],
  }
}

const snapshots = [
  snapshot({
    sessionId: 'completed-run',
    updatedAt: '2026-05-12T10:10:00.000Z',
    status: { currentTask: { status: 'completed' } },
  }),
  snapshot({
    sessionId: 'running-run',
    updatedAt: '2026-05-12T10:20:00.000Z',
    status: { isRunning: true, iteration: 3 },
  }),
]

describe('AI agent observability routes', () => {
  beforeEach(() => {
    authMocks.requireAuth.mockReset()
    storeMocks.listAgentSnapshots.mockReset()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-agent-routes', email: 'agent@example.com' })
    storeMocks.listAgentSnapshots.mockResolvedValue(snapshots)
  })

  it('returns persisted agent overview without simulation gating', async () => {
    const response = await getAgents(request('/api/ai/agents'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(storeMocks.listAgentSnapshots).toHaveBeenCalledWith('user-agent-routes')
    expect(payload.capability).toBe('AI_AGENTS_OVERVIEW')
    expect(payload.capabilityStatus).toBe('READY')
    expect(payload.retention).toBe('local-agent-store')
    expect(payload.summary.totalExecutions).toBe(2)
    expect(payload.summary.activeExecutions).toBe(1)
    expect(payload.agents[0].status).toBe('running')
  })

  it('returns execution history with a route-level limit', async () => {
    const response = await getExecutions(request('/api/ai/agents/executions?limit=1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.capabilityStatus).toBe('READY')
    expect(payload.executions).toHaveLength(1)
    expect(payload.executions[0].sessionId).toBe('running-run')
    expect(payload.summary.totalExecutions).toBe(1)
  })

  it('returns route metrics from the same persisted snapshots and marks cost data as unmetered', async () => {
    const response = await getMetrics(request('/api/ai/agents/metrics'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.capability).toBe('AI_AGENTS_METRICS')
    expect(payload.capabilityStatus).toBe('READY')
    expect(payload.totalAgents).toBe(1)
    expect(payload.activeAgents).toBe(1)
    expect(payload.totalExecutions).toBe(2)
    expect(payload.successRate).toBe(50)
    expect(payload.metered).toBe(false)
    expect(payload.measurementNote).toContain('intentionally marked unmetered')
  })

  it('keeps auth failures explicit', async () => {
    authMocks.requireAuth.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    const response = await getAgents(request('/api/ai/agents'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })
})

