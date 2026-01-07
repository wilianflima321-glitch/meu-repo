/**
 * Project Folders API
 * 
 * Manages virtual folder structure within projects.
 * NOTE: Requires `npx prisma generate` after schema changes to enable Folder model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

// ============================================================================
// GET - List Folders (simplified pending Prisma regeneration)
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);

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
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parentPath = searchParams.get('parentPath') || '/Content';

    // Return default folder structure until Prisma client is regenerated
    // TODO: Use prisma.folder after running `npx prisma generate`
    const defaultFolders = [
      { id: 'characters', name: 'Characters', path: '/Content/Characters', parentPath: '/Content', itemCount: 0 },
      { id: 'environments', name: 'Environments', path: '/Content/Environments', parentPath: '/Content', itemCount: 0 },
      { id: 'materials', name: 'Materials', path: '/Content/Materials', parentPath: '/Content', itemCount: 0 },
      { id: 'audio', name: 'Audio', path: '/Content/Audio', parentPath: '/Content', itemCount: 0 },
      { id: 'blueprints', name: 'Blueprints', path: '/Content/Blueprints', parentPath: '/Content', itemCount: 0 },
    ].filter(f => f.parentPath === parentPath);

    return NextResponse.json({
      folders: defaultFolders,
      parentPath,
      note: 'Folder persistence requires: npx prisma generate && npx prisma db push',
    });
  } catch (error: any) {
    console.error('List folders error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to list folders' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create Folder (simplified pending Prisma regeneration)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.userId },
          { members: { some: { userId: user.userId, role: { in: ['owner', 'editor'] } } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { parentPath = '/Content', name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    const sanitizedName = name.trim().replace(/[<>:"/\\|?*]/g, '_');
    const folderPath = `${parentPath}/${sanitizedName}`;

    // TODO: Create folder in DB after prisma generate
    return NextResponse.json({
      id: `temp_${Date.now()}`,
      name: sanitizedName,
      path: folderPath,
      parentPath,
      note: 'Folder persistence requires: npx prisma generate && npx prisma db push',
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Folder (simplified pending Prisma regeneration)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    
    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.userId },
          { members: { some: { userId: user.userId, role: { in: ['owner', 'editor'] } } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('path');

    if (!folderPath) {
      return NextResponse.json(
        { error: 'Folder path is required' },
        { status: 400 }
      );
    }

    // TODO: Delete folder from DB after prisma generate
    return NextResponse.json({
      deleted: true,
      path: folderPath,
      note: 'Folder persistence requires: npx prisma generate && npx prisma db push',
    });
  } catch (error: any) {
    console.error('Delete folder error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}