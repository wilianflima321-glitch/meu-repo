import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const billingRuntimeMocks = vi.hoisted(() => ({
  getBillingRuntimeState: vi.fn(),
}))

const emergencyModeMocks = vi.hoisted(() => ({
  updateMetrics: vi.fn(),
  getState: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    creditLedgerEntry: {
      aggregate: vi.fn(),
    },
    emergencyState: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/server/billing-runtime', () => billingRuntimeMocks)
vi.mock('@/lib/emergency-mode', () => ({ default: emergencyModeMocks }))
vi.mock('@/lib/db', () => prismaMocks)

import { GET } from '@/app/api/studio/cost/live/route'

describe('api/studio/cost/live route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authMocks.requireAuth.mockReturnValue({ userId: 'user-1' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({
      plan: { id: 'pro' },
      source: 'subscription',
    })
    emergencyModeMocks.getState.mockReturnValue({
      level: 'normal',
      settings: {
        dailyBudget: 100,
        hourlyBudget: 10,
        monthlyBudget: 1000,
        fallbackModel: 'openai/gpt-4.1-mini',
        autoDowngradeOnWarning: true,
        autoShutdownOnCritical: false,
      },
    })
    prismaMocks.prisma.creditLedgerEntry.aggregate.mockResolvedValue({
      _sum: { amount: 420 },
    })
    prismaMocks.prisma.emergencyState.findUnique.mockResolvedValue({
      level: 'normal',
      dailyBudget: 100,
      hourlyBudget: 10,
      monthlyBudget: 1000,
      maxTokensPerRequest: 8192,
      allowedModels: 'openai/gpt-4.1-mini,anthropic/claude-3.7-sonnet',
    })
  })

  it('returns a ready economics plane when wallet, billing, and budgets are healthy', async () => {
    billingRuntimeMocks.getBillingRuntimeState.mockResolvedValue({
      status: 'ready',
      checkoutReady: true,
      portalReady: true,
      webhookReady: true,
      blockers: [],
      provider: { label: 'Stripe', setupEnv: ['STRIPE_SECRET_KEY'] },
    })
    emergencyModeMocks.updateMetrics.mockResolvedValue({
      hourlySpend: 1.2,
      dailySpend: 12,
      monthlySpend: 110,
      totalTokensToday: 3400,
      totalRequestsToday: 18,
      avgCostPerRequest: 0.42,
      lastUpdated: new Date('2026-04-28T14:00:00.000Z'),
    })

    const response = await GET(new NextRequest('http://localhost:3000/api/studio/cost/live?projectId=proj-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ready')
    expect(payload.projectId).toBe('proj-1')
    expect(payload.wallet.lowBalance).toBe(false)
    expect(payload.budget.hourly.status).toBe('healthy')
    expect(payload.policy.allowedModels).toEqual([
      'openai/gpt-4.1-mini',
      'anthropic/claude-3.7-sonnet',
    ])
    expect(payload.guidance).toContain(
      'Runtime economico saudavel: voce pode seguir com execucao, review e deploy sem bloqueios economicos imediatos.'
    )
  })

  it('returns blocked status with actionable guidance when billing is partial and budgets are critical', async () => {
    prismaMocks.prisma.creditLedgerEntry.aggregate.mockResolvedValue({
      _sum: { amount: 42 },
    })
    billingRuntimeMocks.getBillingRuntimeState.mockResolvedValue({
      status: 'partial',
      checkoutReady: false,
      portalReady: true,
      webhookReady: false,
      blockers: ['STRIPE_SECRET_KEY_MISSING', 'STRIPE_WEBHOOK_SECRET_MISSING'],
      provider: { label: 'Stripe', setupEnv: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
    })
    emergencyModeMocks.updateMetrics.mockResolvedValue({
      hourlySpend: 9.5,
      dailySpend: 46,
      monthlySpend: 140,
      totalTokensToday: 12000,
      totalRequestsToday: 44,
      avgCostPerRequest: 2.1,
      lastUpdated: new Date('2026-04-28T15:30:00.000Z'),
    })
    prismaMocks.prisma.emergencyState.findUnique.mockResolvedValue({
      level: 'warning',
      dailyBudget: 50,
      hourlyBudget: 10,
      monthlyBudget: 160,
      maxTokensPerRequest: 4096,
      allowedModels: 'openai/gpt-4.1-mini',
    })

    const response = await GET(new NextRequest('http://localhost:3000/api/studio/cost/live'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe('blocked')
    expect(payload.wallet.lowBalance).toBe(true)
    expect(payload.budget.hourly.status).toBe('critical')
    expect(payload.billing.blockers).toContain('STRIPE_SECRET_KEY_MISSING')
    expect(payload.guidance).toContain(
      'Saldo baixo: revise o plano, faca top-up ou reduza o custo por execucao antes de abrir novas trilhas longas.'
    )
    expect(payload.guidance).toContain(
      'Checkout ainda nao esta pronto: trate upgrades e publish como bloqueados ate o runtime de billing ficar pronto.'
    )
  })
})
