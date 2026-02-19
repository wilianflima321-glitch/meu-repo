/**
 * Export Retry API
 *
 * POST /api/projects/[id]/export/[exportId]/retry
 * Re-enfileira um export que falhou.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-server';
import { checkProjectAccess } from '@/lib/project-access';
import { getQueueRedis } from '@/lib/redis-queue';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; exportId: string } }
) {
  try {
    const projectId = params.id;
    const exportId = params.exportId;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-export-retry-post',
      key: decoded.userId || getRequestIp(request),
      max: 40,
      windowMs: 60 * 60 * 1000,
      message: 'Too many export retry attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const access = await checkProjectAccess(decoded.userId, projectId, 'export');
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || 'Access denied' }, { status: 403 });
    }

    const job = await prisma.exportJob.findUnique({
      where: { id: exportId },
      select: {
        id: true,
        projectId: true,
        userId: true,
        platform: true,
        configuration: true,
        options: true,
        status: true,
      },
    });

    if (!job || job.projectId !== projectId || job.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    if (job.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed exports can be retried', status: job.status },
        { status: 400 }
      );
    }

    await prisma.exportJob.update({
      where: { id: exportId },
      data: {
        status: 'queued',
        progress: 0,
        currentStep: 'Queued (manual retry)',
        error: null,
        startedAt: null,
        completedAt: null,
        downloadUrl: null,
        downloadExpiresAt: null,
        fileSize: null,
      } as any,
    });

    const redis = await getQueueRedis();

    // Reseta estado no Redis (mantém logs se existirem, mas zera attempts).
    let existing: any = null;
    try {
      const raw = await redis.get(`export:${exportId}`);
      if (raw) existing = JSON.parse(raw);
    } catch {
      existing = null;
    }

    const payload = {
      ...(existing || {}),
      id: exportId,
      projectId,
      userId: decoded.userId,
      platform: job.platform,
      configuration: job.configuration,
      options: job.options || {},
      status: 'queued',
      progress: 0,
      currentStep: 'Queued (manual retry)',
      error: null,
      attempts: 0,
      retryAt: null,
      completedAt: null,
    };

    await redis.set(`export:${exportId}`, JSON.stringify(payload), 'EX', 86400);

    await redis.lpush(
      'build-queue',
      JSON.stringify({
        type: 'export',
        exportId,
        projectId,
        userId: decoded.userId,
        platform: job.platform,
        configuration: job.configuration,
        options: job.options,
      })
    );

    return NextResponse.json({
      success: true,
      export: {
        id: exportId,
        status: 'queued',
      },
      statusUrl: `/api/projects/${projectId}/export/${exportId}`,
    });
  } catch (error) {
    console.error('Export retry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
