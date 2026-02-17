import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const items = await prisma.marketplaceItem.findMany({
      where: { authorId: user.userId },
      select: {
        price: true,
        downloads: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const now = new Date();
    const days = 30;
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dates: string[] = [];
    const buckets = new Map<string, { revenueCents: number; downloads: number }>();

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(dayStart);
      date.setUTCDate(dayStart.getUTCDate() - i);
      const key = date.toISOString().slice(0, 10);
      dates.push(key);
      buckets.set(key, { revenueCents: 0, downloads: 0 });
    }

    for (const item of items) {
      const bucketDate = (item.updatedAt || item.createdAt).toISOString().slice(0, 10);
      const target = buckets.get(bucketDate);
      if (!target) continue;

      const unitPriceCents = Math.max(0, item.price || 0);
      const downloads = Math.max(0, item.downloads || 0);

      target.revenueCents += unitPriceCents * downloads;
      target.downloads += downloads;
    }

    const timeline = dates.map((date) => {
      const bucket = buckets.get(date) || { revenueCents: 0, downloads: 0 };
      return {
        date,
        revenue: Number((bucket.revenueCents / 100).toFixed(2)),
        downloads: bucket.downloads,
        estimated: true,
      };
    });

    return NextResponse.json(timeline);
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/creator/revenue] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load creator revenue',
      },
      { status: 500 }
    );
  }
}
