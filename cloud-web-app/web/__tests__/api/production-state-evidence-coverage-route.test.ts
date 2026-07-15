import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'

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

import { GET } from '@/app/api/projects/[id]/production-state/evidence-coverage/route'

describe('api/projects/[id]/production-state/evidence-coverage route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'operator@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-evidence',
      name: 'Evidence coverage workspace',
      template: 'web',
      settings: {
        [PRODUCTION_STATE_SETTINGS_KEY]: {
          version: 1,
          updatedAt: '2026-05-25T10:00:00.000Z',
          brain: {
            objective: 'Evidence coverage route test',
            domain: 'web-app',
            audience: 'Reviewers',
            creativeBible: { style: 'Minimal', tone: 'Clear', story: 'Evidence first', continuity: [] },
            technicalBible: {
              runtimeTargets: ['cloud-sandbox'],
              constraints: [],
              performanceBudget: 'Interactive',
            },
            risks: [],
            decisions: [],
          },
          ledger: [
            {
              id: 'route-evidence-ledger',
              phase: 'Evidence route',
              ownerAgent: 'Release Manager Agent',
              state: 'needs-approval',
              summary: 'Evidence route test.',
              acceptance: ['Evidence attached'],
              evidenceRefs: [
                'mission-ledger:route-evidence-ledger',
                'agent-run:run-1',
                'runtime-job:job-1',
                'human-approval:release-review-1',
              ],
              rollbackPlan: 'Pause release.',
              nextAction: 'Review release.',
              estimatedCostUsd: 0,
              updatedAt: '2026-05-25T10:00:00.000Z',
            },
          ],
          graphs: {
            assetGraph: [],
            sceneWorldGraph: [],
            gameplayGraph: [],
            shotFilmGraph: [],
            validationGraph: [],
            evidenceGraph: [],
            releaseGraph: [],
          },
          runtimePolicy: {
            preferredTarget: 'cloud-sandbox',
            fallbackTarget: 'cloud-sandbox',
            localAcceleration: 'balanced',
            requiresHumanApproval: true,
            maxConcurrentHeavyJobs: 1,
          },
        },
        aethelAgentRunLedger: { entries: [] },
        aethelAgentReadReceipts: { receipts: [] },
      },
    })
  })

  it('returns an evidence ref coverage report for the project production state', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-evidence/production-state/evidence-coverage'),
      { params: { id: 'project-evidence' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.capability).toBe('AETHEL_EVIDENCE_REF_COVERAGE')
    expect(payload.coverage.domains.map((domain: { id: string }) => domain.id)).toEqual(expect.arrayContaining([
      'project-memory',
      'agent-run-ledger',
      'runtime-job',
      'release-approval',
    ]))
  })
})
