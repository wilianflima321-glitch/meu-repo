import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// AI TRAINING ADMIN API
// =============================================================================

export const GET = withAdminAuth(
  async () => {
    try {
      const aiTrainingJob = (prisma as any).aiTrainingJob;
      const items = await aiTrainingJob.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin AI Training] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch training jobs' }, { status: 500 });
    }
  },
  'ops:agents:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { model, auxAI, optimization, filters } = body as {
        model?: string;
        auxAI?: string;
        optimization?: string;
        filters?: string;
      };

      if (!model) {
        return NextResponse.json({ error: 'Modelo obrigatório' }, { status: 400 });
      }

      const aiTrainingJob = (prisma as any).aiTrainingJob;
      const job = await aiTrainingJob.create({
        data: {
          model,
          auxAI: auxAI || null,
          optimization: optimization || null,
          filters: filters || null,
          status: 'queued',
          cost: 0,
          efficiency: 0,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'AI_TRAINING_START',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ai-training',
          metadata: { id: job.id, model: job.model },
        },
      });

      return NextResponse.json({ item: job });
    } catch (error) {
      console.error('[Admin AI Training] Error:', error);
      return NextResponse.json({ error: 'Failed to create training job' }, { status: 500 });
    }
  },
  'ops:agents:config'
);

export const PATCH = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { id, status, cost, efficiency } = body as {
        id?: string;
        status?: string;
        cost?: number;
        efficiency?: number;
      };

      if (!id) {
        return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
      }

      const aiTrainingJob = (prisma as any).aiTrainingJob;
      const job = await aiTrainingJob.update({
        where: { id },
        data: {
          status: status ?? undefined,
          cost: typeof cost === 'number' ? cost : undefined,
          efficiency: typeof efficiency === 'number' ? efficiency : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'AI_TRAINING_UPDATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'ai-training',
          metadata: { id: job.id, status: job.status },
        },
      });

      return NextResponse.json({ item: job });
    } catch (error) {
      console.error('[Admin AI Training] Error:', error);
      return NextResponse.json({ error: 'Failed to update training job' }, { status: 500 });
    }
  },
  'ops:agents:config'
);
