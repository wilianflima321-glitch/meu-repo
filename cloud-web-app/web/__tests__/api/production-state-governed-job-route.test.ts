import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY, buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'

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

import { POST } from '@/app/api/projects/[id]/production-state/governed-job/route'

describe('api/projects/[id]/production-state/governed-job route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'producer@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Governed cinematic test',
      template: 'unreal',
      userId: 'user-1',
      settings: {
        [PRODUCTION_STATE_SETTINGS_KEY]: buildDefaultAgenticProductionState({
          projectName: 'Governed cinematic test',
          projectType: 'unreal',
          now: '2026-05-25T12:00:00.000Z',
        }),
      },
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('persists governed runtime jobs while forcing planning-only execution and release hold', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/governed-job', {
        method: 'POST',
        body: JSON.stringify({
          id: 'external-job-tries-to-run',
          kind: 'runtime-render',
          state: 'queued',
          runtimeTarget: 'cloud-sandbox',
          requestedRuntimeTarget: 'cloud-sandbox',
          runtimeCapabilityStatus: 'available',
          executionAllowed: true,
          humanReviewRequired: false,
          estimatedCostUsd: 4,
          estimatedMinutes: 12,
          evidenceRefs: ['render-contract:preview-1'],
          reason: 'External payload attempts to force a cloud render.',
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.executionAllowed).toBe(false)
    expect(payload.queueNote).toContain('separate approved queue action')
    expect(payload.job).toMatchObject({
      id: 'external-job-tries-to-run',
      executionAllowed: false,
      humanReviewRequired: true,
    })
    expect(payload.state.graphs.releaseGraph[0]).toMatchObject({
      id: 'runtime-job-release-external-job-tries-to-run',
      status: 'blocked',
      ownerAgent: 'Release Manager Agent',
    })
    expect(payload.state.graphs.releaseGraph[0].blockers).toContain('Do not auto-publish governed runtime output.')
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              graphs: expect.objectContaining({
                releaseGraph: expect.arrayContaining([
                  expect.objectContaining({ id: 'runtime-job-release-external-job-tries-to-run' }),
                ]),
              }),
              runtimePolicy: expect.objectContaining({ requiresHumanApproval: true }),
            }),
          }),
        }),
      }),
    )
  })

  it('rejects malformed governed jobs before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/governed-job', {
        method: 'POST',
        body: JSON.stringify(null),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid governed runtime job' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects viewer collaborators before persisting governed runtime jobs', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Governed cinematic test',
      template: 'unreal',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/governed-job', {
        method: 'POST',
        body: JSON.stringify({
          id: 'viewer-job',
          kind: 'runtime-render',
          runtimeTarget: 'local-worker',
          requestedRuntimeTarget: 'local-worker',
          runtimeCapabilityStatus: 'available',
          reason: 'Viewer tries to persist a job.',
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
