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

import { POST } from '@/app/api/projects/[id]/production-state/game-spine/playtest/route'

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: 'playtest-boss-01',
    buildId: 'build-42',
    scenario: 'Boss arena first combat loop',
    runtimeTarget: 'cloud-sandbox',
    capturedAt: '2026-05-14T13:00:00.000Z',
    artifacts: [
      { kind: 'replay', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/replay.json' },
      { kind: 'performance-trace', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/perf.json' },
      { kind: 'bug-report', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/bugs.json' },
    ],
    metrics: {
      durationSeconds: 180,
      averageFps: 72,
      p95FrameTimeMs: 18,
      inputLatencyMs: 38,
      crashCount: 0,
      blockerBugCount: 0,
      majorBugCount: 1,
      completionRate: 1,
    },
    validation: {
      playable: true,
      crashFree: true,
      performanceOk: true,
      inputOk: true,
      progressionOk: true,
      accessibilityOk: true,
      humanFeelReviewOk: true,
    },
    ...overrides,
  }
}

describe('api/projects/[id]/production-state/game-spine/playtest route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'qa@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight',
      template: 'unreal',
      userId: 'user-1',
      settings: null,
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('persists playtest evidence without marking release ready', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/game-spine/playtest', {
        method: 'POST',
        body: JSON.stringify({ evidence: evidence() }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.releaseReady).toBe(false)
    expect(payload.releaseNote).toContain('Human release approval')
    expect(payload.state.graphs.releaseGraph[0]).toMatchObject({
      id: 'game-playtest-release-playtest-boss-01',
      status: 'needs-review',
      ownerAgent: 'Release Producer Agent',
    })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              graphs: expect.objectContaining({
                validationGraph: expect.arrayContaining([
                  expect.objectContaining({ id: 'game-playtest-validation-playtest-boss-01' }),
                ]),
              }),
            }),
          }),
        }),
      })
    )
  })

  it('rejects malformed evidence before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/game-spine/playtest', {
        method: 'POST',
        body: JSON.stringify({ evidence: { sessionId: 'bad', artifacts: [] } }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid game playtest evidence' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects internal playtest artifacts from another project', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/game-spine/playtest', {
        method: 'POST',
        body: JSON.stringify({
          evidence: evidence({
            artifacts: [
              { kind: 'replay', url: 'aethel-artifact://playtest/other-project/playtest-boss-01/replay.json' },
              { kind: 'performance-trace', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/perf.json' },
              { kind: 'bug-report', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/bugs.json' },
            ],
          }),
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Playtest artifact does not belong to this project' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects viewer collaborators before writing playtest evidence', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight',
      template: 'unreal',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/game-spine/playtest', {
        method: 'POST',
        body: JSON.stringify({ evidence: evidence() }),
      }),
      { params: { id: 'project-1' } }
    )

    expect(response.status).toBe(403)
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
