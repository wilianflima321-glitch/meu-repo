/**
 * AETHEL ENGINE - Jobs Queue API
 *
 * Real queue-backed endpoint.
 * - GET: list jobs from BullMQ queues
 * - POST: enqueue a job in mapped queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { QUEUE_NAMES, queueManager, type QueueJobSnapshot } from '@/lib/queue-system';
import { enforceRateLimit } from '@/lib/server/rate-limit';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
type JobType = 'build' | 'render' | 'export' | 'import' | 'compress' | 'upload';

interface ApiJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

function mapStatus(state: string): JobStatus {
  if (state === 'active') return 'processing';
  if (state === 'completed') return 'completed';
  if (state === 'failed') return 'failed';
  return 'queued';
}

function mapType(jobName: string): JobType {
  if (jobName.startsWith('asset:')) return 'import';
  if (jobName === 'export:project' || jobName === 'export:game') return 'export';
  if (jobName.startsWith('ai:')) return 'build';
  return 'build';
}

function toApiJob(snapshot: QueueJobSnapshot): ApiJob {
  const payload = (snapshot.data || {}) as Record<string, unknown>;
  const progressValue = typeof snapshot.progress === 'number'
    ? snapshot.progress
    : typeof (snapshot.progress as any)?.percentage === 'number'
      ? (snapshot.progress as any).percentage
      : 0;

  return {
    id: snapshot.id,
    type: mapType(snapshot.name),
    status: mapStatus(snapshot.state),
    progress: Math.max(0, Math.min(100, progressValue)),
    projectId: typeof payload.projectId === 'string' ? payload.projectId : undefined,
    projectName: typeof payload.projectName === 'string' ? payload.projectName : undefined,
    createdAt: new Date(snapshot.timestamp || Date.now()).toISOString(),
    startedAt: snapshot.processedOn ? new Date(snapshot.processedOn).toISOString() : undefined,
    completedAt: snapshot.finishedOn ? new Date(snapshot.finishedOn).toISOString() : undefined,
    error: snapshot.failedReason,
    metadata: typeof payload.metadata === 'object' && payload.metadata !== null
      ? (payload.metadata as Record<string, unknown>)
      : undefined,
  };
}

function mapJobTypeToQueue(type: JobType): { queueName: string; jobType: string; priority?: number } {
  switch (type) {
    case 'build':
    case 'render':
    case 'export':
      return { queueName: QUEUE_NAMES.EXPORT, jobType: 'export:project', priority: 5 };
    case 'import':
    case 'compress':
    case 'upload':
      return { queueName: QUEUE_NAMES.ASSET, jobType: 'asset:process', priority: 3 };
    default:
      return { queueName: QUEUE_NAMES.EXPORT, jobType: 'export:project', priority: 1 };
  }
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

function isAuthNotConfigured(error: unknown): boolean {
  return error instanceof Error && String((error as any).code || '') === 'AUTH_NOT_CONFIGURED';
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-get',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many jobs list requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 50;

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured. Install/configure Redis + BullMQ.',
        },
        { status: 503 }
      );
    }

    let jobs = (await queueManager.listJobs(limit)).map(toApiJob);
    if (status && status !== 'all') {
      jobs = jobs.filter((job) => job.status === status);
    }
    if (type && type !== 'all') {
      jobs = jobs.filter((job) => job.type === type);
    }

    const stats = {
      total: jobs.length,
      queued: jobs.filter((job) => job.status === 'queued').length,
      processing: jobs.filter((job) => job.status === 'processing').length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
    };

    return NextResponse.json({
      jobs,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAuthNotConfigured(error)) {
      return NextResponse.json(
        { error: 'AUTH_NOT_CONFIGURED', message: 'Set JWT_SECRET to enable protected APIs.' },
        { status: 503 }
      );
    }
    console.error('Erro ao listar jobs:', error);
    return NextResponse.json(
      { error: 'Falha ao listar jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many job creation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { type, projectId, projectName, metadata } = body;
    const validTypes: JobType[] = ['build', 'render', 'export', 'import', 'compress', 'upload'];

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo invalido. Use: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured. Cannot enqueue jobs.',
        },
        { status: 503 }
      );
    }

    const queueConfig = mapJobTypeToQueue(type);
    const queued = await queueManager.addJob(
      queueConfig.queueName,
      queueConfig.jobType as any,
      {
        projectId,
        projectName,
        metadata: metadata || {},
        requestedBy: user.userId,
        requestedAt: new Date().toISOString(),
      },
      {
        priority: queueConfig.priority,
      }
    );

    if (!queued) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not available to accept jobs.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Job enfileirado com sucesso',
        job: {
          id: String(queued.id),
          type,
          status: 'queued',
          progress: 0,
          projectId,
          projectName,
          createdAt: new Date().toISOString(),
          metadata: metadata || {},
        },
      },
      { status: 202 }
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAuthNotConfigured(error)) {
      return NextResponse.json(
        { error: 'AUTH_NOT_CONFIGURED', message: 'Set JWT_SECRET to enable protected APIs.' },
        { status: 503 }
      );
    }
    console.error('Erro ao criar job:', error);
    return NextResponse.json(
      { error: 'Falha ao criar job' },
      { status: 500 }
    );
  }
}
