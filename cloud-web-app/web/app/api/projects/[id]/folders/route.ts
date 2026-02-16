/**
 * Project Folders API
 *
 * Persists virtual folder structure in Prisma `Folder` model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

function normalizeFolderPath(input: string): string {
  const base = (input || '/Content').replace(/\\/g, '/').trim();
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, '/');
  if (collapsed.length <= 1) return '/';
  return collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
}

function sanitizeFolderName(input: string): string {
  return (input || '')
    .trim()
    .replace(/\\/g, '')
    .replace(/\//g, '')
    .replace(/\s+/g, ' ');
}

function buildFolderPath(parentPath: string, folderName: string): string {
  const normalizedParent = normalizeFolderPath(parentPath);
  const cleanName = sanitizeFolderName(folderName);
  if (!cleanName) return normalizedParent;
  if (normalizedParent === '/') return `/${cleanName}`;
  return `${normalizedParent}/${cleanName}`;
}

async function ensureProjectAccess(projectId: string, userId: string, writeAccess: boolean) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        {
          members: {
            some: {
              userId,
              ...(writeAccess ? { role: { in: ['owner', 'editor'] } } : {}),
            },
          },
        },
      ],
    },
    select: { id: true },
  });
}

// ============================================================================
// GET - List Folders
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    const project = await ensureProjectAccess(params.id, user.userId, false);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const parentPathParam = url.searchParams.get('parentPath');
    const includeAll = url.searchParams.get('flat') === 'true';

    const folders = await prisma.folder.findMany({
      where: {
        projectId: params.id,
        ...(parentPathParam && !includeAll
          ? { parentPath: normalizeFolderPath(parentPathParam) }
          : {}),
      },
      orderBy: { path: 'asc' },
      select: {
        id: true,
        name: true,
        path: true,
        parentPath: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      folders: folders.map((folder) => ({
        ...folder,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      })),
      total: folders.length,
      source: 'prisma-folder',
    });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('List folders error:', error);
    return apiInternalError('Failed to list folders');
  }
}

// ============================================================================
// POST - Create Folder
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    const project = await ensureProjectAccess(params.id, user.userId, true);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const folderName = sanitizeFolderName(String(body?.name || ''));
    const parentPath = normalizeFolderPath(String(body?.parentPath || '/Content'));
    const color = typeof body?.color === 'string' ? body.color.trim() : null;

    if (!folderName) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }
    if (folderName.length > 128) {
      return NextResponse.json(
        { error: 'Folder name must be 128 characters or less' },
        { status: 400 }
      );
    }

    const fullPath = buildFolderPath(parentPath, folderName);
    if (fullPath === parentPath) {
      return NextResponse.json(
        { error: 'Invalid folder path' },
        { status: 400 }
      );
    }

    const created = await prisma.folder.create({
      data: {
        name: folderName,
        path: fullPath,
        parentPath,
        color: color || null,
        projectId: params.id,
        createdById: user.userId,
      },
      select: {
        id: true,
        name: true,
        path: true,
        parentPath: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        folder: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Folder already exists in this path' },
        { status: 409 }
      );
    }

    console.error('Create folder error:', error);
    return apiInternalError('Failed to create folder');
  }
}

// ============================================================================
// DELETE - Delete Folder
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    const project = await ensureProjectAccess(params.id, user.userId, true);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const folderId = typeof body?.folderId === 'string' ? body.folderId.trim() : '';
    const recursive = body?.recursive === true;

    let targetPath = '';
    if (typeof body?.path === 'string' && body.path.trim()) {
      targetPath = normalizeFolderPath(body.path);
    } else if (folderId) {
      const folderById = await prisma.folder.findFirst({
        where: { id: folderId, projectId: params.id },
        select: { path: true },
      });
      targetPath = folderById?.path || '';
    }

    if (!targetPath) {
      return NextResponse.json(
        { error: 'Folder path or folderId is required' },
        { status: 400 }
      );
    }

    const folder = await prisma.folder.findFirst({
      where: { projectId: params.id, path: targetPath },
      select: { id: true, path: true },
    });
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const childCount = await prisma.folder.count({
      where: {
        projectId: params.id,
        path: { startsWith: `${targetPath}/` },
      },
    });

    if (childCount > 0 && !recursive) {
      return NextResponse.json(
        {
          error: 'FOLDER_NOT_EMPTY',
          message: 'Folder has child folders. Retry with recursive=true to delete subtree.',
          childFolders: childCount,
        },
        { status: 409 }
      );
    }

    const deleted = await prisma.folder.deleteMany({
      where: {
        projectId: params.id,
        OR: recursive
          ? [{ path: targetPath }, { path: { startsWith: `${targetPath}/` } }]
          : [{ path: targetPath }],
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
      recursive,
    });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('Delete folder error:', error);
    return apiInternalError('Failed to delete folder');
  }
}
