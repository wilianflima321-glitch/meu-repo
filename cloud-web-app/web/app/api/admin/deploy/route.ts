import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// DEPLOY ADMIN API
// =============================================================================

export const GET = withAdminAuth(
  async () => {
    try {
      const deploymentPipeline = (prisma as any).deploymentPipeline;
      const items = await deploymentPipeline.findMany({ orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin Deploy] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
    }
  },
  'ops:infra:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { name, provider } = body as { name?: string; provider?: string };
      if (!name) {
        return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
      }

      const deploymentPipeline = (prisma as any).deploymentPipeline;
      const pipeline = await deploymentPipeline.create({
        data: {
          name,
          provider: provider || 'internal',
          status: 'idle',
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'DEPLOY_PIPELINE_CREATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'deploy',
          metadata: { id: pipeline.id, name: pipeline.name },
        },
      });

      return NextResponse.json({ item: pipeline });
    } catch (error) {
      console.error('[Admin Deploy] Error:', error);
      return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
    }
  },
  'ops:infra:scale'
);

export const PATCH = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { id, action, status } = body as { id?: string; action?: 'run' | 'update'; status?: string };
      if (!id) {
        return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
      }

      const deploymentPipeline = (prisma as any).deploymentPipeline;
      const pipeline = await deploymentPipeline.update({
        where: { id },
        data: {
          status: action === 'run' ? 'running' : status ?? undefined,
          lastRunAt: action === 'run' ? new Date() : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: action === 'run' ? 'DEPLOY_RUN' : 'DEPLOY_UPDATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'deploy',
          metadata: { id: pipeline.id, status: pipeline.status },
        },
      });

      return NextResponse.json({ item: pipeline });
    } catch (error) {
      console.error('[Admin Deploy] Error:', error);
      return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
    }
  },
  'ops:infra:scale'
);
