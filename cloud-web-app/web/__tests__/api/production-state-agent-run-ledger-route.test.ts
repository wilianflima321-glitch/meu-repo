import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { AGENT_RUN_LEDGER_SETTINGS_KEY } from '@/lib/server/agent-run-ledger'

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

const agentStoreMocks = vi.hoisted(() => ({
  listAgentSnapshots: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/server/agent-store', () => agentStoreMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { GET, POST } from '@/app/api/projects/[id]/production-state/agent-run-ledger/route'

describe('api/projects/[id]/production-state/agent-run-ledger route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'operator@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-agent-runs',
      name: 'Agent evidence workspace',
      template: 'web',
      userId: 'user-1',
      settings: {},
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-agent-runs' })
    agentStoreMocks.listAgentSnapshots.mockResolvedValue([
      {
        sessionId: 'run-project-1',
        userId: 'user-1',
        createdAt: '2026-05-25T10:00:00.000Z',
        updatedAt: '2026-05-25T10:10:00.000Z',
        task: 'Ship evidence-backed agent run',
        config: {
          projectId: 'project-agent-runs',
          role: 'engineer',
          branchName: 'codex/evidence-run',
          pullRequestUrl: 'https://github.com/acme/aethel/pull/101',
        },
        status: { currentTask: { status: 'completed' } },
        steps: [
          {
            id: 'step-1',
            evidenceRefs: ['preview:https://preview.example.com', 'replay:s3://evidence/run-project-1.webm'],
          },
        ],
      },
      {
        sessionId: 'run-other-project',
        userId: 'user-1',
        createdAt: '2026-05-25T10:00:00.000Z',
        updatedAt: '2026-05-25T10:11:00.000Z',
        config: { projectId: 'other-project', role: 'qa' },
        status: { currentTask: { status: 'completed' } },
        steps: [],
      },
    ])
  })

  it('persists project-scoped agent run ledger into production memory', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-agent-runs/production-state/agent-run-ledger', {
        method: 'POST',
      }),
      { params: { id: 'project-agent-runs' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.runLedger.summary).toMatchObject({ totalRuns: 1, blockedRuns: 0 })
    expect(payload.runLedger.entries[0]).toMatchObject({ sessionId: 'run-project-1' })
    expect(payload.runLedger.entries.some((entry: { sessionId: string }) => entry.sessionId === 'run-other-project')).toBe(false)
    expect(payload.productionState.ledger[0]).toMatchObject({ id: 'agent-run-ledger' })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-agent-runs' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [AGENT_RUN_LEDGER_SETTINGS_KEY]: expect.objectContaining({
              responsibilityModel: 'human-owner-required',
              entries: expect.arrayContaining([expect.objectContaining({ sessionId: 'run-project-1' })]),
            }),
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([expect.objectContaining({ id: 'agent-run-ledger' })]),
              graphs: expect.objectContaining({
                evidenceGraph: expect.arrayContaining([expect.objectContaining({ id: 'agent-run-ledger-evidenceGraph' })]),
              }),
            }),
          }),
        }),
      }),
    )
  })

  it('reads live and persisted agent run ledgers', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-agent-runs',
      name: 'Agent evidence workspace',
      template: 'web',
      userId: 'user-1',
      settings: {
        [AGENT_RUN_LEDGER_SETTINGS_KEY]: {
          entries: [],
          summary: {
            totalRuns: 0,
            activeRuns: 0,
            runsWithEvidence: 0,
            runsWithReviewArtifact: 0,
            runsReadyForHumanReview: 0,
            blockedRuns: 0,
            lastUpdatedAt: null,
          },
          retention: 'local-agent-store',
          capabilityStatus: 'READY',
          responsibilityModel: 'human-owner-required',
        },
      },
      members: [],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-agent-runs/production-state/agent-run-ledger'),
      { params: { id: 'project-agent-runs' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.liveLedger.summary.totalRuns).toBe(1)
    expect(payload.hasPersistedLedger).toBe(true)
    expect(payload.settingsKey).toBe(AGENT_RUN_LEDGER_SETTINGS_KEY)
  })

  it('rejects viewer-only collaborators before mutating agent run memory', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-agent-runs',
      name: 'Viewer agent run memory',
      template: 'web',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-agent-runs/production-state/agent-run-ledger', {
        method: 'POST',
      }),
      { params: { id: 'project-agent-runs' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
