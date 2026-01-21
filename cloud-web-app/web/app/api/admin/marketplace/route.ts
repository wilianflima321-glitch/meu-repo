import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// MARKETPLACE ADMIN API
// =============================================================================

type MarketplaceItem = {
  id: string;
  title: string;
  category: string;
  price: number;
  downloads: number;
  rating: number;
  authorId: string;
  createdAt: string;
};

async function getHandler(_req: NextRequest) {
  try {
    const items = await prisma.marketplaceItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        price: item.price / 100,
        downloads: item.downloads,
        rating: item.rating,
        authorId: item.authorId,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Admin Marketplace] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch marketplace' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:dashboard:view');
