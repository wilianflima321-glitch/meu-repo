/**
 * AETHEL ENGINE - Job Cancel API
 *
 * POST /api/jobs/{id}/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { queueManager } from '@/lib/queue-system';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { capabilityResponse } from '@/lib/server/capability-response';

const MAX_JOB_ID_LENGTH = 120;
const normalizeJobId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string }> };

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

function isAuthNotConfigured(error: unknown): boolean {
  return error instanceof Error && String((error as any).code || '') === 'AUTH_NOT_CONFIGURED';
}

async function resolveJobId(ctx: RouteContext) {
  const resolved = await ctx.params;
  return normalizeJobId(resolved?.id);
}

function queueUnavailableResponse() {
  return capabilityResponse({
    status: 503,
    error: 'QUEUE_BACKEND_UNAVAILABLE',
    message: 'Queue backend is not configured.',
    capability: 'JOB_QUEUE_RUNTIME',
    capabilityStatus: 'PARTIAL',
    milestone: 'P1',
  });
}

export async function POST(request: NextRequest, ctx: RouteContext) {
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

    const jobId = await resolveJobId(ctx);
    if (!jobId || jobId.length > MAX_JOB_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_JOB_ID', message: 'jobId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const available = await queueManager.isAvailable();
    if (!available) {
      return queueUnavailableResponse();
    }

    const result = await queueManager.cancelJob(jobId);
    if (!result.found) {
      return NextResponse.json({ error: 'JOB_NOT_FOUND', message: 'Job not found.' }, { status: 404 });
    }
    if (!result.cancelled) {
      if (result.reason === 'JOB_ACTIVE_CANNOT_CANCEL') {
        return NextResponse.json(
          { error: 'JOB_ACTIVE_CANNOT_CANCEL', message: 'Active jobs cannot be cancelled immediately.', state: result.state },
          { status: 409 }
        );
      }
      if (result.reason === 'JOB_ALREADY_FINALIZED') {
        return NextResponse.json(
          { error: 'JOB_ALREADY_FINALIZED', message: 'Job is already finalized.', state: result.state },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: result.reason || 'JOB_CANCEL_NOT_AVAILABLE', message: 'Job cancellation is not available.', state: result.state },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
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
    console.error('Failed to cancel job:', error);
    return NextResponse.json({ error: 'JOB_CANCEL_FAILED', message: 'Failed to cancel job.' }, { status: 500 });
  }
}
