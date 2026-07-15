import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';
import { enforceRouteRateLimit, MARKETPLACE_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit';
import { listCreatorTransactions } from '@/lib/marketplace/transactions';

const routeLogger = createComponentLogger('api/marketplace/creator/sales/recent/route');

export const dynamic = 'force-dynamic';

/** Privacy: creators see who bought their asset without exposing the full email address. */
function maskBuyerEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length === 0) return 'Marketplace buyer';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

/**
 * Real recent-sales feed — backed by `marketplace_sale_transactions` (see
 * `lib/marketplace/transactions.ts`). Replaces the previous fabrication of up
 * to N synthetic "sales" per item derived from `MarketplaceItem.downloads`
 * (an install counter, not a revenue signal).
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'MARKETPLACE_CREATOR_SALES_RECENT',
      route: '/api/marketplace/creator/sales/recent',
      config: MARKETPLACE_READ_RATE_LIMIT,
      identifier: user.userId,
    });
    if (rateLimited) return rateLimited;

    const transactions = await listCreatorTransactions(user.userId, 20);

    const sales = transactions.map((tx) => ({
      id: tx.id,
      assetName: tx.itemTitle,
      buyerName: maskBuyerEmail(tx.buyerEmail),
      amount: Number((tx.amountCents / 100).toFixed(2)),
      creatorAmount: Number((tx.creatorCents / 100).toFixed(2)),
      status: tx.status,
      date: tx.createdAt.toISOString(),
      estimated: false,
    }));

    return NextResponse.json(sales);
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    routeLogger.error('[marketplace/creator/sales/recent] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load recent sales',
      },
      { status: 500 }
    );
  }
}
