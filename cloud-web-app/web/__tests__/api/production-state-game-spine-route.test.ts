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

import { GET, POST } from '@/app/api/projects/[id]/production-state/game-spine/route'

describe('api/projects/[id]/production-state/game-spine route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'director@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-game',
      name: 'Frontier Trail',
      template: 'unreal',
      userId: 'user-1',
      settings: null,
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-game' })
  })

  it('returns a held game production contract without mutating state', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-game/production-state/game-spine?scale=aaa-assisted'),
      { params: { id: 'project-game' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.contract).toMatchObject({
      projectId: 'project-game',
      title: 'Frontier Trail',
      scale: 'aaa-assisted',
      noAutonomousAaaClaim: true,
      browserRole: 'responsive-preview-and-review',
      heavyWorkPolicy: 'sidecar-or-cloud-only',
    })
    expect(payload.contract.graphs).toHaveLength(13)
    expect(payload.report.state).toBe('held')
    expect(payload.report.missingEvidence.length).toBeGreaterThan(0)
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('persists game spine into Project Brain and keeps release blocked', async () => {
    const seeded = buildDefaultAgenticProductionState({
      projectName: 'Frontier Trail',
      projectType: 'unreal',
      now: '2026-05-14T11:00:00.000Z',
    })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-game',
      name: 'Frontier Trail',
      template: 'unreal',
      userId: 'user-1',
      settings: { [PRODUCTION_STATE_SETTINGS_KEY]: seeded },
      members: [],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-game/production-state/game-spine', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Frontier Trail vertical slice',
          scale: 'premium-indie',
          runtimeTargets: ['local-native', 'cloud-sandbox'],
          createdAt: '2026-05-14T12:00:00.000Z',
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-game' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.report.state).toBe('held')
    expect(payload.productionState.brain.domain).toBe('game')
    expect(payload.productionState.graphs.releaseGraph[0]).toMatchObject({
      id: 'game-spine-release-graph',
      status: 'blocked',
      ownerAgent: 'Release Producer Agent',
    })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-game' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              brain: expect.objectContaining({
                domain: 'game',
              }),
            }),
          }),
        }),
      })
    )
  })

  it('rejects viewer collaborators before writing game production memory', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-game',
      name: 'Frontier Trail',
      template: 'unreal',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-game/production-state/game-spine', {
        method: 'POST',
        body: JSON.stringify({ scale: 'aaa-assisted' }),
      }),
      { params: { id: 'project-game' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
