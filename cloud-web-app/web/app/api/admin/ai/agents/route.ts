import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const handler = async (_req: NextRequest) => {
  const workflows = await prisma.copilotWorkflow.findMany({
    where: { archived: false },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      user: { select: { email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    success: true,
    workflows: workflows.map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      userEmail: workflow.user.email,
      projectId: workflow.projectId,
      projectName: workflow.project?.name ?? null,
      lastUsedAt: workflow.lastUsedAt?.toISOString() ?? null,
      updatedAt: workflow.updatedAt.toISOString(),
      createdAt: workflow.createdAt.toISOString(),
    })),
  });
};

export const GET = withAdminAuth(handler, 'ops:agents:view');
