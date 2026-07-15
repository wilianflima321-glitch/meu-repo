import { describe, expect, it } from 'vitest'

import {
  buildDefaultAgenticProductionState,
  mergeAgenticProductionState,
  PRODUCTION_STATE_SETTINGS_KEY,
} from '@/lib/production/agentic-production-state'
import { buildEvidenceRefCoverageReport } from '@/lib/production/evidence-ref-coverage'

describe('evidence ref coverage', () => {
  it('blocks market-ready claims when required project evidence is missing', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Evidence coverage baseline', projectType: 'web' })
    const report = buildEvidenceRefCoverageReport({ state, settings: { [PRODUCTION_STATE_SETTINGS_KEY]: state } })

    expect(report.capability).toBe('AETHEL_EVIDENCE_REF_COVERAGE')
    expect(report.marketReady).toBe(false)
    expect(report.capabilityStatus).toBe('blocked')
    expect(report.domains.find((domain) => domain.id === 'release-approval')).toMatchObject({
      required: true,
      status: 'missing',
    })
    expect(report.blockers).toEqual(expect.arrayContaining([
      'Human release approval evidence is required before release can be marked ready.',
    ]))
  })

  it('recognizes persisted research, browser, agent-run, runtime, and approval evidence', () => {
    const base = buildDefaultAgenticProductionState({ projectName: 'Evidence-backed app', projectType: 'web' })
    const state = mergeAgenticProductionState(base, {
      ledger: [
        {
          id: 'evidence-backed-run',
          phase: 'Evidence-backed production',
          ownerAgent: 'Release Manager Agent',
          state: 'needs-approval',
          summary: 'All critical evidence receipts are attached.',
          acceptance: ['Evidence refs attached', 'Human approval ready'],
          evidenceRefs: [
            'mission-ledger:evidence-backed-run',
            'research-intelligence:packet-1',
            'research-navigation-mesh:available',
            'agent-run:run-1',
            'runtime-job:job-1',
            'human-approval:release-review-1',
          ],
          rollbackPlan: 'Pause release and restore prior approved checkpoint.',
          nextAction: 'Request final human review.',
          estimatedCostUsd: 0,
          updatedAt: '2026-05-25T10:00:00.000Z',
        },
      ],
      graphs: {
        evidenceGraph: [
          {
            id: 'evidence-backed-node',
            label: 'Evidence-backed node',
            status: 'needs-review',
            ownerAgent: 'Release Manager Agent',
            evidenceRefs: [
              'preview:https://preview.example.com',
              'replay:s3://evidence/run-1.webm',
            ],
            blockers: [],
            updatedAt: '2026-05-25T10:00:00.000Z',
          },
        ],
        validationGraph: [
          {
            id: 'validation-backed-node',
            label: 'Validation-backed node',
            status: 'needs-review',
            ownerAgent: 'QA Agent',
            evidenceRefs: ['approval-record:release-review-1'],
            blockers: [],
            updatedAt: '2026-05-25T10:00:00.000Z',
          },
        ],
      },
      runtimePolicy: {
        requiresHumanApproval: true,
      },
    })
    const report = buildEvidenceRefCoverageReport({
      state,
      settings: {
        aethelResearchIntelligencePacket: { id: 'packet-1' },
        aethelResearchNavigationMesh: { version: 1 },
        aethelAgentRunLedger: { entries: [] },
        aethelAgentReadReceipts: { receipts: [] },
      },
    })

    expect(report.coveragePercent).toBe(100)
    expect(report.domains.filter((domain) => domain.required).every((domain) => domain.status === 'covered')).toBe(true)
    expect(report.nextAction).toContain('human release review')
  })

  it('requires playtest and asset quality evidence for game production', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Game evidence', projectType: 'game' })
    const report = buildEvidenceRefCoverageReport({ state, settings: {} })

    expect(report.domains.find((domain) => domain.id === 'asset-quality')).toMatchObject({
      required: true,
      status: 'missing',
    })
    expect(report.domains.find((domain) => domain.id === 'playtest')).toMatchObject({
      required: true,
      status: 'missing',
    })
  })
})
