import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const rbacMocks = vi.hoisted(() => ({
  withAdminAuth: vi.fn((handler: (req: NextRequest) => Promise<Response>) => handler),
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    subscription: {
      count: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      groupBy: vi.fn(),
    },
    creditLedgerEntry: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rbac', () => rbacMocks)
vi.mock('@/lib/prisma', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))
vi.mock('@/lib/ai/openrouter-models', () => ({
  OPENROUTER_MODELS: [
    {
      id: 'openai/gpt-test',
      inputCost: 2,
      outputCost: 10,
    },
  ],
}))

import { GET } from '@/app/api/admin/finance/metrics/route'

function seedFinanceMocks({ revenueCents = 14_000 } = {}) {
  const now = new Date('2026-05-03T12:00:00.000Z')

  prismaMocks.prisma.subscription.count.mockResolvedValue(2)
  prismaMocks.prisma.payment.aggregate
    .mockResolvedValueOnce({ _sum: { amount: revenueCents } })
    .mockResolvedValueOnce({ _sum: { amount: 7_000 } })
    .mockResolvedValueOnce({ _sum: { amount: 0 } })
  prismaMocks.prisma.payment.findMany.mockResolvedValue([
    {
      id: 'pay-1',
      userId: 'user-1',
      amount: revenueCents,
      createdAt: now,
    },
  ])
  prismaMocks.prisma.payment.groupBy.mockResolvedValue([
    { userId: 'user-1', _sum: { amount: revenueCents } },
  ])
  prismaMocks.prisma.user.groupBy.mockResolvedValue([
    { plan: 'pro', _count: { _all: 2 } },
  ])
  prismaMocks.prisma.creditLedgerEntry.findMany
    .mockResolvedValueOnce([
      {
        userId: 'user-1',
        amount: -1_500_000,
        metadata: {
          model: 'openai/gpt-test',
          projectId: 'project-1',
          inputTokens: 1_000_000,
          outputTokens: 500_000,
        },
        user: { email: 'founder@aethel.dev', plan: 'pro' },
        createdAt: now,
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 'ledger-1',
        amount: -7,
        entryType: 'ai_chat',
        reference: 'run-1',
        metadata: { description: 'AI chat run' },
        createdAt: now,
        user: { email: 'founder@aethel.dev' },
      },
    ])
}

describe('api/admin/finance/metrics route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMocks.prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
    seedFinanceMocks()
  })

  it('returns an AI margin snapshot using model token pricing per million tokens', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/admin/finance/metrics?range=7d'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.aiCostBreakdown[0]).toMatchObject({
      model: 'openai/gpt-test',
      calls: 1,
    })
    expect(payload.aiCostBreakdown[0].cost).toBeCloseTo(7, 5)
    expect(payload.aiMarginSnapshot.periodRevenue).toBe(140)
    expect(payload.aiMarginSnapshot.periodAiCost).toBeCloseTo(7, 5)
    expect(payload.aiMarginSnapshot.grossMarginAfterAi).toBeCloseTo(133, 5)
    expect(payload.aiMarginSnapshot.grossMarginAfterAiPercent).toBeCloseTo(95, 5)
    expect(payload.aiMarginSnapshot.aiCostRatio).toBeCloseTo(5, 5)
    expect(payload.aiMarginSnapshot.projectedMonthlyAiCost).toBeCloseTo(30, 5)
    expect(payload.aiMarginSnapshot.status).toBe('healthy')
    expect(payload.aiMarginDrilldown.topUsers[0]).toMatchObject({
      userId: 'user-1',
      userEmail: 'founder@aethel.dev',
      plan: 'pro',
      calls: 1,
      status: 'healthy',
    })
    expect(payload.aiMarginDrilldown.topUsers[0].marginAfterAi).toBeCloseTo(133, 5)
    expect(payload.aiMarginDrilldown.topWorkspaces[0]).toMatchObject({
      workspaceId: 'project-1',
      topModel: 'openai/gpt-test',
    })
    expect(payload.aiMarginRecommendations.some((item: { scope: string }) => item.scope === 'model')).toBe(true)
    expect(payload.aiMarginRecommendations.some((item: { scope: string }) => item.scope === 'workspace')).toBe(true)
  })

  it('raises a risk snapshot when AI cost is above period revenue', async () => {
    prismaMocks.prisma.payment.aggregate.mockReset()
    prismaMocks.prisma.payment.findMany.mockReset()
    prismaMocks.prisma.payment.groupBy.mockReset()
    prismaMocks.prisma.user.groupBy.mockReset()
    prismaMocks.prisma.creditLedgerEntry.findMany.mockReset()
    seedFinanceMocks({ revenueCents: 100 })

    const response = await GET(new NextRequest('http://localhost:3000/api/admin/finance/metrics?range=7d'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.aiMarginSnapshot.status).toBe('risk')
    expect(payload.aiMarginSnapshot.grossMarginAfterAi).toBeLessThan(0)
    expect(payload.alerts.some((alert: { message: string }) => alert.message.includes('AI usage is consuming'))).toBe(true)
    expect(payload.aiMarginRecommendations[0]).toMatchObject({
      priority: 'critical',
      scope: 'global',
    })
  })
})
