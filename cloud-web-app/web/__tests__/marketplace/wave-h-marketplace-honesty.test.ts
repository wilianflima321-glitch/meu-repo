/**
 * Wave H marketplace honesty — paid install gate + Treasury capability.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { evaluateTreasuryHonesty } from '@/lib/treasury/treasury-capability'

vi.mock('@/lib/db', () => ({
  prisma: {
    marketplaceItem: {
      findFirst: vi.fn(),
    },
    transaction: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/marketplace/catalog', () => ({
  isBuiltinExtension: (id: string) => id.startsWith('builtin-'),
}))

import { prisma } from '@/lib/db'
import { evaluatePaidInstallGate } from '@/lib/marketplace/paid-install-gate'

describe('Wave H Treasury honesty', () => {
  it('holds Coins mint and in-app payout; revenue lanes implemented', () => {
    const report = evaluateTreasuryHonesty({ stripeCheckoutConfigured: true })
    expect(report.revenueLanes.status).toBe('IMPLEMENTED')
    expect(report.fiatSaleLedger.status).toBe('IMPLEMENTED')
    expect(report.marketplaceCheckout.status).toBe('IMPLEMENTED')
    expect(report.aethelCoins.status).toBe('HELD')
    expect(report.inAppPayout.status).toBe('HELD')
    expect(report.universalEconomy.status).toBe('HELD')
    expect(report.marketingCoinsAllowed).toBe(false)
    expect(report.productCopy).toMatch(/\[HELD\]/)
  })
})

describe('Wave H paid install gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows builtin and catalog-free paths', async () => {
    await expect(
      evaluatePaidInstallGate({ userId: 'u1', extensionId: 'builtin-x' })
    ).resolves.toEqual({ allowed: true, reason: 'builtin' })

    vi.mocked(prisma.marketplaceItem.findFirst).mockResolvedValue(null)
    await expect(
      evaluatePaidInstallGate({ userId: 'u1', extensionId: 'curated-free' })
    ).resolves.toEqual({ allowed: true, reason: 'catalog_free' })
  })

  it('allows free MarketplaceItem', async () => {
    vi.mocked(prisma.marketplaceItem.findFirst).mockResolvedValue({
      id: 'item-free',
      price: 0,
      authorId: 'creator',
    } as never)
    await expect(
      evaluatePaidInstallGate({ userId: 'buyer', extensionId: 'item-free' })
    ).resolves.toEqual({ allowed: true, reason: 'free' })
  })

  it('blocks paid install without purchase Transaction', async () => {
    vi.mocked(prisma.marketplaceItem.findFirst).mockResolvedValue({
      id: 'item-paid',
      price: 1999,
      authorId: 'creator',
    } as never)
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null)

    const result = await evaluatePaidInstallGate({
      userId: 'buyer',
      extensionId: 'item-paid',
    })
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.code).toBe('PURCHASE_REQUIRED')
      expect(result.priceCents).toBe(1999)
    }
  })

  it('allows paid install after purchase Transaction', async () => {
    vi.mocked(prisma.marketplaceItem.findFirst).mockResolvedValue({
      id: 'item-paid',
      price: 1999,
      authorId: 'creator',
    } as never)
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({ id: 'tx1' } as never)

    await expect(
      evaluatePaidInstallGate({ userId: 'buyer', extensionId: 'item-paid' })
    ).resolves.toEqual({ allowed: true, reason: 'purchased' })
  })

  it('allows creator to install own paid listing', async () => {
    vi.mocked(prisma.marketplaceItem.findFirst).mockResolvedValue({
      id: 'item-paid',
      price: 5000,
      authorId: 'creator',
    } as never)
    await expect(
      evaluatePaidInstallGate({ userId: 'creator', extensionId: 'item-paid' })
    ).resolves.toEqual({ allowed: true, reason: 'author' })
  })
})
