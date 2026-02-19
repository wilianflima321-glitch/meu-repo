import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { drainDapEvents } from '@/lib/server/dap-runtime';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireFeatureForUser(user.userId, 'dap');
    const rateLimitResponse = await enforceRateLimit({
      scope: 'dap-events-get',
      key: user.userId,
      max: 900,
      windowMs: 60 * 60 * 1000,
      message: 'Too many debug event polling requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const events = drainDapEvents(sessionId);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Failed to get debug events:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
