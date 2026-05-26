import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

import { GET, POST } from '@/app/api/projects/[id]/production-state/runtime-job-receipts/route'
import { RUNTIME_JOB_RECEIPTS_SETTINGS_KEY } from '@/lib/production/runtime-job-receipts'

describe('api/projects/[id]/production-state/runtime-job-receipts route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'operator@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-runtime',
      name: 'Runtime receipt project',
      template: 'game',
      userId: 'user-1',
      settings: {},
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-runtime' })
  })

  it('persists runtime job receipts into settings and production state', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-runtime/production-state/runtime-job-receipts', {
        method: 'POST',
        body: JSON.stringify({
          receipts: [
            {
              jobId: 'render-1',
              kind: 'dispatch',
              runtimeTarget: 'cloud-sandbox',
              capturedBy: 'Runtime Orchestrator Agent',
              refs: ['signed-dispatch:render-1'],
            },
            {
              jobId: 'render-1',
              kind: 'teardown',
              runtimeTarget: 'cloud-sandbox',
              capturedBy: 'Cloud Stream Operator',
              refs: ['teardown:render-1'],
            },
          ],
        }),
      }),
      { params: { id: 'project-runtime' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.releaseReady).toBe(false)
    expect(payload.receiptState.summary.totalReceipts).toBe(2)
    expect(payload.productionState.ledger[0].id).toBe('runtime-job-receipts')
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'project-runtime' },
      data: expect.objectContaining({
        settings: expect.objectContaining({
          [RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]: expect.objectContaining({ version: 1 }),
        }),
      }),
    }))
  })

  it('returns the persisted receipt state', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValueOnce({
      id: 'project-runtime',
      name: 'Runtime receipt project',
      template: 'game',
      userId: 'user-1',
      settings: {
        [RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]: {
          version: 1,
          projectId: 'project-runtime',
          updatedAt: '2026-05-25T15:00:00.000Z',
          receipts: [],
          summary: {
            totalReceipts: 0,
            jobCount: 0,
            receiptsWithCost: 0,
            receiptsWithTeardown: 0,
            failedReceipts: 0,
            totalCostUsd: 0,
            lastUpdatedAt: null,
          },
          releasePolicy: 'human-review-required',
        },
      },
      members: [],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-runtime/production-state/runtime-job-receipts'),
      { params: { id: 'project-runtime' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasReceiptState).toBe(true)
    expect(payload.settingsKey).toBe(RUNTIME_JOB_RECEIPTS_SETTINGS_KEY)
  })
})
