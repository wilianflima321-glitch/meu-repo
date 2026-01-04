import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

function normalizePath(path: string): string {
  if (!path) return '/';
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.replace(/\\/g, '/');
}

async function resolveProjectId(userId: string, request: NextRequest): Promise<string | null> {
  const url = new URL(request.url);
  const headerProjectId = request.headers.get('x-project-id');
  const queryProjectId = url.searchParams.get('projectId');

  const candidate = headerProjectId || queryProjectId;
  if (typeof candidate === 'string' && candidate.trim()) return candidate;

  const project = await prisma.project.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  return project?.id ?? null;
}

// GET /api/files/read?path=/src/index.ts&projectId=...
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const url = new URL(req.url);
    const rawPath = url.searchParams.get('path');
    if (!rawPath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const projectId = await resolveProjectId(user.userId, req);
    if (!projectId) {
      return NextResponse.json({ error: 'No project available' }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const path = normalizePath(rawPath);

    // DB pode armazenar com ou sem '/', tenta ambos.
    const file = await prisma.file.findFirst({
      where: {
        projectId,
        OR: [{ path }, { path: path.replace(/^\//, '') }],
      },
      select: { path: true, content: true, language: true, updatedAt: true },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found', path }, { status: 404 });
    }

    return NextResponse.json({
      path: normalizePath(file.path),
      content: file.content ?? '',
      language: file.language ?? null,
      modified: file.updatedAt?.toISOString?.() ?? null,
      projectId,
    });
  } catch (error) {
    console.error('Read file error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
