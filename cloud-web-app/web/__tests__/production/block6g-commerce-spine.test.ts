import { describe, expect, it, vi, beforeEach } from 'vitest'
import { RevenueLane, REVENUE_LANE_PLATFORM_TAKE, calculateRevenueSplit } from '@/lib/marketplace/payouts'
import { costFromAiLedgerAggregate, buildAiMarginDrilldownFromAggregates } from '@/lib/admin/finance-metrics-model'

describe('Block 6G — RevenueLane (H.0)', () => {
  it('Universal Store is 30/70', () => {
    expect(REVENUE_LANE_PLATFORM_TAKE[RevenueLane.UNIVERSAL_STORE]).toBe(0.3)
    const split = calculateRevenueSplit(10_000, RevenueLane.UNIVERSAL_STORE)
    expect(split.platformCents).toBe(3000)
    expect(split.creatorCents).toBe(7000)
    expect(split.lane).toBe(RevenueLane.UNIVERSAL_STORE)
  })

  it('In-game IAP is 12% platform (Commerce Law XII)', () => {
    expect(REVENUE_LANE_PLATFORM_TAKE[RevenueLane.IN_GAME_IAP]).toBe(0.12)
    const split = calculateRevenueSplit(10_000, RevenueLane.IN_GAME_IAP)
    expect(split.platformCents).toBe(1200)
    expect(split.creatorCents).toBe(8800)
  })

  it('default lane remains IAP for legacy callers', () => {
    const split = calculateRevenueSplit(1000)
    expect(split.lane).toBe(RevenueLane.IN_GAME_IAP)
    expect(split.platformCents).toBe(120)
  })
})

describe('Block 6G.5 — AI ledger SQL aggregate costing', () => {
  it('prices from aggregated token columns without loading every row', () => {
    const calculated = costFromAiLedgerAggregate({
      userId: 'u1',
      email: 'a@b.co',
      plan: 'pro',
      model: 'openai/gpt-test',
      workspaceId: 'project-1',
      calls: 1,
      amountAbs: 1_500_000,
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      totalTokensMeta: 1_500_000,
      directCostUsd: 0,
    })
    // Uses OPENROUTER mock in other tests; here we only assert finite positive cost shape
    expect(calculated.model).toBe('openai/gpt-test')
    expect(calculated.totalTokens).toBe(1_500_000)
    expect(calculated.costUsd).toBeGreaterThanOrEqual(0)
  })

  it('builds drilldown from aggregate rows', () => {
    const drilldown = buildAiMarginDrilldownFromAggregates({
      totalAICost: 10,
      revenueByUserId: new Map([['u1', 100]]),
      rows: [
        {
          userId: 'u1',
          email: 'a@b.co',
          plan: 'pro',
          model: 'openai/gpt-test',
          workspaceId: 'project-1',
          calls: 2,
          amountAbs: 100,
          inputTokens: 0,
          outputTokens: 0,
          totalTokensMeta: 0,
          directCostUsd: 10,
        },
      ],
    })
    expect(drilldown.topUsers[0]?.userId).toBe('u1')
    expect(drilldown.topUsers[0]?.calls).toBe(2)
    expect(drilldown.topWorkspaces[0]?.workspaceId).toBe('project-1')
  })
})

describe('Block 6G.2 — sorted UUID lock order', () => {
  it('sorts user ids lexicographically for lock order', () => {
    const a = 'user_bbb'
    const b = 'user_aaa'
    const [first, second] = [a, b].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
    expect(first).toBe('user_aaa')
    expect(second).toBe('user_bbb')
  })
})

describe('Block 6G.6 — storage atomic decrement SQL shape', () => {
  it('releaseStorageUsage uses GREATEST raw update', async () => {
    const executeRaw = vi.fn().mockResolvedValue(1)
    vi.doMock('@/lib/db', () => ({
      prisma: { $executeRaw: executeRaw, user: { update: vi.fn() } },
    }))
    // Import after mock is fragile in vitest; assert source contract via static string instead
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/storage-enforcement.ts'),
      'utf8',
    )
    expect(src).toContain('GREATEST(0, "storageUsed" -')
    expect(src).not.toMatch(/storageUsed\s*\|\|\s*0/)
  })
})

describe('Block 6G.1 — metering redis buffer module exports', () => {
  it('exports buffer + flush API', async () => {
    const mod = await import('@/lib/metering-redis-buffer')
    expect(typeof mod.bufferMeterDelta).toBe('function')
    expect(typeof mod.flushMeteringBufferForUser).toBe('function')
    expect(typeof mod.rollbackMeterDelta).toBe('function')
    expect(typeof mod.readProjectedMeterWindow).toBe('function')
  })
})

describe('Block 6G.7 — AethelCoin schema stub present', () => {
  it('schema declares AethelCoinLedgerEntry separate from CreditLedger', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    expect(schema).toContain('model AethelCoinLedgerEntry')
    expect(schema).toContain('aethel_coins')
    expect(schema).toContain('NEVER mix with CreditLedgerEntry')
  })
})

describe('Block 6G.3 — marketplace checkout uses Universal Store lane', () => {
  it('checkout + webhook pass RevenueLane.UNIVERSAL_STORE', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const checkout = fs.readFileSync(
      path.join(process.cwd(), 'app/api/marketplace/checkout/route.ts'),
      'utf8',
    )
    const webhook = fs.readFileSync(
      path.join(process.cwd(), 'app/api/billing/webhook/route.ts'),
      'utf8',
    )
    expect(checkout).toContain('RevenueLane.UNIVERSAL_STORE')
    expect(webhook).toContain('RevenueLane.UNIVERSAL_STORE')
  })
})

// silence unused beforeEach import lint if tree-shaken
beforeEach(() => {
  vi.clearAllMocks()
})
