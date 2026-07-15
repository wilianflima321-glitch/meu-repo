/**
 * Block 6F — Creative Wallet isolation tests (B6-ACC-06).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  creativeCreditsFromWeighted,
  CREATIVE_MODALITY_CREDIT_TABLE,
  CREATIVE_WEIGHTED_TOKEN_ESTIMATES,
  getCreativeEntitlements,
} from '@/lib/creative-provider-matrix'
import { weightedTokensToCreativeCredits } from '@/lib/billing/creative-wallet'

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditLedgerEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        creditLedgerEntry: {
          create: vi.fn().mockResolvedValue({ id: 'res-1', amount: -80 }),
          update: vi.fn(),
        },
        user: { update: vi.fn() },
      }
      return fn(tx)
    }),
  },
}))

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('6F.2 price table', () => {
  it('maps weighted tokens to creative credits (1000:1)', () => {
    expect(creativeCreditsFromWeighted(80_000)).toBe(80)
    expect(weightedTokensToCreativeCredits(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.videoMinJob)).toBe(80)
    expect(CREATIVE_MODALITY_CREDIT_TABLE.video_min_job).toBe(80)
    expect(CREATIVE_MODALITY_CREDIT_TABLE.image_standard).toBe(12)
  })
})

describe('6F.1 plan entitlements', () => {
  it('paid plans use separate creative wallet and do not debit LLM pool', () => {
    const pro = getCreativeEntitlements('pro')
    expect(pro.creativeSeparateWallet).toBe(true)
    expect(pro.creativeDebitsLlmPool).toBe(false)
    expect(pro.includedCreativeCreditsPerMonth).toBeGreaterThan(0)
  })

  it('free has zero included creative credits', () => {
    const free = getCreativeEntitlements('free')
    expect(free.includedCreativeCreditsPerMonth).toBe(0)
    expect(free.creativeDomain).toBe(false)
  })
})

describe('6F.3 creative wallet CostGuard adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reserves creative credits without calling consumeMeteredUsage', async () => {
    const metering = await import('@/lib/metering')
    const spy = vi.spyOn(metering, 'consumeMeteredUsage').mockResolvedValue({
      allowed: true,
      remaining: {},
    } as never)

    const { createCreativeWalletCostGuardAdapter } = await import(
      '@/lib/production/creative-cost-guard-creative-wallet-adapter'
    )
    const { prisma } = await import('@/lib/db')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      plan: 'pro',
      creativeCreditBalance: 500,
      creativeCreditBalanceSyncedAt: new Date(),
    } as never)
    vi.mocked(prisma.creditLedgerEntry.findFirst).mockResolvedValue({ id: 'grant' } as never)

    const adapter = createCreativeWalletCostGuardAdapter({
      hasByok: async () => false,
      modality: 'video',
    })

    const reserved = await adapter.reservePool({
      userId: 'user-1',
      estimatedTokenWeight: 80_000,
    })

    expect(reserved.ok).toBe(true)
    if (reserved.ok) {
      expect(reserved.funding).toBe('wallet')
      expect(reserved.reservationId).toBeTruthy()
    }
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
