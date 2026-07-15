import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { buildViewportAssetImportBatch, buildViewportImportedObjects } from '@/lib/viewport/viewport-asset-import'

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

import { POST } from '@/app/api/projects/[id]/production-state/asset-import/route'

function buildBatch() {
  return buildViewportAssetImportBatch(
    buildViewportImportedObjects({
      existingCount: 0,
      importedAt: '2026-05-11T12:00:00.000Z',
      files: [{ fileName: 'Boss Arena.glb', sizeBytes: 6_291_456 }],
    }),
    {
      id: 'batch-boss-arena',
      projectId: 'project-1',
      importedAt: '2026-05-11T12:00:00.000Z',
    },
  )
}

describe('api/projects/[id]/production-state/asset-import route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight prototype',
      template: 'unreal',
      userId: 'user-1',
      settings: null,
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('persists viewport asset intake into durable production state for owners', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/asset-import', {
        method: 'POST',
        body: JSON.stringify({ batch: buildBatch() }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.batch.id).toBe('batch-boss-arena')
    expect(payload.state.ledger[0]).toMatchObject({
      id: 'asset-import-batch-boss-arena',
      state: 'needs-approval',
      ownerAgent: 'Asset Librarian Agent',
    })
    expect(payload.state.graphs.assetGraph[0]).toMatchObject({
      label: 'Boss Arena - GLB - 6.0 MB',
      status: 'needs-review',
    })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([
                expect.objectContaining({ id: 'asset-import-batch-boss-arena' }),
              ]),
            }),
          }),
        }),
      }),
    )
  })

  it('rejects malformed asset batches before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/asset-import', {
        method: 'POST',
        body: JSON.stringify({ batch: { assets: [] } }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid viewport asset import batch' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
