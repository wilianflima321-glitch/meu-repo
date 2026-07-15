import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { getQueueRedis } from '@/lib/redis-queue';
import { enforceRouteRateLimit, RENDER_JOB_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'EXPORT_QUEUE_METRICS',
      route: '/api/exports/metrics',
      config: RENDER_JOB_READ_RATE_LIMIT,
      identifier: user.userId,
    });
    if (rateLimited) return rateLimited;

    const redis = await getQueueRedis();
    const metrics = await redis.hgetall('build-queue:metrics');
    const backlog = await redis.llen('build-queue');

    return NextResponse.json({
      success: true,
      metrics: {
        success: Number(metrics.success || 0),
        failed: Number(metrics.failed || 0),
        completed: Number(metrics.completed || 0),
        totalDurationMs: Number(metrics.totalDurationMs || 0),
        backlog: Number(metrics.backlog || backlog),
        updatedAt: metrics.updatedAt || null,
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to read metrics' }, { status: 500 });
  }
}
