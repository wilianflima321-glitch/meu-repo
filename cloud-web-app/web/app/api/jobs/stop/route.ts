/**
 * Aethel Engine - Job Queue Stop API
 *
 * POST /api/jobs/stop => pause all queues
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { queueManager } from '@/lib/queue-system';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required.' }, { status: 401 });
  }
  if (error instanceof Error && String((error as { code?: string }).code || '') === 'AUTH_NOT_CONFIGURED') {
    return NextResponse.json(
      { error: 'AUTH_NOT_CONFIGURED', message: 'Set JWT_SECRET to enable protected APIs.' },
      { status: 503 }
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-stop-post',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many job queue stop requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const result = await queueManager.setAllQueuesPaused(true);
    if (!result.available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured.',
          capability: 'JOB_QUEUE_CONTROL',
          capabilityStatus: 'PARTIAL',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'stopped',
      message: 'Queues paused.',
      queues: result.queues,
      stoppedAt: new Date().toISOString(),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('Job queue stop error:', error);
    return apiInternalError();
  }
}
