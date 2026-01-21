import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

export const GET = withAdminAuth(
  async () => {
    try {
      const fineTuneJob = (prisma as any).fineTuneJob;
      const items = await fineTuneJob.findMany({
        orderBy: { createdAt: 'desc' },
        include: { dataset: true },
      });
      return NextResponse.json({ items });
    } catch (error) {
      console.error('[Admin Fine Tuning Jobs] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }
  },
  'ops:agents:view'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { datasetId, epochs, learningRate } = body as {
        datasetId?: string;
        epochs?: number;
        learningRate?: number;
      };

      if (!datasetId) {
        return NextResponse.json({ error: 'Dataset obrigatório' }, { status: 400 });
      }

      const fineTuneJob = (prisma as any).fineTuneJob;
      const job = await fineTuneJob.create({
        data: {
          datasetId,
          epochs: typeof epochs === 'number' ? epochs : 1,
          learningRate: typeof learningRate === 'number' ? learningRate : 0.001,
          status: 'queued',
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FINE_TUNING_JOB_CREATE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'fine-tuning',
          metadata: { id: job.id, datasetId },
        },
      });

      return NextResponse.json({ item: job });
    } catch (error) {
      console.error('[Admin Fine Tuning Jobs] Error:', error);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }
  },
  'ops:agents:config'
);
