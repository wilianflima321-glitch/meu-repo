import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getAITraceForUser } from '@/lib/ai-trace-store';
import { AI_TRACE_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ traceId: string }> }
): Promise<NextResponse> {
  try {
    const auth = requireAuth(req);
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'ai.trace.read',
      route: '/api/ai/trace/[traceId]',
      config: AI_TRACE_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

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
