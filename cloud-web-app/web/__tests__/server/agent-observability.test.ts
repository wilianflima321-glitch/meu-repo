import { describe, expect, it } from 'vitest'

import {
  buildAgentExecutionSummary,
  buildAgentMetrics,
  buildAgentOverview,
  deriveAgentExecutionState,
  parseAgentLimit,
} from '@/lib/server/agent-observability'
import type { AgentSnapshot } from '@/lib/server/agent-store'

function snapshot(input: Partial<AgentSnapshot>): AgentSnapshot {
  return {
    sessionId: input.sessionId || 'session-1',
    userId: 'user-agent-observability',
    createdAt: input.createdAt || '2026-05-12T10:00:00.000Z',
    updatedAt: input.updatedAt || '2026-05-12T10:05:00.000Z',
    task: input.task || 'Ship persisted agent observability',
    config: input.config || { model: 'openai/gpt-5.4', autonomyLevel: 'supervised', requireApproval: true },
    status: input.status || {},
    steps: input.steps || [],
  }
}

describe('agent observability summaries', () => {
  it('derives execution state from persisted agent snapshots without synthetic runtime claims', () => {
    expect(deriveAgentExecutionState(snapshot({ status: { isRunning: true } }))).toBe('running')
    expect(deriveAgentExecutionState(snapshot({ status: { isPaused: true } }))).toBe('paused')
    expect(deriveAgentExecutionState(snapshot({ status: { currentTask: { status: 'completed' } } }))).toBe('completed')
    expect(deriveAgentExecutionState(snapshot({ status: { currentTask: { status: 'failed' } } }))).toBe('failed')
    expect(deriveAgentExecutionState(snapshot({ steps: [{ id: 'step-1' }] }))).toBe('stopped')
  })

  it('normalizes task metadata for the agent routes', () => {
    const summary = buildAgentExecutionSummary(snapshot({
      sessionId: 'session-normalized',
      status: { currentTask: { status: 'executing', description: 'Apply validated patch' }, iteration: 4 },
    }))

    expect(summary).toMatchObject({
      sessionId: 'session-normalized',
      task: 'Ship persisted agent observability',
      state: 'running',
      iteration: 4,
      model: 'openai/gpt-5.4',
      autonomyLevel: 'supervised',
      requireApproval: true,
      currentTaskStatus: 'executing',
    })
  })

  it('sorts executions by recency and clamps public route limits', () => {
    const overview = buildAgentOverview([
      snapshot({ sessionId: 'older', updatedAt: '2026-05-12T09:00:00.000Z' }),
      snapshot({ sessionId: 'newer', updatedAt: '2026-05-12T11:00:00.000Z', status: { isRunning: true } }),
    ], 1)

    expect(overview.executions).toHaveLength(1)
    expect(overview.executions[0].sessionId).toBe('newer')
    expect(overview.summary.activeExecutions).toBe(1)
    expect(overview.agents[0]).toMatchObject({
      id: 'autonomous-agent',
      status: 'running',
      executions: 1,
    })

    expect(parseAgentLimit('999')).toBe(100)
    expect(parseAgentLimit('0')).toBe(1)
    expect(parseAgentLimit('bad', 25)).toBe(25)
    expect(parseAgentLimit(null, 25)).toBe(25)
  })

  it('reports persisted execution metrics and marks token economics as unmetered until ledger integration', () => {
    const overview = buildAgentOverview([
      snapshot({ sessionId: 'done', status: { currentTask: { status: 'completed' } } }),
      snapshot({ sessionId: 'failed-today', status: { currentTask: { status: 'failed' } } }),
    ])
    const metrics = buildAgentMetrics(overview, new Date('2026-05-12T12:00:00.000Z'))

    expect(metrics.totalAgents).toBe(1)
    expect(metrics.totalExecutions).toBe(2)
    expect(metrics.successRate).toBe(50)
    expect(metrics.errorsToday).toBe(1)
    expect(metrics.metered).toBe(false)
    expect(metrics.costModel).toContain('does-not-meter')
  })
})
