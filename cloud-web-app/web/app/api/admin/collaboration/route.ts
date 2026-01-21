import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// COLLABORATION ADMIN API
// =============================================================================

export const GET = withAdminAuth(
  async () => {
    try {
      const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { members: true },
      });

      const projectIds = projects.map((project) => project.id);
      const projectAdminState = (prisma as any).projectAdminState;
      const states = await projectAdminState.findMany({
        where: { projectId: { in: projectIds } },
      });
      const stateMap = new Map(states.map((state: any) => [state.projectId, state.status]));

      const items = projects.map((project) => ({
        id: project.id,
        name: project.name,
        members: project.members.length,
        status: stateMap.get(project.id) || 'active',
        updatedAt: project.updatedAt.toISOString(),
      }));

      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin Collaboration] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch collaboration data' }, { status: 500 });
    }
  },
  'ops:users:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { projectId, status, reason } = body as { projectId?: string; status?: string; reason?: string };
      if (!projectId || !status) {
        return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
      }

      const projectAdminState = (prisma as any).projectAdminState;
      const state = await projectAdminState.upsert({
        where: { projectId },
        create: {
          projectId,
          status,
          reason: reason || null,
          updatedBy: user.id,
        },
        update: {
          status,
          reason: reason || null,
          updatedBy: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'PROJECT_STATUS_UPDATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'collaboration',
          metadata: { projectId, status, reason },
        },
      });

      return NextResponse.json({ item: state });
    } catch (error) {
      console.error('[Admin Collaboration] Error:', error);
      return NextResponse.json({ error: 'Failed to update project state' }, { status: 500 });
    }
  },
  'ops:users:edit'
);
