import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  PRODUCTION_STATE_SETTINGS_KEY,
  buildDefaultAgenticProductionState,
  writeAgenticProductionStateToSettings,
} from '@/lib/production/agentic-production-state'
import { mergeGizmoTransformOperationIntoProductionState } from '@/lib/production/gizmo-production-state'
import { buildGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

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

import { GET, POST } from '@/app/api/projects/[id]/production-state/gizmo-transform/route'

function buildOperation() {
  return buildGizmoTransformOperation({
    id: 'op-route-1',
    objectsBefore: [
      {
        id: 'hero-rig',
        name: 'Hero Rig',
        position: [0, 1, 2] as const,
        rotation: [0, 0, 0] as const,
        scale: [1, 1, 1] as const,
      },
    ],
    objectsAfter: [
      {
        id: 'hero-rig',
        name: 'Hero Rig',
        position: [0, 2, 2] as const,
        rotation: [0, 0, 0] as const,
        scale: [1, 1, 1] as const,
      },
    ],
    mode: 'translate',
    space: 'world',
    snapEnabled: true,
    source: 'agent',
    agentId: 'technical-artist-agent',
    reason: 'Move hero rig to the shot mark.',
    evidenceRefs: ['viewport:screenshot:hero-rig'],
    createdAt: '2026-05-04T12:00:00.000Z',
  })
}

describe('api/projects/[id]/production-state/gizmo-transform route', () => {
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

  it('persists a gizmo operation into production state for owners', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/gizmo-transform', {
        method: 'POST',
        body: JSON.stringify({ operation: buildOperation() }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.operation.id).toBe('op-route-1')
    expect(payload.review.latest).toMatchObject({
      operationId: 'op-route-1',
      state: 'needs-approval',
    })
    expect(payload.state.ledger[0]).toMatchObject({
      id: 'gizmo-op-route-1',
      state: 'needs-approval',
      ownerAgent: 'technical-artist-agent',
    })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([
                expect.objectContaining({ id: 'gizmo-op-route-1' }),
              ]),
            }),
          }),
        }),
      }),
    )
  })

  it('rejects malformed operations before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/gizmo-transform', {
        method: 'POST',
        body: JSON.stringify({ operation: { id: 'bad' } }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid gizmo transform operation' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('loads compact gizmo review packets for readable project members', async () => {
    const productionState = mergeGizmoTransformOperationIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss fight prototype' }),
      buildOperation(),
      '2026-05-04T12:05:00.000Z',
    )
    prismaMocks.prisma.project.findFirst.mockResolvedValueOnce({
      id: 'project-1',
      name: 'Boss fight prototype',
      template: 'unreal',
      userId: 'owner-1',
      settings: writeAgenticProductionStateToSettings(null, productionState),
      members: [{ role: 'viewer' }],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/gizmo-transform'),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.summary).toMatchObject({
      total: 1,
      needsApproval: 1,
      latestOperationId: 'op-route-1',
    })
    expect(payload.packets[0]).toMatchObject({
      operationId: 'op-route-1',
      ownerAgent: 'technical-artist-agent',
      graphStatuses: {
        scene: 'needs-review',
        evidence: 'ready',
        validation: 'needs-review',
      },
    })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
