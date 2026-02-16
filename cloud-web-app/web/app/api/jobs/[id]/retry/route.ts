/**
 * AETHEL ENGINE - Job Retry API
 *
 * POST /api/jobs/{id}/retry
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { queueManager } from '@/lib/queue-system';

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

function isAuthNotConfigured(error: unknown): boolean {
  return error instanceof Error && String((error as any).code || '') === 'AUTH_NOT_CONFIGURED';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request);

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

    const result = await queueManager.retryJob(params.id);
    if (!result.found) {
      return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 });
    }
    if (!result.retried) {
      return NextResponse.json(
        {
          error: result.reason || 'Retry indisponivel',
          state: result.state,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job reenfileirado com sucesso',
      job: {
        id: params.id,
        status: 'queued',
        retriedAt: new Date().toISOString(),
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
    console.error('Erro ao retry job:', error);
    return NextResponse.json(
      { error: 'Falha ao retry job' },
      { status: 500 }
    );
  }
}
