import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

// Extensões built-in do Aethel Engine
const BUILTIN_EXTENSIONS = [
  {
    id: 'aethel.blueprint-editor',
    name: 'Blueprint Visual Scripting',
    description: 'Sistema de visual scripting estilo Unreal Engine para criar lógica de jogo sem código',
    version: '1.0.0',
    author: 'Aethel Team',
    category: 'editor',
    downloads: 15420,
    rating: 4.9,
    price: 0,
    icon: '/icons/blueprint.svg',
    tags: ['visual-scripting', 'blueprints', 'nodes', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.niagara-vfx',
    name: 'Niagara VFX Editor',
    description: 'Editor avançado de partículas e efeitos visuais baseado no Niagara da Unreal',
    version: '1.0.0',
    author: 'Aethel Team',
    category: 'editor',
    downloads: 12850,
    rating: 4.8,
    price: 0,
    icon: '/icons/niagara.svg',
    tags: ['vfx', 'particles', 'effects', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.ai-assistant',
    name: 'AI Game Assistant',
    description: 'Assistente de IA para criação de jogos - gera código, assets, e ajuda com gameplay',
    version: '2.0.0',
    author: 'Aethel Team',
    category: 'ai',
    downloads: 28900,
    rating: 4.95,
    price: 0,
    icon: '/icons/ai.svg',
    tags: ['ai', 'assistant', 'code-generation', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.landscape-editor',
    name: 'Landscape & Terrain Editor',
    description: 'Editor completo de terrenos com sculpting, painting, e foliage procedural',
    version: '1.0.0',
    author: 'Aethel Team',
    category: 'editor',
    downloads: 9500,
    rating: 4.7,
    price: 0,
    icon: '/icons/landscape.svg',
    tags: ['terrain', 'landscape', 'sculpting', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.physics-engine',
    name: 'Advanced Physics Engine',
    description: 'Motor de física completo com rigid bodies, constraints, e simulação realista',
    version: '1.0.0',
    author: 'Aethel Team',
    category: 'engine',
    downloads: 18200,
    rating: 4.85,
    price: 0,
    icon: '/icons/physics.svg',
    tags: ['physics', 'simulation', 'rigid-body', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.multiplayer',
    name: 'Multiplayer Networking',
    description: 'Sistema completo de networking para jogos multiplayer com replicação e matchmaking',
    version: '1.0.0',
    author: 'Aethel Team',
    category: 'networking',
    downloads: 11300,
    rating: 4.6,
    price: 0,
    icon: '/icons/multiplayer.svg',
    tags: ['multiplayer', 'networking', 'replication', 'official'],
    builtin: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-extensions-get',
      key: user.userId,
      max: 480,
      windowMs: 60 * 60 * 1000,
      message: 'Too many marketplace extensions requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireFeatureForUser(user.userId, 'marketplace');
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    
    // Busca items do marketplace no banco
    const where: any = {};
    if (category && category !== 'all') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const [dbItems, total, installedRows] = await Promise.all([
      prisma.marketplaceItem.findMany({
        where,
        orderBy: { downloads: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceItem.count({ where }),
      prisma.installedExtension.findMany({
        where: { userId: user.userId },
        select: { extensionId: true },
      }),
    ]);

    const installedSet = new Set(installedRows.map(r => r.extensionId));
    
    // Converte items do DB para formato de extensão
    const marketplaceExtensions = dbItems.map(item => ({
      id: item.id,
      name: item.title,
      description: item.description,
      version: '1.0.0',
      author: item.authorId,
      category: item.category,
      downloads: item.downloads,
      rating: item.rating,
      price: item.price,
      icon: '/icons/extension.svg',
      tags: [],
      builtin: false,
      installed: installedSet.has(item.id),
    }));
    
    // Combina built-in com marketplace
    let allExtensions = [
      ...BUILTIN_EXTENSIONS.map((ext) => ({ ...ext, installed: true })),
      ...marketplaceExtensions,
    ];
    
    // Filtra por categoria se especificado
    if (category && category !== 'all') {
      allExtensions = allExtensions.filter(ext => ext.category === category);
    }
    
    // Filtra por busca se especificado
    if (search) {
      const searchLower = search.toLowerCase();
      allExtensions = allExtensions.filter(ext => 
        ext.name.toLowerCase().includes(searchLower) ||
        ext.description.toLowerCase().includes(searchLower) ||
        ext.tags.some(tag => tag.includes(searchLower))
      );
    }
    
    // Paginação
    const startIndex = (page - 1) * limit;
    const paginatedExtensions = allExtensions.slice(startIndex, startIndex + limit);
    
    return NextResponse.json({
      success: true,
      extensions: paginatedExtensions,
      pagination: {
        page,
        limit,
        total: allExtensions.length,
        pages: Math.ceil(allExtensions.length / limit),
      },
      categories: ['all', 'editor', 'engine', 'ai', 'networking', 'tools', 'templates'],
    });
  } catch (error) {
    console.error('Failed to list extensions:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

