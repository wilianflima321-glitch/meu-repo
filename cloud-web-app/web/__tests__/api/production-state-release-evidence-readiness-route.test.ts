import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  buildDefaultAgenticProductionState,
  mergeAgenticProductionState,
  type AgenticProductionState,
  type ProductionGraphKey,
  PRODUCTION_STATE_SETTINGS_KEY,
} from '@/lib/production/agentic-production-state'
import { buildRuntimeJobReceiptState, RUNTIME_JOB_RECEIPTS_SETTINGS_KEY } from '@/lib/production/runtime-job-receipts'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { GET, POST } from '@/app/api/projects/[id]/production-state/release-evidence-readiness/route'

const NOW = '2026-05-26T12:00:00.000Z'

function graphReadyState(projectType = 'web'): AgenticProductionState {
  const base = buildDefaultAgenticProductionState({ projectName: 'Release evidence route workspace', projectType, now: NOW })
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

describe('api/projects/[id]/production-state/release-evidence-readiness route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'operator@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.update.mockResolvedValue({})

    const state = buildDefaultAgenticProductionState({
      projectName: 'Release evidence route workspace',
      projectType: 'game',
      now: NOW,
    })
    const receiptState = buildRuntimeJobReceiptState({
      projectId: 'project-release-readiness',
      now: NOW,
      receipts: [
        { jobId: 'job-1', kind: 'dispatch', runtimeTarget: 'cloud-sandbox', capturedBy: 'Runtime Agent', capturedAt: NOW, refs: ['runtime-job:job-1'] },
        { jobId: 'job-1', kind: 'capability-probe', runtimeTarget: 'cloud-sandbox', capturedBy: 'Runtime Agent', capturedAt: NOW, refs: ['capability:cloud-sandbox'] },
      ],
    })

    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-release-readiness',
      name: 'Release evidence route workspace',
      template: 'game',
      userId: 'user-1',
      members: [],
      settings: {
        [PRODUCTION_STATE_SETTINGS_KEY]: state,
        [RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]: receiptState,
        aethelAgentReadReceipts: { receipts: [] },
      },
    })
  })

  it('returns a governed release evidence readiness snapshot without release-ready claims', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-release-readiness/production-state/release-evidence-readiness'),
      { params: { id: 'project-release-readiness' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.capability).toBe('AETHEL_RELEASE_EVIDENCE_READINESS')
    expect(payload.releaseReady).toBe(false)
    expect(payload.snapshot.releaseReady).toBe(false)
    expect(payload.snapshot.humanApprovalRequired).toBe(true)
    expect(payload.snapshot.lanes.map((lane: { id: string }) => lane.id)).toEqual(expect.arrayContaining([
      'production-state',
      'evidence-coverage',
      'runtime-receipts',
      'asset-final',
      'playtest',
      'human-approval',
    ]))
  })

  it('rejects review requests while release evidence is blocked', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-release-readiness/production-state/release-evidence-readiness', { method: 'POST' }),
      { params: { id: 'project-release-readiness' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.releaseReady).toBe(false)
    expect(payload.nextAction).toBeTruthy()
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('persists a governed review request when non-human evidence lanes are covered', async () => {
    const state = graphReadyState('web')
    prismaMocks.prisma.project.findFirst.mockResolvedValueOnce({
      id: 'project-release-readiness',
      name: 'Release evidence route workspace',
      template: 'web',
      userId: 'user-1',
      members: [],
      settings: {
        [PRODUCTION_STATE_SETTINGS_KEY]: state,
        [RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]: fullRuntimeReceiptState(),
        aethelAgentReadReceipts: { receipts: [] },
        aethelAgentRunLedger: { entries: [] },
      },
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-release-readiness/production-state/release-evidence-readiness', { method: 'POST' }),
      { params: { id: 'project-release-readiness' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.releaseReady).toBe(false)
    expect(payload.reviewRequestId).toBe('release-evidence-review-request')
    expect(payload.productionState.ledger[0].id).toBe('release-evidence-review-request')
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'project-release-readiness' },
    }))
  })
})
