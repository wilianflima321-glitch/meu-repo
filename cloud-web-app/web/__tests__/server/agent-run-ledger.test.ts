import { describe, expect, it } from 'vitest'

import {
  AGENT_RUN_LEDGER_SETTINGS_KEY,
  buildAgentRunLedger,
  buildAgentRunLedgerEntry,
  filterAgentSnapshotsForProject,
  mergeAgentRunLedgerIntoProductionState,
  readAgentRunLedgerFromSettings,
  writeAgentRunLedgerToSettings,
} from '@/lib/server/agent-run-ledger'
import type { AgentSnapshot } from '@/lib/server/agent-store'
import { buildDefaultAgenticProductionState, PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'

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

  it('filters snapshots by project before project-memory sync', () => {
    const projectRun = snapshot({
      sessionId: 'project-run',
      config: { projectId: 'project-a', role: 'engineer' },
    })
    const otherRun = snapshot({
      sessionId: 'other-run',
      config: { projectId: 'project-b', role: 'engineer' },
    })

    expect(filterAgentSnapshotsForProject([projectRun, otherRun], 'project-a')).toEqual([projectRun])
  })

  it('merges agent run ledger into Project Brain, Mission Ledger, and evidence graphs', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Agent run memory', projectType: 'web' })
    const ledger = buildAgentRunLedger([
      snapshot({
        sessionId: 'project-run-ready',
        config: {
          projectId: 'project-a',
          role: 'engineer',
          branchName: 'codex/project-run-ready',
          pullRequestUrl: 'https://github.com/acme/aethel/pull/88',
        },
        steps: [{
          id: 'step-1',
          evidenceRefs: ['preview:https://preview.example.com', 'replay:s3://evidence/project-run-ready.webm'],
        }],
      }),
    ])
    const merged = mergeAgentRunLedgerIntoProductionState(state, ledger)

    expect(merged.ledger[0]).toMatchObject({
      id: 'agent-run-ledger',
      ownerAgent: 'Release Manager Agent',
      state: 'needs-approval',
    })
    expect(merged.graphs.evidenceGraph[0]).toMatchObject({
      id: 'agent-run-ledger-evidenceGraph',
      status: 'needs-review',
    })
    expect(merged.brain.technicalBible.constraints.join(' ')).toContain('Agent execution claims require AgentRunLedger evidence')
    expect(merged.runtimePolicy.requiresHumanApproval).toBe(true)
  })

  it('persists agent run ledger in project settings', () => {
    const ledger = buildAgentRunLedger([snapshot({ sessionId: 'persisted-run' })])
    const settings = writeAgentRunLedgerToSettings({ [PRODUCTION_STATE_SETTINGS_KEY]: { version: 1 } }, ledger)

    expect(settings[AGENT_RUN_LEDGER_SETTINGS_KEY]).toMatchObject({ responsibilityModel: 'human-owner-required' })
    expect(readAgentRunLedgerFromSettings(settings)?.entries[0]).toMatchObject({ sessionId: 'persisted-run' })
    expect(readAgentRunLedgerFromSettings({ [AGENT_RUN_LEDGER_SETTINGS_KEY]: { entries: [] } })).toBeNull()
  })
})
