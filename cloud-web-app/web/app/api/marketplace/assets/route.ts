/**
 * AETHEL ENGINE - Marketplace Assets API
 * 
 * Endpoint para buscar assets do marketplace com filtros.
 */

import { NextRequest, NextResponse } from 'next/server';

interface Asset {
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
}

interface MarketplaceResponse {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const query = searchParams.get('q') || '';
    const categories = searchParams.get('categories')?.split(',') || [];
    const freeOnly = searchParams.get('free') === 'true';
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const minPrice = parseInt(searchParams.get('minPrice') || '0');
    const maxPrice = parseInt(searchParams.get('maxPrice') || '100000');
    const licenses = searchParams.get('licenses')?.split(',') || [];
    const sort = searchParams.get('sort') || 'popular';

    // TODO: Buscar assets reais do banco de dados
    // Por enquanto retorna lista vazia - será populado quando houver assets
    
    const assets: Asset[] = [];
    const total = 0;
    
    // Em produção:
    // const where = {
    //   AND: [
    //     query ? { OR: [
    //       { name: { contains: query, mode: 'insensitive' } },
    //       { description: { contains: query, mode: 'insensitive' } },
    //     ]} : {},
    //     categories.length ? { category: { in: categories } } : {},
    //     freeOnly ? { price: 0 } : {},
    //     { rating: { gte: minRating } },
    //     { price: { gte: minPrice, lte: maxPrice } },
    //     licenses.length ? { license: { in: licenses } } : {},
    //   ],
    // };
    
    // const assets = await db.assets.findMany({
    //   where,
    //   orderBy: getOrderBy(sort),
    //   skip: (page - 1) * limit,
    //   take: limit,
    // });

    const response: MarketplaceResponse = {
      assets,
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar assets:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar assets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Criar novo asset no banco de dados
    // Validar dados, fazer upload de arquivos, etc.
    
    return NextResponse.json(
      { error: 'Endpoint em desenvolvimento' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Erro ao criar asset:', error);
    return NextResponse.json(
      { error: 'Falha ao criar asset' },
      { status: 500 }
    );
  }
}
