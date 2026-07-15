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

import { POST } from '@/app/api/projects/[id]/production-state/asset-quality-job/route'

describe('api/projects/[id]/production-state/asset-quality-job route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'producer@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'AAA quality lane test',
      template: 'unreal',
      userId: 'user-1',
      settings: {
        [PRODUCTION_STATE_SETTINGS_KEY]: buildDefaultAgenticProductionState({
          projectName: 'AAA quality lane test',
          projectType: 'unreal',
          now: '2026-05-25T15:00:00.000Z',
        }),
      },
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('persists asset quality upgrade jobs with planning-only execution and release hold', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/asset-quality-job', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'hero-boss-01',
          assetName: 'Hero Boss',
          goal: 'Upgrade a draft boss into a cinematic-ready character asset.',
          domain: 'character',
          currentTier: 'ai-draft',
          targetTier: 'studio-local-optimized',
          budgetUsd: 25,
          runtimeCapabilities: {
            'studio-local': true,
            meshoptimizer: true,
            gltfpack: true,
            'ktx2-basis': true,
            rapier: true,
            ffmpeg: true,
            'blender-assimp': true,
            'license-provenance-scanner': true,
          },
          evidenceRefs: ['art direction board', 'style tokens', 'silhouette sheet'],
          assetMetadata: {
            fileName: 'hero-boss.glb',
            licenseStatus: 'needs-review',
            triangleBudgetEstimate: 10000,
          },
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.executionAllowed).toBe(false)
    expect(payload.run.runner).toBe('asset-quality-job-runner')
    expect(payload.queueNote).toContain('separate approved Studio Local or Cloud queue action')
    expect(payload.job).toMatchObject({
      kind: 'quality-upgrade',
      assetId: 'hero-boss-01',
      currentTier: 'ai-draft',
      targetTier: 'studio-local-optimized',
      executionAllowed: false,
      humanReviewRequired: true,
    })
    expect(payload.job.blockers).toContain('Draft assets are not final; upgrade requires evidence and review.')
    expect(payload.state.graphs.assetGraph[0]).toMatchObject({
      id: 'quality-upgrade-hero-boss-01',
      status: 'blocked',
    })
    expect(payload.state.graphs.releaseGraph[0].blockers).toContain('Do not auto-publish governed runtime output.')
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              graphs: expect.objectContaining({
                assetGraph: expect.arrayContaining([
                  expect.objectContaining({ id: 'quality-upgrade-hero-boss-01' }),
                ]),
              }),
              runtimePolicy: expect.objectContaining({ requiresHumanApproval: true }),
            }),
          }),
        }),
      }),
    )
  })

  it('rejects invalid asset quality requests before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/asset-quality-job', {
        method: 'POST',
        body: JSON.stringify({ assetId: 'missing-fields' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid asset quality job request' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects viewer collaborators before persisting asset quality jobs', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'AAA quality lane test',
      template: 'unreal',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/asset-quality-job', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'hero-boss-01',
          assetName: 'Hero Boss',
          goal: 'Viewer tries to create quality job.',
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
