import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { drainDapEvents } from '@/lib/server/dap-runtime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
		await requireFeatureForUser(user.userId, 'dap');

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
