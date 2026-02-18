import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { getQueueRedis } from '@/lib/redis-queue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
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
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to read metrics' }, { status: 500 });
  }
}
