/**
 * AETHEL ENGINE - Marketplace Assets API
 * 
 * REAL endpoint para buscar e criar assets do marketplace.
 * Usa Prisma para DB e S3 para storage de arquivos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToStorage, getSignedDownloadUrl } from '@/lib/storage-service';
import { getUserFromRequest } from '@/lib/auth-server';

interface MarketplaceResponse {
  assets: any[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Helper para ordenação
function getOrderBy(sort: string): any {
  switch (sort) {
    case 'newest':
      return { createdAt: 'desc' };
    case 'price-low':
      return { price: 'asc' };
    case 'price-high':
      return { price: 'desc' };
    case 'rating':
      return { rating: 'desc' };
    case 'popular':
    default:
      return { downloads: 'desc' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100);
    const query = searchParams.get('q') || '';
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const freeOnly = searchParams.get('free') === 'true';
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const minPrice = parseInt(searchParams.get('minPrice') || '0');
    const maxPrice = parseInt(searchParams.get('maxPrice') || '10000000');
    const licenses = searchParams.get('licenses')?.split(',').filter(Boolean) || [];
    const sort = searchParams.get('sort') || 'popular';
    const featured = searchParams.get('featured') === 'true';

    // Build WHERE clause dinamicamente
    const where: any = {
      isPublished: true,
      isApproved: true,
      AND: [],
    };
    
    // Search query
    if (query) {
      where.AND.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query.toLowerCase()] } },
        ],
      });
    }
    
    // Category filter
    if (categories.length > 0) {
      where.AND.push({ category: { in: categories } });
    }
    
    // Free only
    if (freeOnly) {
      where.AND.push({ price: 0 });
    } else {
      // Price range
      where.AND.push({
        price: { gte: minPrice, lte: maxPrice },
      });
    }
    
    // Rating filter
    if (minRating > 0) {
      where.AND.push({ rating: { gte: minRating } });
    }
    
    // License filter
    if (licenses.length > 0) {
      where.AND.push({ license: { in: licenses } });
    }
    
    // Featured filter
    if (featured) {
      where.AND.push({ isFeatured: true });
    }
    
    // Remove empty AND array
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Query DB
    const [assets, total] = await Promise.all([
      prisma.marketplaceItem.findMany({
        where,
        orderBy: getOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.marketplaceItem.count({ where }),
    ]);
    
    // Transform to API response format
    const transformedAssets = assets.map((asset) => ({
      id: asset.id,
      name: asset.title,
      description: asset.description,
      shortDescription: asset.shortDescription,
      price: asset.price,
      currency: asset.currency,
      category: asset.category,
      subcategory: asset.subcategory,
      tags: asset.tags,
      images: asset.images,
      thumbnailUrl: asset.thumbnailUrl,
      previewUrl: asset.previewUrl,
      fileSize: asset.fileSize,
      version: asset.version,
      compatibility: asset.compatibility,
      license: asset.license,
      creator: {
        id: asset.author?.id || asset.authorId,
        name: asset.author?.name || 'Anonymous',
        avatar: asset.author?.avatar || '/default-avatar.png',
        verified: true,
      },
      stats: {
        downloads: asset.downloads,
        rating: asset.rating,
        reviewCount: asset.reviewCount,
        favorites: asset.favorites,
      },
      isFeatured: asset.isFeatured,
      isNew: asset.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isFree: asset.price === 0,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    }));

    const response: MarketplaceResponse = {
      assets: transformedAssets,
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
    // Autenticação
    const user = getUserFromRequest(request);
    if (!user?.userId) {
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    
    // Extrair dados do form
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const shortDescription = formData.get('shortDescription') as string || '';
    const price = parseInt(formData.get('price') as string || '0');
    const category = formData.get('category') as string;
    const subcategory = formData.get('subcategory') as string || '';
    const tags = JSON.parse(formData.get('tags') as string || '[]');
    const license = formData.get('license') as string || 'standard';
    const version = formData.get('version') as string || '1.0.0';
    const compatibility = JSON.parse(formData.get('compatibility') as string || '["Aethel 1.0"]');
    
    // Validação
    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: title, description, category' },
        { status: 400 }
      );
    }
    
    // Arquivo principal do asset
    const assetFile = formData.get('file') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    
    // Criar registro inicial no DB
    const item = await prisma.marketplaceItem.create({
      data: {
        title,
        description,
        shortDescription,
        price,
        category,
        subcategory,
        tags,
        license,
        version,
        compatibility,
        authorId: user.userId,
        isPublished: false, // Precisa de aprovação
        isApproved: false,
      },
    });
    
    // Upload para S3 se houver arquivo
    if (assetFile) {
      const arrayBuffer = await assetFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const key = `marketplace/${item.id}/${assetFile.name}`;
      
      await uploadToStorage('ASSETS', key, buffer, {
        contentType: assetFile.type,
        metadata: {
          originalName: assetFile.name,
          uploadedBy: user.userId,
        },
      });
      
      // Atualizar registro com path do S3
      await prisma.marketplaceItem.update({
        where: { id: item.id },
        data: {
          storagePath: key,
          fileSize: buffer.length,
        },
      });
    }
    
    // Upload thumbnail
    if (thumbnailFile) {
      const arrayBuffer = await thumbnailFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const key = `marketplace/${item.id}/thumbnail.${thumbnailFile.name.split('.').pop()}`;
      
      const result = await uploadToStorage('ASSETS', key, buffer, {
        contentType: thumbnailFile.type,
        acl: 'public-read',
      });
      
      // Gerar URL assinada para thumbnail
      const thumbnailUrl = await getSignedDownloadUrl('ASSETS', key, 86400 * 365); // 1 year
      
      await prisma.marketplaceItem.update({
        where: { id: item.id },
        data: { thumbnailUrl },
      });
    }
    
    // Buscar item atualizado
    const updatedItem = await prisma.marketplaceItem.findUnique({
      where: { id: item.id },
    });
    
    return NextResponse.json({
      success: true,
      asset: updatedItem,
      message: 'Asset criado! Aguardando aprovação.',
    });
  } catch (error) {
    console.error('Erro ao criar asset:', error);
    return NextResponse.json(
      { error: 'Falha ao criar asset' },
      { status: 500 }
    );
  }
}
