import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { assertProjectOwnership, resolveProjectIdFromRequest } from '@/lib/copilot/project-resolver';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

type WorkspaceTreeNode = {
	name: string;
	path: string;
	type: 'file' | 'directory';
	children?: WorkspaceTreeNode[];
	expanded?: boolean;
};

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
			if (!isLeaf && node.type !== 'directory') {
				node.type = 'directory';
				node.children = node.children || new Map<string, any>();
			}

			cursor = node;
		}
	}

	const toArray = (map: Map<string, any>): WorkspaceTreeNode[] => {
		const rawNodes: any[] = [];
		map.forEach((value) => rawNodes.push(value));

		const nodes = rawNodes.map((n: any) => {
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

type ActionBody = {
	action?: string;
	params?: any;
	projectId?: string;
};

type AllowedAction = 'workspace.tree' | 'workspace.files' | 'files.read';

function assertAllowedAction(action: string): asserts action is AllowedAction {
	const allowed: AllowedAction[] = ['workspace.tree', 'workspace.files', 'files.read'];
	if (!allowed.includes(action as AllowedAction)) {
		throw Object.assign(new Error('ACTION_NOT_ALLOWED'), { code: 'ACTION_NOT_ALLOWED' });
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const user = requireAuth(req);
		await requireEntitlementsForUser(user.userId);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'copilot-action-post',
      key: user.userId,
      max: 300,
      windowMs: 60 * 60 * 1000,
      message: 'Too many copilot action requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

		const body = (await req.json().catch(() => null)) as ActionBody | null;
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
		}

		const action = typeof body.action === 'string' ? body.action : '';
		if (!action) {
			return NextResponse.json({ error: 'ACTION_REQUIRED' }, { status: 400 });
		}

		assertAllowedAction(action);

		const projectId = await resolveProjectIdFromRequest(user.userId, req, body);
		if (!projectId) {
			return NextResponse.json({ error: 'NO_PROJECT_AVAILABLE' }, { status: 404 });
		}
		await assertProjectOwnership(user.userId, projectId);

		if (action === 'workspace.tree') {
			const files = await prisma.file.findMany({
				where: { projectId },
				select: { path: true },
				orderBy: { path: 'asc' },
			});
			const tree = buildTree(files.map((f) => f.path));
			return NextResponse.json({ ok: true, projectId, result: { tree } });
		}

		if (action === 'workspace.files') {
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

			return NextResponse.json({ ok: true, projectId, result: { files: items } });
		}

		if (action === 'files.read') {
			const rawPath = body.params?.path;
			if (typeof rawPath !== 'string' || !rawPath.trim()) {
				return NextResponse.json({ error: 'path is required' }, { status: 400 });
			}

			const path = normalizePath(rawPath);
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
				ok: true,
				projectId,
				result: {
					path: normalizePath(file.path),
					content: file.content ?? '',
					language: file.language ?? null,
					modified: file.updatedAt?.toISOString?.() ?? null,
				},
			});
		}

		return NextResponse.json({ error: 'UNREACHABLE' }, { status: 500 });
	} catch (error) {
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;

		if ((error as any)?.code === 'ACTION_NOT_ALLOWED') {
			return NextResponse.json({ error: 'ACTION_NOT_ALLOWED' }, { status: 400 });
		}

		if ((error as any)?.code === 'PROJECT_NOT_FOUND') {
			return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
		}

		return apiInternalError('Failed to execute copilot action');
	}
}
