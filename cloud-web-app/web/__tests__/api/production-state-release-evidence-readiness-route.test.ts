import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  buildDefaultAgenticProductionState,
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
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { GET } from '@/app/api/projects/[id]/production-state/release-evidence-readiness/route'

const NOW = '2026-05-26T12:00:00.000Z'

describe('api/projects/[id]/production-state/release-evidence-readiness route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'operator@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })

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
})