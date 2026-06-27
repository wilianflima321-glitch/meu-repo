import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { buildPlaytestJobPlan } from '@/lib/runtime/playtest-job-policy';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('api/runtime/playtest');

const bodySchema = z.object({
  projectId: z.string().min(1),
  missionId: z.string().optional(),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', issues: parsed.error.issues }, { status: 400 });
    }

    const { projectId, missionId, title } = parsed.data;
    const project = await prisma.project.findFirst({
      where: { id: projectId, OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }] },
    });
    if (!project) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
    }

    const plan = buildPlaytestJobPlan({
      projectId,
      missionId: missionId ?? `playtest-${Date.now()}`,
      title: title ?? `Playtest ${project.name}`,
    });

    const job = await prisma.renderJob.create({
      data: {
        projectId,
        requestedBy: user.userId,
        status: plan.target === 'held' ? 'queued' : 'queued',
        provider: plan.target,
        receiptRef: plan.lane,
        progress: 0,
      },
    });

    log.info('playtest.job_planned', {
      userId: user.userId,
      projectId,
      jobId: job.id,
      target: plan.target,
    });

    return NextResponse.json({
      jobId: job.id,
      plan,
      pollUrl: `/api/render/jobs/${job.id}`,
      evidenceEndpoint: `/api/projects/${projectId}/production-state/game-spine/playtest`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.error('playtest.job_failed', error);
    return NextResponse.json({ error: 'PLAYTEST_PLAN_FAILED' }, { status: 500 });
  }
}
