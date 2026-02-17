/**
 * AETHEL ENGINE - Job Queue Stop API
 *
 * POST /api/jobs/stop => pause all queues
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

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);

    const result = await queueManager.setAllQueuesPaused(true);
    if (!result.available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'stopped',
      message: 'Filas pausadas com sucesso',
      queues: result.queues,
      stoppedAt: new Date().toISOString(),
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
    console.error('Erro ao pausar fila:', error);
    return NextResponse.json(
      { error: 'Erro interno ao pausar fila' },
      { status: 500 }
    );
  }
}
