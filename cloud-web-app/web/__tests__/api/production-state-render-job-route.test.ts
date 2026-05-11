import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

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

const queueMocks = vi.hoisted(() => ({
  QUEUE_NAMES: {
    EXPORT: 'aethel:export',
  },
  queueManager: {
    addJob: vi.fn(),
    isAvailable: vi.fn(),
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/queue-system', () => queueMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { POST } from '@/app/api/projects/[id]/production-state/render-job/route'

function buildContract() {
  return buildViewportRenderJobContract({
    id: 'render-boss-final',
    projectId: 'project-1',
    mode: 'film',
    renderMode: 'cinematic',
    quality: 'final',
    requestedAt: '2026-05-11T12:00:00.000Z',
    selectedObjectId: 'camera-rig',
    selectedObjectName: 'Camera Rig',
    timeline: { currentTime: 0, duration: 18, isPlaying: false },
    scene: {
      objectCount: 18,
      assetCount: 4,
      selectedObjectId: 'camera-rig',
      selectedObjectName: 'Camera Rig',
      assetFormats: ['glb', 'fbx'],
      visualScriptNodes: 4,
      visualScriptEdges: 3,
      vfxNodes: 2,
      vfxConnections: 1,
    },
  })
}

describe('api/projects/[id]/production-state/render-job route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss cinematic',
      template: 'unreal',
      userId: 'user-1',
      settings: null,
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
    queueMocks.queueManager.isAvailable.mockResolvedValue(true)
    queueMocks.queueManager.addJob.mockResolvedValue({ id: 'queue-render-1' })
  })

  it('persists viewport render contracts into durable production state without faking queue completion', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job', {
        method: 'POST',
        body: JSON.stringify({ contract: buildContract() }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.queued).toBe(false)
    expect(payload.contract.profile.target).toBe('cloud-sandbox')
    expect(payload.state.ledger[0]).toMatchObject({
      id: 'render-job-render-boss-final',
      state: 'blocked',
      ownerAgent: 'Cinematic Editor Agent',
    })
    expect(payload.state.graphs.releaseGraph[0]).toMatchObject({
      status: 'blocked',
      ownerAgent: 'Release Agent',
    })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([
                expect.objectContaining({ id: 'render-job-render-boss-final' }),
              ]),
            }),
          }),
        }),
      }),
    )
    expect(queueMocks.queueManager.addJob).not.toHaveBeenCalled()
  })

  it('queues render execution when explicitly requested while preserving evidence gates', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job', {
        method: 'POST',
        body: JSON.stringify({
          contract: buildContract(),
          enqueue: true,
          runtimeRoute: {
            lane: 'viewport-render',
            canStart: true,
            target: 'cloud-sandbox',
            preferredPlacement: 'cloud-sandbox',
            safety: 'needs-confirmation',
            requiresConfirmation: true,
            reason: 'Final render approved for isolated cloud queue.',
          },
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(202)
    expect(payload.queued).toBe(true)
    expect(payload.queue).toMatchObject({
      status: 'queued',
      jobId: 'queue-render-1',
    })
    expect(queueMocks.queueManager.addJob).toHaveBeenCalledWith(
      'aethel:export',
      'render:viewport',
      expect.objectContaining({
        projectId: 'project-1',
        projectName: 'Boss cinematic',
        runtimeTarget: 'cloud-sandbox',
        metadata: expect.objectContaining({
          source: 'viewport-render-contract',
          expectedOutputs: expect.arrayContaining(['final-video', 'performance-report']),
          executionPlan: expect.objectContaining({
            isolation: 'outside-browser-main-thread',
            lane: 'viewport-render',
          }),
        }),
      }),
      { priority: 7, jobId: 'render-boss-final' },
    )
  })

  it('persists but does not enqueue when runtime route is held', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job', {
        method: 'POST',
        body: JSON.stringify({
          contract: buildContract(),
          enqueue: true,
          runtimeRoute: {
            target: 'held',
            canStart: false,
            safety: 'held',
            reason: 'Thermal pressure is critical.',
          },
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.queued).toBe(false)
    expect(payload.queue).toMatchObject({
      status: 'held',
      message: 'Thermal pressure is critical.',
    })
    expect(queueMocks.queueManager.addJob).not.toHaveBeenCalled()
  })

  it('rejects malformed render contracts before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job', {
        method: 'POST',
        body: JSON.stringify({ contract: { quality: 'final' } }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid viewport render job contract' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
