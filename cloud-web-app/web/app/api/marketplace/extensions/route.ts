import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

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
  // Additional extensions for a richer marketplace
  {
    id: 'aethel.audio-engine',
    name: 'Spatial Audio Engine',
    description: 'Sistema de áudio 3D com HRTF, reverberação dinâmica e mixing profissional',
    version: '1.2.0',
    author: 'Aethel Team',
    category: 'engine',
    downloads: 8700,
    rating: 4.7,
    price: 0,
    icon: '/icons/audio.svg',
    tags: ['audio', '3d-sound', 'spatial', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.animation-tools',
    name: 'Animation Toolkit Pro',
    description: 'Ferramentas avançadas de animação: state machines, blending, IK/FK, retargeting',
    version: '1.5.0',
    author: 'Aethel Team',
    category: 'editor',
    downloads: 14200,
    rating: 4.85,
    price: 0,
    icon: '/icons/animation.svg',
    tags: ['animation', 'state-machine', 'ik', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.shader-editor',
    name: 'Node-Based Shader Editor',
    description: 'Editor visual de shaders com nós para criar materiais complexos sem código',
    version: '2.0.0',
    author: 'Aethel Team',
    category: 'editor',
    downloads: 22100,
    rating: 4.9,
    price: 0,
    icon: '/icons/shader.svg',
    tags: ['shaders', 'materials', 'pbr', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.behavior-tree',
    name: 'Behavior Tree AI',
    description: 'Sistema de behavior trees para IA de NPCs com editor visual e debugging',
    version: '1.3.0',
    author: 'Aethel Team',
    category: 'ai',
    downloads: 10500,
    rating: 4.75,
    price: 0,
    icon: '/icons/behavior.svg',
    tags: ['ai', 'npc', 'behavior-tree', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.dialogue-system',
    name: 'Dialogue & Quest System',
    description: 'Sistema completo de diálogos ramificados e quests com editor visual',
    version: '1.1.0',
    author: 'Aethel Team',
    category: 'tools',
    downloads: 7800,
    rating: 4.65,
    price: 0,
    icon: '/icons/dialogue.svg',
    tags: ['dialogue', 'quest', 'narrative', 'official'],
    builtin: true,
  },
  {
    id: 'aethel.procedural-gen',
    name: 'Procedural Generation Kit',
    description: 'Ferramentas para geração procedural de terrenos, dungeons, cidades e mais',
    version: '1.0.0',
    author: 'Aethel Team',
    category: 'tools',
    downloads: 6200,
    rating: 4.5,
    price: 0,
    icon: '/icons/procedural.svg',
    tags: ['procedural', 'generation', 'dungeons', 'official'],
    builtin: true,
  },
  {
    id: 'community.dark-souls-combat',
    name: 'Souls-like Combat System',
    description: 'Sistema de combate inspirado em Dark Souls com stamina, parry, e roll mechanics',
    version: '2.1.0',
    author: 'SoulsDevs',
    category: 'templates',
    downloads: 45600,
    rating: 4.9,
    price: 0,
    icon: '/icons/combat.svg',
    tags: ['combat', 'souls-like', 'action', 'community'],
    builtin: false,
  },
  {
    id: 'community.fps-controller',
    name: 'Advanced FPS Controller',
    description: 'Controlador FPS completo com wall-running, sliding, e movimento responsivo',
    version: '3.0.0',
    author: 'FPSMaster',
    category: 'templates',
    downloads: 38900,
    rating: 4.85,
    price: 0,
    icon: '/icons/fps.svg',
    tags: ['fps', 'controller', 'movement', 'community'],
    builtin: false,
  },
  {
    id: 'community.inventory-system',
    name: 'RPG Inventory System',
    description: 'Sistema de inventário completo com crafting, equipamentos, e loot tables',
    version: '1.8.0',
    author: 'RPGTools',
    category: 'tools',
    downloads: 29400,
    rating: 4.7,
    price: 0,
    icon: '/icons/inventory.svg',
    tags: ['inventory', 'rpg', 'crafting', 'community'],
    builtin: false,
  },
  {
    id: 'community.weather-system',
    name: 'Dynamic Weather System',
    description: 'Sistema de clima dinâmico com chuva, neve, fog, e transições suaves',
    version: '1.5.0',
    author: 'WeatherWorks',
    category: 'tools',
    downloads: 18700,
    rating: 4.6,
    price: 0,
    icon: '/icons/weather.svg',
    tags: ['weather', 'environment', 'atmosphere', 'community'],
    builtin: false,
  },
  {
    id: 'community.save-system',
    name: 'Universal Save System',
    description: 'Sistema de save/load universal com serialização automática e cloud saves',
    version: '2.0.0',
    author: 'SaveMaster',
    category: 'tools',
    downloads: 32100,
    rating: 4.8,
    price: 0,
    icon: '/icons/save.svg',
    tags: ['save', 'load', 'persistence', 'community'],
    builtin: false,
  },
];

export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    const devMode = request.nextUrl.searchParams.get('devMode') === 'true' ||
                    request.cookies.get('aethel_dev_mode')?.value === 'enabled';
    
    // In development, skip auth and return built-in extensions
    if (isDev || devMode) {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
      
      let allExtensions = BUILTIN_EXTENSIONS.map(ext => ({
        ...ext,
        displayName: ext.name,
        publisher: ext.author,
        categories: [ext.category],
        installed: true,
      }));
      
      // Filter by category
      if (category && category !== 'all') {
        allExtensions = allExtensions.filter(ext => ext.category === category);
      }
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        allExtensions = allExtensions.filter(ext => 
          ext.name.toLowerCase().includes(searchLower) ||
          ext.description.toLowerCase().includes(searchLower) ||
          ext.tags.some(tag => tag.includes(searchLower))
        );
      }
      
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
    }
    
    const user = requireAuth(request);
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

