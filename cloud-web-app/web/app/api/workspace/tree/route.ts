import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

type WorkspaceTreeNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: WorkspaceTreeNode[];
  expanded?: boolean;
};

function normalizePath(path: string): string {
  if (!path) return '/';
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.replace(/\\/g, '/');
}

function buildTree(filePaths: string[]): WorkspaceTreeNode[] {
  const root: { children: Map<string, any> } = { children: new Map() };

  for (const raw of filePaths) {
    const full = normalizePath(raw);
    const parts = full.split('/').filter(Boolean);
    let cursor = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      const isLeaf = i === parts.length - 1;

      if (!cursor.children.has(part)) {
        cursor.children.set(part, {
          name: part,
          path: currentPath,
          type: isLeaf ? 'file' : 'directory',
          children: new Map<string, any>(),
          expanded: false,
        });
      }

      const node = cursor.children.get(part);
      // Se um caminho chega depois transformando algo em diretório, ajusta.
      if (!isLeaf && node.type !== 'directory') {
        node.type = 'directory';
        node.children = node.children || new Map<string, any>();
      }

      cursor = node;
    }
  }

  const toArray = (map: Map<string, any>): WorkspaceTreeNode[] => {
    const nodes = Array.from(map.values()).map((n) => {
      const childrenMap: Map<string, any> | undefined = n.children instanceof Map ? n.children : undefined;
      const children = childrenMap ? toArray(childrenMap) : undefined;
      const out: WorkspaceTreeNode = {
        name: n.name,
        path: n.path,
        type: n.type,
        ...(children && children.length ? { children } : {}),
        expanded: false,
      };
      return out;
    });

    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  };

  return toArray(root.children);
}

async function resolveProjectId(userId: string, request: NextRequest, body: any): Promise<string | null> {
  const url = new URL(request.url);
  const headerProjectId = request.headers.get('x-project-id');
  const queryProjectId = url.searchParams.get('projectId');
  const bodyProjectId = body?.projectId;

  const candidate = headerProjectId || queryProjectId || bodyProjectId;
  if (typeof candidate === 'string' && candidate.trim()) return candidate;

  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
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
      return NextResponse.json({ tree: [] satisfies WorkspaceTreeNode[] });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.userId },
          { members: { some: { userId: user.userId } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ tree: [] satisfies WorkspaceTreeNode[] }, { status: 404 });
    }

    const files = await prisma.file.findMany({
      where: { projectId },
      select: { path: true },
      orderBy: { path: 'asc' },
    });

    const tree = buildTree(files.map((f) => f.path));

    return NextResponse.json({ tree, projectId });
  } catch (error) {
    console.error('Workspace tree error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
