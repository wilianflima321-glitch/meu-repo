/**
 * AETHEL ENGINE - Job Cancel API
 *
 * POST /api/jobs/{id}/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { queueManager } from '@/lib/queue-system';
import { enforceRateLimit } from '@/lib/server/rate-limit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

function isAuthNotConfigured(error: unknown): boolean {
  return error instanceof Error && String((error as any).code || '') === 'AUTH_NOT_CONFIGURED';
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-id-cancel-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many job cancel requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { id } = await params;

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

    const result = await queueManager.cancelJob(id);
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
      job: {
        id,
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
      { error: 'Erro interno ao cancelar job' },
      { status: 500 }
    );
  }
}
