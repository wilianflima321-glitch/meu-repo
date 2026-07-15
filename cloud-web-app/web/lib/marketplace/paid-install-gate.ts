/**
 * Wave H marketplace honesty — paid install gate.
 * Paid MarketplaceItem listings cannot install without a paid sale Transaction.
 */

import { prisma } from '@/lib/db'
import { isBuiltinExtension } from '@/lib/marketplace/catalog'

export type PaidInstallGateResult =
  | { allowed: true; reason: 'builtin' | 'free' | 'catalog_free' | 'author' | 'purchased' }
  | {
      allowed: false
      code: 'PURCHASE_REQUIRED' | 'ITEM_NOT_FOUND'
      message: string
      priceCents?: number
      itemId?: string
    }

const PAID_TX_STATUSES = ['pending', 'cleared'] as const

/**
 * Fail-closed for paid listings: free curated/builtin installs stay open.
 */
export async function evaluatePaidInstallGate(params: {
  userId: string
  extensionId: string
}): Promise<PaidInstallGateResult> {
  const { userId, extensionId } = params

  if (isBuiltinExtension(extensionId)) {
    return { allowed: true, reason: 'builtin' }
  }

  const item = await prisma.marketplaceItem.findFirst({
    where: { id: extensionId },
    select: { id: true, price: true, authorId: true },
  })

  // Curated catalog slug with no MarketplaceItem row = free IDE extension path.
  if (!item) {
    return { allowed: true, reason: 'catalog_free' }
  }

  if (item.price <= 0) {
    return { allowed: true, reason: 'free' }
  }

  if (item.authorId === userId) {
    return { allowed: true, reason: 'author' }
  }

  const purchase = await prisma.transaction.findFirst({
    where: {
      buyerId: userId,
      itemId: item.id,
      status: { in: [...PAID_TX_STATUSES] },
    },
    select: { id: true },
  })

  if (purchase) {
    return { allowed: true, reason: 'purchased' }
  }

  return {
    allowed: false,
    code: 'PURCHASE_REQUIRED',
    message:
      'This listing is paid. Complete Stripe Checkout via /api/marketplace/checkout before install.',
    priceCents: item.price,
    itemId: item.id,
  }
}
