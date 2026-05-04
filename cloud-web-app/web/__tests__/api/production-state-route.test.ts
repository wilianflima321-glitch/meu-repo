import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { buildDefaultAgenticProductionState, PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'

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

import { GET, PATCH } from '@/app/api/projects/[id]/production-state/route'

describe('api/projects/[id]/production-state route', () => {
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

  it('returns a default durable production state when the project has not been seeded yet', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/projects/project-1/production-state'), {
      params: { id: 'project-1' },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(false)
    expect(payload.settingsKey).toBe(PRODUCTION_STATE_SETTINGS_KEY)
    expect(payload.state.brain.domain).toBe('game-film')
    expect(payload.state.graphs.assetGraph[0].ownerAgent).toBe('Asset Librarian Agent')
  })

  it('patches production state into Project.settings for owners and returns readiness', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects/project-1/production-state', {
      method: 'PATCH',
      body: JSON.stringify({
        brain: {
          objective: 'Ship the first playable boss fight with playtest evidence.',
        },
        graphs: {
          assetGraph: [
            {
              id: 'assetGraph',
              label: 'Asset Graph',
              status: 'ready',
              ownerAgent: 'Asset Librarian Agent',
              evidenceRefs: ['license:boss-rig'],
              blockers: [],
              updatedAt: '2026-05-04T12:00:00.000Z',
            },
          ],
        },
      }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await PATCH(request, { params: { id: 'project-1' } })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.state.brain.objective).toContain('boss fight')
    expect(payload.readiness.readyGraphCount).toBeGreaterThanOrEqual(1)
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              brain: expect.objectContaining({ objective: expect.stringContaining('boss fight') }),
            }),
          }),
        }),
      })
    )
  })

  it('rejects viewer-only collaborators before mutating production memory', async () => {
    const seeded = buildDefaultAgenticProductionState({ projectName: 'Film intro' })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Film intro',
      template: 'unreal',
      userId: 'owner-1',
      settings: { [PRODUCTION_STATE_SETTINGS_KEY]: seeded },
      members: [{ role: 'viewer' }],
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state', {
        method: 'PATCH',
        body: JSON.stringify({ brain: { objective: 'Should not write' } }),
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
