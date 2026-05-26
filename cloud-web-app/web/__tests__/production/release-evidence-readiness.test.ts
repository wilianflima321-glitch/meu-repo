import { describe, expect, it } from 'vitest'

import {
  buildDefaultAgenticProductionState,
  mergeAgenticProductionState,
  type AgenticProductionState,
  type ProductionGraphKey,
} from '@/lib/production/agentic-production-state'
import { buildEvidenceRefCoverageReport } from '@/lib/production/evidence-ref-coverage'
import {
  buildReleaseEvidenceReadinessSnapshot,
  mergeReleaseEvidenceReviewRequestIntoProductionState,
} from '@/lib/production/release-evidence-readiness'
import { buildRuntimeJobReceiptState, RUNTIME_JOB_RECEIPTS_SETTINGS_KEY } from '@/lib/production/runtime-job-receipts'

const NOW = '2026-05-26T12:00:00.000Z'

function graphReadyState(projectType = 'web'): AgenticProductionState {
  const base = buildDefaultAgenticProductionState({ projectName: 'Release evidence workspace', projectType, now: NOW })
  const graphKeys = Object.keys(base.graphs) as ProductionGraphKey[]
  const graphs = graphKeys.reduce<Partial<Record<ProductionGraphKey, AgenticProductionState['graphs'][ProductionGraphKey]>>>(
    (acc, key) => {
      acc[key] = [
        {
          ...base.graphs[key][0],
          status: 'needs-review',
          evidenceRefs: [`mission-ledger:${key}`, `runtime-job:job-1`, `graph-evidence:${key}`],
          blockers: [],
          updatedAt: NOW,
        },
      ]
      return acc
    },
    {},
  )

  return mergeAgenticProductionState(
    base,
    {
      ledger: [
        {
          id: 'release-evidence-ledger',
          phase: 'Release evidence package',
          ownerAgent: 'Release Manager Agent',
          state: 'needs-approval',
          summary: 'Release evidence package is ready for owner review.',
          acceptance: ['Production graphs have evidence', 'Runtime receipts attached'],
          evidenceRefs: ['mission-ledger:release-evidence-ledger', 'runtime-job:job-1', 'agent-run:run-1'],
          rollbackPlan: 'Pause release and restore the last approved checkpoint.',
          nextAction: 'Request human owner review.',
          estimatedCostUsd: 0,
          updatedAt: NOW,
        },
      ],
      graphs,
      runtimePolicy: {
        preferredTarget: 'cloud-sandbox',
        fallbackTarget: 'cloud-sandbox',
        requiresHumanApproval: true,
      },
    },
    NOW,
  )
}

function fullRuntimeReceiptState() {
  return buildRuntimeJobReceiptState({
    projectId: 'project-release-readiness',
    now: NOW,
    receipts: [
      { jobId: 'job-1', kind: 'dispatch', runtimeTarget: 'cloud-sandbox', capturedBy: 'Runtime Agent', capturedAt: NOW, refs: ['runtime-job:job-1'] },
      { jobId: 'job-1', kind: 'capability-probe', runtimeTarget: 'cloud-sandbox', capturedBy: 'Runtime Agent', capturedAt: NOW, refs: ['capability:cloud-sandbox'] },
      { jobId: 'job-1', kind: 'cost-meter', runtimeTarget: 'cloud-sandbox', capturedBy: 'Cost Governor Agent', capturedAt: NOW, refs: ['cost:0.010000'], costUsd: 0.01 },
      { jobId: 'job-1', kind: 'artifact', runtimeTarget: 'cloud-sandbox', capturedBy: 'Runtime Agent', capturedAt: NOW, refs: ['artifact:preview-build'] },
      { jobId: 'job-1', kind: 'validation', runtimeTarget: 'cloud-sandbox', capturedBy: 'QA Agent', capturedAt: NOW, refs: ['validation:runtime-pass'] },
      { jobId: 'job-1', kind: 'teardown', runtimeTarget: 'cloud-sandbox', capturedBy: 'Runtime Agent', capturedAt: NOW, refs: ['teardown:cloud-session-ended'] },
    ],
  })
}

function coverageFor(state: AgenticProductionState, settings: Record<string, unknown> = {}) {
  return buildEvidenceRefCoverageReport({
    state,
    settings: {
      ...settings,
      [RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]: fullRuntimeReceiptState(),
      aethelAgentRunLedger: { entries: [] },
      aethelAgentReadReceipts: { receipts: [] },
    },
  })
}

