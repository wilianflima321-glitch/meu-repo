import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

type AssetRecord = {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  currency: string;
  category: string;
  subcategory: string;
  tags: string[];
  images: string[];
  thumbnailUrl: string;
  previewUrl?: string;
  fileSize: number;
  version: string;
  compatibility: string[];
  license: 'standard' | 'extended' | 'exclusive';
  creator: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
  };
  stats: {
    downloads: number;
    rating: number;
    reviewCount: number;
    favorites: number;
  };
  isFeatured: boolean;
  isNew: boolean;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
};

function toThumbnailDataUri(title: string): string {
  const initial = (title || 'A').trim().charAt(0).toUpperCase() || 'A';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#1e3a8a'/><stop offset='100%' stop-color='#0f766e'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/><text x='50%' y='50%' fill='white' font-family='Inter, Arial, sans-serif' font-size='64' text-anchor='middle' dominant-baseline='middle'>${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function parseIntSafe(value: string | null, fallback: number): number {
  const next = Number.parseInt(value || '', 10);
  return Number.isFinite(next) ? next : fallback;
}

function parseFloatSafe(value: string | null, fallback: number): number {
  const next = Number.parseFloat(value || '');
  return Number.isFinite(next) ? next : fallback;
}

function getOrderBy(sort: string) {
  switch (sort) {
    case 'newest':
      return { createdAt: 'desc' as const };
    case 'rating':
      return { rating: 'desc' as const };
    case 'price-asc':
      return { price: 'asc' as const };
    case 'price-desc':
      return { price: 'desc' as const };
    case 'popular':
    default:
      return { downloads: 'desc' as const };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
    const limit = Math.min(60, Math.max(1, parseIntSafe(searchParams.get('limit'), 24)));
    const query = (searchParams.get('q') || '').trim();
    const categories = (searchParams.get('categories') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const freeOnly = searchParams.get('free') === 'true';
    const minRating = Math.max(0, parseFloatSafe(searchParams.get('minRating'), 0));
    const minPrice = Math.max(0, parseIntSafe(searchParams.get('minPrice'), 0));
    const maxPrice = Math.max(minPrice, parseIntSafe(searchParams.get('maxPrice'), 100000));
    const licenses = (searchParams.get('licenses') || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const sort = searchParams.get('sort') || 'popular';

    const supportsRequestedLicense =
      licenses.length === 0 || licenses.includes('standard');

    if (!supportsRequestedLicense) {
      return NextResponse.json({
        assets: [],
        total: 0,
        page,
        pageSize: limit,
        hasMore: false,
      });
    }

    const where = {
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' as const } },
              { description: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(categories.length > 0 ? { category: { in: categories } } : {}),
      ...(freeOnly ? { price: 0 } : {}),
      price: { gte: minPrice, lte: maxPrice },
      rating: { gte: minRating },
    };

    const [total, items] = await Promise.all([
      prisma.marketplaceItem.count({ where }),
      prisma.marketplaceItem.findMany({
        where,
        orderBy: getOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          category: true,
          authorId: true,
          downloads: true,
          rating: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const authorIds = Array.from(new Set(items.map((item) => item.authorId).filter(Boolean)));
    const creators = authorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true, avatar: true },
        })
      : [];
    const creatorsById = new Map(creators.map((creator) => [creator.id, creator]));

    const now = Date.now();
    const assets: AssetRecord[] = items.map((item) => {
      const creator = creatorsById.get(item.authorId);
      const createdAt = item.createdAt.toISOString();
      const updatedAt = item.updatedAt.toISOString();
      const ageMs = now - item.createdAt.getTime();

      return {
        id: item.id,
        name: item.title,
        description: item.description || '',
        shortDescription: (item.description || '').slice(0, 140),
        price: item.price,
        currency: 'BRL',
        category: item.category || 'uncategorized',
        subcategory: '',
        tags: [],
        images: [],
        thumbnailUrl: toThumbnailDataUri(item.title),
        previewUrl: undefined,
        fileSize: 0,
        version: '1.0.0',
        compatibility: ['web'],
        license: 'standard',
        creator: {
          id: creator?.id || item.authorId,
          name: creator?.name || 'Unknown creator',
          avatar: creator?.avatar || '',
          verified: false,
        },
        stats: {
          downloads: Math.max(0, item.downloads || 0),
          rating: Number(Math.max(0, item.rating || 0).toFixed(2)),
          reviewCount: 0,
          favorites: 0,
        },
        isFeatured: (item.downloads || 0) >= 100,
        isNew: ageMs <= 1000 * 60 * 60 * 24 * 30,
        isFree: item.price === 0,
        createdAt,
        updatedAt,
      };
    });

    return NextResponse.json({
      assets,
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
      dataCompleteness: 'partial',
    });
  } catch (error) {
    console.error('[marketplace/assets] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace assets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const titleInput = typeof body?.title === 'string' ? body.title : body?.name;
    const title = typeof titleInput === 'string' ? titleInput.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const categoryRaw = typeof body?.category === 'string' ? body.category.trim() : '';
    const category = categoryRaw || 'asset';

    if (!title) {
      return NextResponse.json({ error: 'Asset title is required' }, { status: 400 });
    }
    if (title.length > 180) {
      return NextResponse.json(
        { error: 'Asset title must be 180 characters or less' },
        { status: 400 }
      );
    }

    let priceCents = 0;
    if (Number.isFinite(Number(body?.priceCents))) {
      priceCents = Math.max(0, Math.round(Number(body.priceCents)));
    } else if (Number.isFinite(Number(body?.price))) {
      priceCents = Math.max(0, Math.round(Number(body.price) * 100));
    }

    const created = await prisma.marketplaceItem.create({
      data: {
        title,
        description,
        category,
        price: priceCents,
        authorId: user.userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        downloads: true,
        rating: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        asset: {
          id: created.id,
          name: created.title,
          description: created.description || '',
          category: created.category || 'uncategorized',
          price: created.price,
          downloads: created.downloads || 0,
          rating: Number((created.rating || 0).toFixed(2)),
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
        source: 'marketplace-item',
      },
      { status: 201 }
    );
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('[marketplace/assets:POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to publish marketplace asset' },
      { status: 500 }
    );
  }
}
