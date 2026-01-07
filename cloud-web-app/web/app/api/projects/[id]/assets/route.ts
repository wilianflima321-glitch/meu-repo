/**
 * Project Assets API
 * 
 * GET /api/projects/[id]/assets - List all assets for a project
 * Supports pagination, filtering, and search for AAA-scale projects.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

// Asset type mapping based on file extension
const EXTENSION_TO_TYPE: Record<string, string> = {
  // 3D Models
  '.glb': 'mesh',
  '.gltf': 'mesh',
  '.fbx': 'mesh',
  '.obj': 'mesh',
  '.dae': 'mesh',
  // Textures
  '.png': 'texture',
  '.jpg': 'texture',
  '.jpeg': 'texture',
  '.webp': 'texture',
  '.tga': 'texture',
  '.exr': 'texture',
  '.hdr': 'texture',
  // Audio
  '.mp3': 'audio',
  '.wav': 'audio',
  '.ogg': 'audio',
  '.flac': 'audio',
  // Video
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video',
  // Scripts/Blueprints
  '.blueprint': 'blueprint',
  '.ts': 'script',
  '.js': 'script',
  // Materials
  '.material': 'material',
  '.mat': 'material',
  // Animations
  '.anim': 'animation',
  // Prefabs
  '.prefab': 'prefab',
  // Levels
  '.level': 'level',
  '.scene': 'level',
};

interface AssetFile {
  id: string;
  name: string;
  type: string;
  path: string;
  extension: string;
  size: number;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
  isFavorite: boolean;
  createdAt: string;
  modifiedAt: string;
}

interface AssetFolder {
  id: string;
  name: string;
  path: string;
  children: (AssetFile | AssetFolder)[];
  isExpanded?: boolean;
}

// GET /api/projects/[id]/assets
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const path = searchParams.get('path') || '/Content';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.userId },
          { members: { some: { userId: user.userId } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get assets from database (metadata)
    const dbAssets = await prisma.asset.findMany({
      where: {
        projectId: params.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { tags: { has: search.toLowerCase() } },
          ],
        }),
        ...(type && type !== 'all' && { type }),
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Also scan filesystem for any unregistered assets
    const uploadsDir = join(process.cwd(), 'public', 'uploads', params.id);
    let fileSystemAssets: AssetFile[] = [];

    if (existsSync(uploadsDir)) {
      fileSystemAssets = await scanDirectory(uploadsDir, params.id);
    }

    // Merge database assets with filesystem (DB takes priority)
    // Note: path, thumbnail, metadata, isFavorite, updatedAt require prisma generate
    const dbAssetPaths = new Set(dbAssets.map(a => a.url)); // Use url as path for now
    const mergedAssets = [
      ...dbAssets.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        path: a.url, // TODO: Use a.path after prisma generate
        extension: extname(a.name),
        size: a.size || 0,
        thumbnail: undefined as string | undefined, // TODO: Use a.thumbnail after prisma generate
        metadata: {} as Record<string, unknown>, // TODO: Use a.metadata after prisma generate
        isFavorite: false, // TODO: Use a.isFavorite after prisma generate
        createdAt: a.createdAt.toISOString(),
        modifiedAt: a.createdAt.toISOString(), // TODO: Use a.updatedAt after prisma generate
      })),
      ...fileSystemAssets.filter(f => !dbAssetPaths.has(f.path)),
    ];

    // Build folder structure
    const folderStructure = buildFolderStructure(mergedAssets);

    // Get total count
    const totalCount = await prisma.asset.count({
      where: {
        projectId: params.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { tags: { has: search.toLowerCase() } },
          ],
        }),
        ...(type && type !== 'all' && { type }),
      },
    });

    return NextResponse.json({
      assets: folderStructure,
      flatAssets: mergedAssets,
      pagination: {
        page,
        limit,
        total: totalCount + fileSystemAssets.length,
        totalPages: Math.ceil((totalCount + fileSystemAssets.length) / limit),
      },
    });
  } catch (error) {
    console.error('Get project assets error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// Recursively scan directory for assets
async function scanDirectory(dir: string, projectId: string, relativePath = ''): Promise<AssetFile[]> {
  const assets: AssetFile[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const assetPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        const subAssets = await scanDirectory(fullPath, projectId, assetPath);
        assets.push(...subAssets);
      } else {
        // Skip metadata files
        if (entry.name.endsWith('.meta') || entry.name.startsWith('.')) continue;
        
        const ext = extname(entry.name).toLowerCase();
        const type = EXTENSION_TO_TYPE[ext] || 'other';
        const stats = await stat(fullPath);
        
        assets.push({
          id: `fs-${projectId}-${assetPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: entry.name,
          type,
          path: `/uploads/${projectId}/${assetPath}`,
          extension: ext,
          size: stats.size,
          thumbnail: type === 'texture' ? `/uploads/${projectId}/${assetPath}` : undefined,
          metadata: {},
          isFavorite: false,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', error);
  }
  
  return assets;
}

// Build hierarchical folder structure from flat asset list
function buildFolderStructure(assets: AssetFile[]): (AssetFile | AssetFolder)[] {
  const root: AssetFolder = {
    id: 'root',
    name: 'Content',
    path: '/Content',
    children: [],
    isExpanded: true,
  };
  
  const folderMap = new Map<string, AssetFolder>();
  folderMap.set('/Content', root);
  
  // Group assets by directory
  for (const asset of assets) {
    const pathParts = asset.path.split('/').filter(Boolean);
    let currentPath = '/Content';
    let currentFolder = root;
    
    // Skip the first part if it's 'uploads' or similar
    const startIndex = pathParts.findIndex(p => p !== 'uploads' && p !== 'public');
    
    for (let i = startIndex; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const newPath = `${currentPath}/${part}`;
      
      if (!folderMap.has(newPath)) {
        const newFolder: AssetFolder = {
          id: `folder-${newPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: part,
          path: newPath,
          children: [],
          isExpanded: false,
        };
        folderMap.set(newPath, newFolder);
        currentFolder.children.push(newFolder);
      }
      
      currentFolder = folderMap.get(newPath)!;
      currentPath = newPath;
    }
    
    // Add asset to its folder
    currentFolder.children.push(asset);
  }
  
  return root.children;
}
