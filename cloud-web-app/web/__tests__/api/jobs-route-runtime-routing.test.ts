import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const queueMocks = vi.hoisted(() => ({
  QUEUE_NAMES: {
    EXPORT: 'aethel:export',
    ASSET: 'aethel:asset',
  },
  queueManager: {
    addJob: vi.fn(),
    isAvailable: vi.fn(),
    listJobs: vi.fn(),
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/queue-system', () => queueMocks)

import { GET, POST } from '@/app/api/jobs/route'

describe('api/jobs runtime routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1' })
    queueMocks.queueManager.isAvailable.mockResolvedValue(true)
    queueMocks.queueManager.addJob.mockResolvedValue({ id: 'queue-job-1' })
    queueMocks.queueManager.listJobs.mockResolvedValue([])
  })

  it('persists the execution route with queued jobs', async () => {
    const runtimeRoute = {
      lane: 'build-export',
      canStart: true,
      target: 'local-native',
      preferredPlacement: 'local-native',
      safety: 'ready',
      requiresConfirmation: false,
      reason: 'Native bridge is healthy.',
      label: 'build export -> local native',
      detail: 'Use the Studio Local native executor while the web shell stays responsive.',
    }

    const req = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'build',
        projectId: 'project-1',
        projectName: 'Aethel Demo',
        metadata: { source: 'dashboard' },
        runtimeRoute,
      }),
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(202)
    expect(payload.job.runtimeTarget).toBe('local-native')
    expect(payload.job.metadata.runtimeRoute).toMatchObject({
      lane: 'build-export',
      target: 'local-native',
      safety: 'ready',
    })
    expect(queueMocks.queueManager.addJob).toHaveBeenCalledWith(
      'aethel:export',
      'export:project',
      expect.objectContaining({
        projectId: 'project-1',
        runtimeTarget: 'local-native',
        runtimeRoute: expect.objectContaining({
          lane: 'build-export',
          target: 'local-native',
        }),
        metadata: expect.objectContaining({
          source: 'dashboard',
          runtimeRoute: expect.objectContaining({
            target: 'local-native',
          }),
        }),
      }),
      { priority: 5 }
    )
  })

  it('does not enqueue work when the resolved execution route is held', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'render',
        runtimeRoute: {
          lane: 'viewport-render',
          canStart: false,
          target: 'held',
          preferredPlacement: 'cloud-sandbox',
          safety: 'held',
          requiresConfirmation: true,
          reason: 'Viewport rendering is paused while the user is active.',
        },
      }),
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('RUNTIME_ROUTE_HELD')
    expect(payload.runtimeRoute.target).toBe('held')
    expect(queueMocks.queueManager.addJob).not.toHaveBeenCalled()
  })

  it('returns persisted execution targets when listing queue jobs', async () => {
    queueMocks.queueManager.listJobs.mockResolvedValue([
      {
        id: 'queue-job-2',
        queueName: 'aethel:export',
        name: 'export:project',
        state: 'active',
        data: {
          projectId: 'project-2',
          projectName: 'Film Pack',
          metadata: {
            runtimeRoute: {
              lane: 'build-export',
              canStart: true,
              target: 'cloud-sandbox',
              preferredPlacement: 'cloud-sandbox',
              safety: 'fallback',
              requiresConfirmation: false,
              reason: 'Cloud isolation keeps the device responsive.',
            },
          },
        },
        attemptsMade: 0,
        progress: { percentage: 42 },
        timestamp: Date.UTC(2026, 4, 2, 12, 0, 0),
      },
    ])

    const response = await GET(new NextRequest('http://localhost:3000/api/jobs'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.jobs[0]).toMatchObject({
      id: 'queue-job-2',
      type: 'export',
      status: 'processing',
      progress: 42,
      runtimeTarget: 'cloud-sandbox',
      runtimeRoute: {
        lane: 'build-export',
        target: 'cloud-sandbox',
      },
    })
  })
})
