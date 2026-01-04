import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

type WorkspaceFileItem = {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
};

function normalizePath(path: string): string {
  if (!path) return '/';
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.replace(/\\/g, '/');
}

async function resolveProjectId(userId: string, request: NextRequest, body: any): Promise<string | null> {
  const url = new URL(request.url);
  const headerProjectId = request.headers.get('x-project-id');
  const queryProjectId = url.searchParams.get('projectId');
  const bodyProjectId = body?.projectId;

  const candidate = headerProjectId || queryProjectId || bodyProjectId;
  if (typeof candidate === 'string' && candidate.trim()) return candidate;

  const project = await prisma.project.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  return project?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    const body = await request.json().catch(() => ({}));
    const projectId = await resolveProjectId(user.userId, request, body);

    if (!projectId) {
      return NextResponse.json({ files: [] satisfies WorkspaceFileItem[] });
    }

    // Ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ files: [] satisfies WorkspaceFileItem[] }, { status: 404 });
    }

    const files = await prisma.file.findMany({
      where: { projectId },
      select: { path: true, updatedAt: true },
      orderBy: { path: 'asc' },
    });

    const items: WorkspaceFileItem[] = files.map((f) => {
      const p = normalizePath(f.path);
      const name = p.split('/').filter(Boolean).pop() ?? p;
      return {
        path: p,
        name,
        type: 'file',
        modified: f.updatedAt?.toISOString?.() ?? undefined,
      };
    });

    return NextResponse.json({ files: items, projectId });
  } catch (error) {
    console.error('Workspace files error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
