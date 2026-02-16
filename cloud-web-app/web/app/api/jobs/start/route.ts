/**
 * AETHEL ENGINE - Job Queue Start API
 *
 * POST /api/jobs/start => resume all queues
 * GET  /api/jobs/start => queue backend availability + aggregate snapshot
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

    const result = await queueManager.setAllQueuesPaused(false);
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
      status: 'running',
      message: 'Filas retomadas com sucesso',
      queues: result.queues,
      startedAt: new Date().toISOString(),
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
    console.error('Erro ao iniciar fila:', error);
    return NextResponse.json(
      { error: 'Erro interno ao iniciar fila' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          isRunning: false,
          status: 'unavailable',
          error: 'QUEUE_BACKEND_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    const stats = await queueManager.getAllStats();
    const aggregate = Object.values(stats).reduce(
      (acc, queue) => {
        acc.waiting += queue.waiting;
        acc.active += queue.active;
        acc.completed += queue.completed;
        acc.failed += queue.failed;
        acc.delayed += queue.delayed;
        return acc;
      },
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    );

    return NextResponse.json({
      isRunning: true,
      status: 'running',
      aggregate,
      queues: stats,
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
    console.error('Erro ao buscar status da fila:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar status da fila' },
      { status: 500 }
    );
  }
}
