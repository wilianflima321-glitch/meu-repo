/**
 * Export Status API
 *
 * GET /api/projects/[id]/export/[exportId]
 * Retorna status/detalhes de um export específico.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-server';
import { getQueueRedis } from '@/lib/redis-queue';
import { checkProjectAccess } from '@/lib/project-access';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

type ExportStatus =
  | 'queued'
  | 'preparing'
  | 'building'
  | 'packaging'
  | 'uploading'
  | 'completed'
  | 'failed';

type ExportJobRedis = {
  id: string;
  projectId: string;
  userId: string;
  platform: string;
  configuration: string;
  status: ExportStatus;
  progress?: number;
  currentStep?: string;
  logs?: string[];
  downloadUrl?: string;
  downloadExpiresAt?: string;
  fileSize?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; exportId: string } }
) {
  try {
    const projectId = params.id;
    const exportId = params.exportId;

    // Auth (mesmo padrão da rota de export existente)
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
      scope: 'projects-export-status-get',
      key: decoded.userId || getRequestIp(request),
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many export status requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    // Permissão no projeto
    const access = await checkProjectAccess(decoded.userId, projectId, 'export');
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || 'Access denied' }, { status: 403 });
    }

    // Busca job no banco
    const dbJob = await prisma.exportJob.findUnique({
      where: { id: exportId },
      select: {
        id: true,
        projectId: true,
        userId: true,
        platform: true,
        configuration: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!dbJob || dbJob.projectId !== projectId || dbJob.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    // Enriquecimento via Redis para jobs ativos (ou quando existir payload)
    let redisJob: ExportJobRedis | null = null;
    try {
      const redis = await getQueueRedis();
      const jobData = await redis.get(`export:${exportId}`);
      if (jobData) {
        redisJob = JSON.parse(jobData) as ExportJobRedis;
      }
    } catch {
      // Se Redis estiver indisponível/fallback, devolvemos apenas o DB
    }

    return NextResponse.json({
      export: {
        id: dbJob.id,
        projectId: dbJob.projectId,
        userId: dbJob.userId,
        platform: dbJob.platform,
        configuration: dbJob.configuration,
        status: (redisJob?.status || dbJob.status) as ExportStatus,
        progress: redisJob?.progress ?? null,
        currentStep: redisJob?.currentStep ?? null,
        logs: redisJob?.logs ?? null,
        downloadUrl: redisJob?.downloadUrl ?? null,
        downloadExpiresAt: redisJob?.downloadExpiresAt ?? null,
        fileSize: redisJob?.fileSize ?? null,
        error: redisJob?.error ?? null,
        createdAt: dbJob.createdAt,
        startedAt: dbJob.startedAt,
        completedAt: dbJob.completedAt,
      },
    });
  } catch (error) {
    console.error('Export status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
