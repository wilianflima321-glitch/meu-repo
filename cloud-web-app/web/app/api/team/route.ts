import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('api/team');

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const ownedProjects = await prisma.project.findMany({
      where: { userId: user.userId },
      select: { id: true, name: true },
    });
    const ownedProjectIds = ownedProjects.map((p) => p.id);

    const memberships = await prisma.projectMember.findMany({
      where: {
        OR: [{ userId: user.userId }, { projectId: { in: ownedProjectIds } }],
      },
      include: {
        user: { select: { id: true, email: true, name: true, avatar: true, role: true } },
        project: { select: { id: true, name: true, userId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const memberMap = new Map<
      string,
      {
        userId: string;
        email: string;
        name: string | null;
        avatar: string | null;
        platformRole: string;
        projects: Array<{ projectId: string; projectName: string; role: string; isOwner: boolean }>;
      }
    >();

    for (const membership of memberships) {
      const existing = memberMap.get(membership.userId) ?? {
        userId: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        avatar: membership.user.avatar,
        platformRole: membership.user.role,
        projects: [],
      };

      existing.projects.push({
        projectId: membership.project.id,
        projectName: membership.project.name,
        role: membership.role,
        isOwner: membership.project.userId === membership.userId,
      });
      memberMap.set(membership.userId, existing);
    }

    for (const project of ownedProjects) {
      const ownerEntry = memberMap.get(user.userId);
      if (ownerEntry && !ownerEntry.projects.some((p) => p.projectId === project.id)) {
        ownerEntry.projects.push({
          projectId: project.id,
          projectName: project.name,
          role: 'owner',
          isOwner: true,
        });
      }
    }

    const members = Array.from(memberMap.values());

    log.info('team.list', { userId: user.userId, memberCount: members.length });

    return NextResponse.json({
      members,
      projectCount: ownedProjects.length,
      totalCollaborators: members.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.error('team.list_failed', error);
    return NextResponse.json({ error: 'Failed to load team' }, { status: 500 });
  }
}
