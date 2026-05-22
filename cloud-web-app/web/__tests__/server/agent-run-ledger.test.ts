import { describe, expect, it } from 'vitest'

import {
  buildAgentRunLedger,
  buildAgentRunLedgerEntry,
} from '@/lib/server/agent-run-ledger'
import type { AgentSnapshot } from '@/lib/server/agent-store'

function snapshot(input: Partial<AgentSnapshot>): AgentSnapshot {
  return {
    sessionId: input.sessionId || 'agent-run-1',
    userId: 'user-agent-ledger',
    createdAt: input.createdAt || '2026-05-22T10:00:00.000Z',
    updatedAt: input.updatedAt || '2026-05-22T10:05:00.000Z',
    task: input.task || 'Ship evidence-backed agent work',
    config: input.config || {
      role: 'engineer',
      model: 'openai/gpt-5.4',
      branchName: 'codex/evidence-backed-agent-work',
      pullRequestUrl: 'https://github.com/acme/aethel/pull/42',
    },
    status: input.status || { currentTask: { status: 'completed' } },
    steps: input.steps || [
      {
        id: 'step-1',
        evidenceRefs: ['preview:https://aethel-preview.test', 'replay:s3://evidence/agent-run-1.webm'],
      },
    ],
  }
}

describe('agent run ledger', () => {
  it('builds reviewable agent run artifacts from persisted snapshots', () => {
    const entry = buildAgentRunLedgerEntry(snapshot({ sessionId: 'agent-run-reviewable' }))

    expect(entry).toMatchObject({
      id: 'agent-run:agent-run-reviewable',
      role: 'engineer',
      state: 'completed',
      branchName: 'codex/evidence-backed-agent-work',
      pullRequestUrl: 'https://github.com/acme/aethel/pull/42',
      marketReadiness: 'needs-review',
    })
    expect(entry.evidenceRefs).toEqual(expect.arrayContaining([
      'preview:https://aethel-preview.test',
      'replay:s3://evidence/agent-run-1.webm',
    ]))
    expect(entry.artifacts.map((artifact) => artifact.kind)).toEqual(expect.arrayContaining([
      'pull-request',
      'preview',
      'replay',
      'branch',
    ]))
    expect(entry.availableControls).toEqual(expect.arrayContaining(['request-review', 'approve']))
  })

  it('blocks market-ready claims when evidence or review artifacts are missing', () => {
    const entry = buildAgentRunLedgerEntry(snapshot({
      sessionId: 'agent-run-blocked',
      config: { role: 'designer' },
      steps: [],
      status: { currentTask: { status: 'completed' } },
    }))

    expect(entry.marketReadiness).toBe('blocked')
    expect(entry.missingMarketEvidence).toEqual(expect.arrayContaining([
      'Evidence refs required before agent work can be trusted.',
      'Branch or pull request artifact required for reviewable code changes.',
      'Preview, replay, or screenshot artifact required for visual/product changes.',
    ]))
  })

  it('summarizes active, evidence-backed, and blocked runs', () => {
    const ledger = buildAgentRunLedger([
      snapshot({ sessionId: 'complete-run', updatedAt: '2026-05-22T11:00:00.000Z' }),
      snapshot({
        sessionId: 'running-run',
        updatedAt: '2026-05-22T12:00:00.000Z',
        status: { isRunning: true },
      }),
      snapshot({
        sessionId: 'blocked-run',
        updatedAt: '2026-05-22T09:00:00.000Z',
        config: { role: 'qa' },
        steps: [],
      }),
    ])

    expect(ledger.summary).toMatchObject({
      totalRuns: 3,
      activeRuns: 1,
      runsWithEvidence: 2,
      runsReadyForHumanReview: 1,
      blockedRuns: 2,
      lastUpdatedAt: '2026-05-22T12:00:00.000Z',
    })
    expect(ledger.responsibilityModel).toBe('human-owner-required')
  })
})
