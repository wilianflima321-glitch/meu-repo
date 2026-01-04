import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function resolveProjectIdFromRequest(
	userId: string,
	request: NextRequest,
	body?: any
): Promise<string | null> {
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

export async function assertProjectOwnership(userId: string, projectId: string): Promise<void> {
	const project = await prisma.project.findFirst({
		where: { id: projectId, userId },
		select: { id: true },
	});
	if (!project) {
		throw Object.assign(new Error('PROJECT_NOT_FOUND'), { code: 'PROJECT_NOT_FOUND' });
	}
}
