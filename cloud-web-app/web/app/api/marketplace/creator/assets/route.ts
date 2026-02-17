import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

function toThumbnailDataUri(title: string): string {
  const initial = (title || 'A').trim().charAt(0).toUpperCase() || 'A';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#1e3a8a'/><stop offset='100%' stop-color='#0f766e'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/><text x='50%' y='50%' fill='white' font-family='Inter, Arial, sans-serif' font-size='64' text-anchor='middle' dominant-baseline='middle'>${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const items = await prisma.marketplaceItem.findMany({
      where: { authorId: user.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        downloads: true,
        rating: true,
        createdAt: true,
      },
    });

    const assets = items.map((item) => ({
      id: item.id,
      name: item.title,
      thumbnail: toThumbnailDataUri(item.title),
      category: item.category || 'other',
      price: Number((Math.max(0, item.price || 0) / 100).toFixed(2)),
      revenue: Math.max(0, item.price || 0) * Math.max(0, item.downloads || 0),
      downloads: Math.max(0, item.downloads || 0),
      views: Math.max(0, item.downloads || 0),
      rating: Number(Math.max(0, item.rating || 0).toFixed(2)),
      status: 'published' as const,
      createdAt: item.createdAt.toISOString(),
      metadata: {
        descriptionLength: (item.description || '').length,
      },
    }));

    return NextResponse.json(assets);
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/creator/assets] Error:', error);
    return apiInternalError('Failed to load creator assets');
  }
}
