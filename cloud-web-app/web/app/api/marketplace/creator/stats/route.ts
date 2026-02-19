import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-creator-stats-get',
      key: user.userId,
      max: 480,
      windowMs: 60 * 60 * 1000,
      message: 'Too many creator stats requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const items = await prisma.marketplaceItem.findMany({
      where: { authorId: user.userId },
      select: {
        price: true,
        downloads: true,
        rating: true,
      },
    });

    const assetCount = items.length;
    const totalDownloads = items.reduce((sum, item) => sum + Math.max(0, item.downloads || 0), 0);
    const totalRevenueCents = items.reduce(
      (sum, item) => sum + Math.max(0, item.price || 0) * Math.max(0, item.downloads || 0),
      0
    );
    const averageRating =
      assetCount > 0
        ? Number(
            (
              items.reduce((sum, item) => sum + Math.max(0, item.rating || 0), 0) /
              assetCount
            ).toFixed(2)
          )
        : 0;

    return NextResponse.json({
      totalRevenue: Number((totalRevenueCents / 100).toFixed(2)),
      revenueChange: 0,
      totalDownloads,
      downloadsChange: 0,
      totalViews: 0,
      viewsChange: 0,
      averageRating,
      ratingChange: 0,
      assetCount,
      pendingReviews: 0,
      metricsSource: {
        revenue: 'estimated_from_price_x_downloads',
        views: 'not_available',
        pendingReviews: 'not_available',
      },
    });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/creator/stats] Error:', error);
    return apiInternalError('Failed to load creator stats');
  }
}
