/**
 * AETHEL ENGINE - Job Individual API
 *
 * - GET: job details from real queue backend
 * - DELETE: cancel pending/delayed job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { queueManager } from '@/lib/queue-system';
import { enforceRateLimit } from '@/lib/server/rate-limit';

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

function isAuthNotConfigured(error: unknown): boolean {
  return error instanceof Error && String((error as any).code || '') === 'AUTH_NOT_CONFIGURED';
}

function mapStateToStatus(state: string): 'queued' | 'processing' | 'completed' | 'failed' {
  if (state === 'active') return 'processing';
  if (state === 'completed') return 'completed';
  if (state === 'failed') return 'failed';
  return 'queued';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-id-get',
      key: user.userId,
      max: 480,
      windowMs: 60 * 60 * 1000,
      message: 'Too many job detail requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured.',
        },
        { status: 503 }
      );
    }

    const job = await queueManager.getJobById(params.id);
    if (!job) {
      return NextResponse.json(
        { error: 'Job nao encontrado' },
        { status: 404 }
      );
    }

    const payload = (job.data || {}) as Record<string, unknown>;
    return NextResponse.json({
      job: {
        id: job.id,
        queue: job.queueName,
        name: job.name,
        status: mapStateToStatus(job.state),
        state: job.state,
        progress: typeof job.progress === 'number' ? job.progress : 0,
        createdAt: new Date(job.timestamp || Date.now()).toISOString(),
        startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
        completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
        attemptsMade: job.attemptsMade,
        error: job.failedReason,
        projectId: typeof payload.projectId === 'string' ? payload.projectId : undefined,
        projectName: typeof payload.projectName === 'string' ? payload.projectName : undefined,
        metadata: typeof payload.metadata === 'object' && payload.metadata !== null
          ? payload.metadata
          : undefined,
      },
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
    console.error('Erro ao buscar job:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-id-delete',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many job delete requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured.',
        },
        { status: 503 }
      );
    }

    const result = await queueManager.cancelJob(params.id);
    if (!result.found) {
      return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 });
    }
    if (!result.cancelled) {
      if (result.reason === 'JOB_ACTIVE_CANNOT_CANCEL') {
        return NextResponse.json(
          { error: 'Job ativo nao pode ser cancelado imediatamente', state: result.state },
          { status: 409 }
        );
      }
      if (result.reason === 'JOB_ALREADY_FINALIZED') {
        return NextResponse.json(
          { error: 'Job ja finalizado', state: result.state },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: result.reason || 'Cancelamento indisponivel', state: result.state },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelado com sucesso',
      job: {
        id: params.id,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
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
    console.error('Erro ao cancelar job:', error);
    return NextResponse.json(
      { error: 'Falha ao cancelar job' },
      { status: 500 }
    );
  }
}
