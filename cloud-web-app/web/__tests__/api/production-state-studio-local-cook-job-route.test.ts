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

import { POST } from '@/app/api/projects/[id]/production-state/studio-local-cook-job/route'

describe('api/projects/[id]/production-state/studio-local-cook-job route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'producer@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Cook queue test',
      template: 'unreal',
      userId: 'user-1',
      settings: {
        [PRODUCTION_STATE_SETTINGS_KEY]: buildDefaultAgenticProductionState({
          projectName: 'Cook queue test',
          projectType: 'unreal',
          now: '2026-05-25T16:00:00.000Z',
        }),
      },
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('persists Studio Local cook jobs as governed planning-only production state', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/studio-local-cook-job', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'hero-boss-01',
          assetName: 'Hero Boss',
          goal: 'Prepare a cinematic-ready local cook packet.',
          sourceAssetUri: 's3://assets/hero-boss/source.glb',
          sourceSha256: 'sha256:hero-boss-source',
          sourceFormat: 'glb',
          currentTier: 'curated-marketplace',
          targetTier: 'studio-local-optimized',
          availableTools: ['gltf-transform', 'blender-headless', 'meshoptimizer', 'ktx-software-basisu', 'recast-detour', 'rapier-physics', 'ffmpeg'],
          evidenceRefs: ['source asset manifest', 'download hash', 'source sha256', 'license/provenance receipt'],
          estimatedCostUsd: 3,
          estimatedMinutes: 20,
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.executionAllowed).toBe(false)
    expect(payload.dispatchAllowed).toBe(false)
    expect(payload.plan.queue).toBe('studio-local-cook-queue')
    expect(payload.queueNote).toContain('signed daemon dispatch')
    expect(payload.job).toMatchObject({
      kind: 'asset-import',
      runtimeTarget: 'local-native',
      executionAllowed: false,
      humanReviewRequired: true,
    })
    expect(payload.state.graphs.releaseGraph[0].blockers).toContain('Do not auto-publish governed runtime output.')
    expect(payload.state.graphs.validationGraph[0].blockers).toContain('Native execution requires signed Studio Local daemon dispatch.')
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              runtimePolicy: expect.objectContaining({ requiresHumanApproval: true }),
            }),
          }),
        }),
      }),
    )
  })

  it('rejects invalid cook requests before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/studio-local-cook-job', {
        method: 'POST',
        body: JSON.stringify({ assetId: 'missing-fields' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid Studio Local cook job request' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects viewer collaborators before persisting cook jobs', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Cook queue test',
      template: 'unreal',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/studio-local-cook-job', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'hero-boss-01',
          assetName: 'Hero Boss',
          goal: 'Viewer tries to cook.',
          sourceAssetUri: 's3://assets/hero-boss/source.glb',
          sourceSha256: 'sha256:hero-boss-source',
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
