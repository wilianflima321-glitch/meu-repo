import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

type CategoryData = {
  name: string;
  value: number;
  revenue: number;
  isEstimated?: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-creator-categories-get',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many creator category requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const items = await prisma.marketplaceItem.findMany({
      where: { authorId: user.userId },
      select: {
        category: true,
        price: true,
        downloads: true,
      },
    });

    const byCategory = new Map<
      string,
      { downloads: number; items: number; revenueCents: number }
    >();

    for (const item of items) {
      const category = (item.category || 'uncategorized').trim() || 'uncategorized';
      const downloads = Math.max(0, item.downloads || 0);
      const unitPriceCents = Math.max(0, item.price || 0);
      const revenueCents = unitPriceCents * downloads;

      const current = byCategory.get(category) || {
        downloads: 0,
        items: 0,
        revenueCents: 0,
      };

      current.downloads += downloads;
      current.items += 1;
      current.revenueCents += revenueCents;
      byCategory.set(category, current);
    }

    const categories: CategoryData[] = Array.from(byCategory.entries())
      .map(([name, data]) => ({
        name,
        value: data.downloads > 0 ? data.downloads : data.items,
        revenue: Number((data.revenueCents / 100).toFixed(2)),
        isEstimated: true,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json(categories);
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/creator/categories] Error:', error);
    return apiInternalError('Failed to load creator categories');
  }
}
