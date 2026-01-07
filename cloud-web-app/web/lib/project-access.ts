import { prisma } from './db';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export type ProjectAccess = {
	projectId: string;
	ownerId: string;
	role: ProjectRole;
};

export function canReadProject(role: ProjectRole): boolean {
	return role === 'owner' || role === 'editor' || role === 'viewer';
}

export function canWriteProject(role: ProjectRole): boolean {
	return role === 'owner' || role === 'editor';
}

export function canManageProject(role: ProjectRole): boolean {
	return role === 'owner';
}

export async function getProjectAccess(userId: string, projectId: string): Promise<ProjectAccess | null> {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		select: { id: true, userId: true },
	});
	if (!project) return null;

	if (project.userId === userId) {
		return { projectId: project.id, ownerId: project.userId, role: 'owner' };
	}

	const member = await prisma.projectMember.findUnique({
		where: { projectId_userId: { projectId, userId } },
		select: { role: true },
	});
	if (!member) return null;

	const role = member.role === 'editor' ? 'editor' : 'viewer';
	return { projectId: project.id, ownerId: project.userId, role };
}

export async function requireProjectAccess(userId: string, projectId: string): Promise<ProjectAccess> {
	const access = await getProjectAccess(userId, projectId);
	if (!access) {
		throw Object.assign(new Error('PROJECT_NOT_FOUND'), { code: 'PROJECT_NOT_FOUND' });
	}
	return access;
}

export async function requireProjectWriteAccess(userId: string, projectId: string): Promise<ProjectAccess> {
	const access = await requireProjectAccess(userId, projectId);
	if (!canWriteProject(access.role)) {
		throw Object.assign(new Error('PROJECT_ACCESS_DENIED'), { code: 'PROJECT_ACCESS_DENIED' });
	}
	return access;
}

export async function requireProjectManageAccess(userId: string, projectId: string): Promise<ProjectAccess> {
	const access = await requireProjectAccess(userId, projectId);
	if (!canManageProject(access.role)) {
		throw Object.assign(new Error('PROJECT_ACCESS_DENIED'), { code: 'PROJECT_ACCESS_DENIED' });
	}
	return access;
}
