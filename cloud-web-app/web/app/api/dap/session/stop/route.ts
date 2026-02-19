import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { stopDapSession } from '@/lib/server/dap-runtime';
import { enforceRateLimit } from '@/lib/server/rate-limit';

interface StopSessionRequest {
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireFeatureForUser(user.userId, 'dap');
    const rateLimitResponse = await enforceRateLimit({
      scope: 'dap-session-stop-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many debug session stop requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body: StopSessionRequest = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log(`Debug session stop requested: ${sessionId}`);

    const stopped = stopDapSession(sessionId);

    return NextResponse.json({
      success: true,
      stopped,
      message: stopped ? 'Debug session stopped' : 'Session not found',
    });
  } catch (error) {
    console.error('Failed to stop debug session:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Failed to stop session' },
      { status: 500 }
    );
  }
}
