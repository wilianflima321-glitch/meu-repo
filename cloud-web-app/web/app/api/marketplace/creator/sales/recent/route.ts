import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const items = await prisma.marketplaceItem.findMany({
      where: {
        authorId: user.userId,
        downloads: { gt: 0 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        price: true,
        downloads: true,
        updatedAt: true,
      },
    });

    const sales = items.map((item) => ({
      id: `estimated-${item.id}`,
      assetName: item.title,
      buyerName: 'Marketplace aggregate',
      amount: Number((((item.price || 0) * (item.downloads || 0)) / 100).toFixed(2)),
      date: item.updatedAt.toISOString(),
      estimated: true,
    }));

    return NextResponse.json(sales);
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/creator/sales/recent] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load recent sales',
      },
      { status: 500 }
    );
  }
}