describe('release evidence readiness', () => {
  it('blocks release review when production evidence and runtime receipts are missing', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Unready workspace', projectType: 'web', now: NOW })
    const snapshot = buildReleaseEvidenceReadinessSnapshot({
      state,
      evidenceCoverage: buildEvidenceRefCoverageReport({ state, settings: {} }),
      runtimeReceiptState: null,
      now: NOW,
    })

    expect(snapshot.capability).toBe('AETHEL_RELEASE_EVIDENCE_READINESS')
    expect(snapshot.status).toBe('blocked')
    expect(snapshot.releaseReady).toBe(false)
    expect(snapshot.humanApprovalRequired).toBe(true)
    expect(snapshot.canRequestHumanReview).toBe(false)
    expect(snapshot.lanes.find((lane) => lane.id === 'runtime-receipts')).toMatchObject({
      required: true,
      status: 'missing',
    })
  })

  it('allows requesting human review when every non-human evidence lane is covered', () => {
    const state = graphReadyState('web')
    const receiptState = fullRuntimeReceiptState()
    const snapshot = buildReleaseEvidenceReadinessSnapshot({
      state,
      evidenceCoverage: coverageFor(state),
      runtimeReceiptState: receiptState,
      now: NOW,
    })

    expect(snapshot.status).toBe('needs-review')
    expect(snapshot.canRequestHumanReview).toBe(true)
    expect(snapshot.releaseReady).toBe(false)
    expect(snapshot.lanes.find((lane) => lane.id === 'human-approval')).toMatchObject({
      required: true,
      status: 'missing',
    })
    expect(snapshot.nextAction).toContain('human owner review')
  })

  it('persists a human review request without marking release ready', () => {
    const state = graphReadyState('web')
    const snapshot = buildReleaseEvidenceReadinessSnapshot({
      state,
      evidenceCoverage: coverageFor(state),
      runtimeReceiptState: fullRuntimeReceiptState(),
      now: NOW,
    })

    const result = mergeReleaseEvidenceReviewRequestIntoProductionState({
      state,
      snapshot,
      requestedBy: 'Release Manager Agent',
      requestedAt: NOW,
    })

    expect(result.accepted).toBe(true)
    expect(result.releaseReady).toBe(false)
    expect(result.state.ledger[0]).toMatchObject({
      id: 'release-evidence-review-request',
      state: 'needs-approval',
    })
    expect(result.state.graphs.releaseGraph[0]).toMatchObject({
      id: 'release-evidence-review-request',
      status: 'needs-review',
    })
    expect(result.nextAction).toContain('no automatic publish')
  })

  it('rejects human review requests while non-human evidence lanes are blocked', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Blocked workspace', projectType: 'game', now: NOW })
    const snapshot = buildReleaseEvidenceReadinessSnapshot({
      state,
      evidenceCoverage: buildEvidenceRefCoverageReport({ state, settings: {} }),
      runtimeReceiptState: null,
      now: NOW,
    })

    const result = mergeReleaseEvidenceReviewRequestIntoProductionState({
      state,
      snapshot,
      requestedBy: 'Release Manager Agent',
      requestedAt: NOW,
    })

    expect(result.accepted).toBe(false)
    expect(result.releaseReady).toBe(false)
    expect(result.state).toBe(state)
    expect(result.blockers.join(' ')).toContain('Non-human release evidence lanes')
  })

  it('requires final asset and playtest evidence for game production packages', () => {
    const state = graphReadyState('game')
    const snapshot = buildReleaseEvidenceReadinessSnapshot({
      state,
      evidenceCoverage: coverageFor(state),
      runtimeReceiptState: fullRuntimeReceiptState(),
      now: NOW,
    })

    expect(snapshot.status).toBe('blocked')
    expect(snapshot.lanes.find((lane) => lane.id === 'asset-final')).toMatchObject({
      required: true,
      status: 'missing',
    })
    expect(snapshot.lanes.find((lane) => lane.id === 'playtest')).toMatchObject({
      required: true,
      status: 'missing',
    })
  })

  it('keeps completed evidence packages as evidence-backed, never auto release-ready', () => {
    const state = mergeAgenticProductionState(
      graphReadyState('web'),
      {
        ledger: [
          {
            id: 'release-approval-ledger',
            phase: 'Human approval',
            ownerAgent: 'Founder',
            state: 'needs-approval',
            summary: 'Owner approval evidence attached for review package.',
            acceptance: ['Approval record attached'],
            evidenceRefs: ['mission-ledger:release-approval-ledger', 'human-approval:release-review-1'],
            rollbackPlan: 'Cancel release and restore prior checkpoint.',
            nextAction: 'Manual owner publish action.',
            estimatedCostUsd: 0,
            updatedAt: NOW,
          },
        ],
      },
      NOW,
    )
    const snapshot = buildReleaseEvidenceReadinessSnapshot({
      state,
      evidenceCoverage: coverageFor(state),
      runtimeReceiptState: fullRuntimeReceiptState(),
      now: NOW,
    })

    expect(snapshot.status).toBe('evidence-backed')
    expect(snapshot.releaseReady).toBe(false)
    expect(snapshot.nextAction).toContain('manual owner action')
  })
})
