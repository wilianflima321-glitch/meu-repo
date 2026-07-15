import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';
import { enforceRouteRateLimit, MARKETPLACE_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit';
import { listCreatorTransactions } from '@/lib/marketplace/transactions';

const routeLogger = createComponentLogger('api/marketplace/creator/revenue/route');

export const dynamic = 'force-dynamic';

/**
 * Real revenue timeline — backed by `marketplace_sale_transactions`
 * (see `lib/marketplace/transactions.ts`). Replaces the previous
 * `price * downloads` estimate, which conflated install counts with actual
 * Stripe settlements and could never be reconciled against real payouts.
 * `disputed`/`refunded`/`failed` rows are excluded so a chargeback never
 * inflates the creator's apparent revenue trend.
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'MARKETPLACE_CREATOR_REVENUE',
      route: '/api/marketplace/creator/revenue',
      config: MARKETPLACE_READ_RATE_LIMIT,
      identifier: user.userId,
    });
    if (rateLimited) return rateLimited;

    const transactions = await listCreatorTransactions(user.userId, 5000);

    const now = new Date();
    const days = 30;
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dates: string[] = [];
    const buckets = new Map<string, { revenueCents: number; sales: number }>();

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(dayStart);
      date.setUTCDate(dayStart.getUTCDate() - i);
      const key = date.toISOString().slice(0, 10);
      dates.push(key);
      buckets.set(key, { revenueCents: 0, sales: 0 });
    }

    for (const tx of transactions) {
      if (tx.status === 'disputed' || tx.status === 'refunded' || tx.status === 'failed') continue;

      const bucketDate = tx.createdAt.toISOString().slice(0, 10);
      const target = buckets.get(bucketDate);
      if (!target) continue;

      target.revenueCents += tx.creatorCents;
      target.sales += 1;
    }

    const timeline = dates.map((date) => {
      const bucket = buckets.get(date) || { revenueCents: 0, sales: 0 };
      return {
        date,
        revenue: Number((bucket.revenueCents / 100).toFixed(2)),
        sales: bucket.sales,
        estimated: false,
      };
    });

    return NextResponse.json(timeline);
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    routeLogger.error('[marketplace/creator/revenue] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load creator revenue',
      },
      { status: 500 }
    );
  }
}
