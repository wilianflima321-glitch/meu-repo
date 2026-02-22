/**
 * Aethel Engine - Job Queue Start API
 *
 * POST /api/jobs/start => resume all queues
 * GET  /api/jobs/start => queue backend availability + aggregate snapshot
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

function queueUnavailableResponse() {
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

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-start-post',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many job queue start requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const result = await queueManager.setAllQueuesPaused(false);
    if (!result.available) return queueUnavailableResponse();

    return NextResponse.json({
      success: true,
      status: 'running',
      message: 'Queues resumed.',
      queues: result.queues,
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('Job queue start error:', error);
    return apiInternalError();
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'jobs-start-get',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many job queue status requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          isRunning: false,
          status: 'unavailable',
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          capability: 'JOB_QUEUE_CONTROL',
          capabilityStatus: 'PARTIAL',
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
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    console.error('Job queue status error:', error);
    return apiInternalError();
  }
}
