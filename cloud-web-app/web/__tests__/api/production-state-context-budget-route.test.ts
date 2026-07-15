import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY,
} from '@/lib/production/repository-context-budget-execution'
import {
  buildRepositoryCartographyManifest,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'

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

import { GET, PATCH } from '@/app/api/projects/[id]/production-state/context-budget/route'

const now = '2026-05-04T23:55:00.000Z'

function buildSettings() {
  const manifest = buildRepositoryCartographyManifest({
    projectId: 'project-1',
    generatedAt: now,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 800 },
      { path: 'docs/story-bible.md', sizeBytes: 4_000 },
      { path: 'assets/hero.glb', sizeBytes: 80 * 1024 * 1024, license: 'internal' },
    ],
  })
  return writeRepositoryCartographyManifestToSettings({}, manifest)
}

describe('api/projects/[id]/production-state/context-budget route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      settings: buildSettings(),
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('returns execution batches from the persisted cartography manifest', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/projects/project-1/production-state/context-budget'), {
      params: { id: 'project-1' },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasManifest).toBe(true)
    expect(payload.settingsKey).toBe(REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY)
    expect(payload.execution.batches.map((batch: { id: string }) => batch.id)).toEqual(
      expect.arrayContaining(['read-canonical-contracts', 'index-heavy-surfaces'])
    )
  })

  it('persists batch status, evidence, and progress', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/context-budget', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          batchId: 'index-heavy-surfaces',
          status: 'running',
          completedSurfaceCount: 1,
          evidenceRefs: ['context-budget:index-heavy-surfaces:preview'],
        }),
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.execution.batches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'index-heavy-surfaces',
          status: 'running',
          completedSurfaceCount: 1,
          evidenceRefs: ['context-budget:index-heavy-surfaces:preview'],
        }),
      ])
    )
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY]: expect.objectContaining({
              batches: expect.arrayContaining([expect.objectContaining({ id: 'index-heavy-surfaces', status: 'running' })]),
            }),
          }),
        }),
      })
    )
  })

  it('rejects viewer-only collaborators before changing execution state', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      userId: 'owner-1',
      settings: buildSettings(),
      members: [{ role: 'viewer' }],
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/context-budget', {
        method: 'PATCH',
        body: JSON.stringify({ batchId: 'read-canonical-contracts', status: 'complete' }),
      }),
      { params: { id: 'project-1' } }
    )

    expect(response.status).toBe(403)
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('requires Repository Cartography before updating batch state', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      settings: {},
      members: [],
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/context-budget', {
        method: 'PATCH',
        body: JSON.stringify({ batchId: 'read-canonical-contracts', status: 'complete' }),
      }),
      { params: { id: 'project-1' } }
    )

    expect(response.status).toBe(409)
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
