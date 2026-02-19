import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getAITraceForUser } from '@/lib/ai-trace-store';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ traceId: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-trace-get',
      key: auth.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many trace lookup requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { traceId } = await ctx.params;

    if (!traceId) {
      return NextResponse.json({ error: 'TRACE_ID_REQUIRED' }, { status: 400 });
    }

    const trace = await getAITraceForUser({ userId: auth.userId, traceId });
    if (!trace) {
      return NextResponse.json({ error: 'TRACE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ trace });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
