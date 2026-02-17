/**
 * AETHEL ENGINE - Jobs Statistics API
 *
 * Queue-backed metrics without mock data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { queueManager } from '@/lib/queue-system';

export const dynamic = 'force-dynamic';

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

function isAuthNotConfigured(error: unknown): boolean {
  return error instanceof Error && String((error as any).code || '') === 'AUTH_NOT_CONFIGURED';
}

function mapStateToType(name: string): string {
  if (name.startsWith('export:')) return 'export';
  if (name.startsWith('asset:')) return 'asset';
  if (name.startsWith('ai:')) return 'ai';
  if (name.startsWith('email:')) return 'email';
  if (name.startsWith('webhook:')) return 'webhook';
  return 'other';
}

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    const available = await queueManager.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: 'QUEUE_BACKEND_UNAVAILABLE',
          message: 'Queue backend is not configured.',
        },
        { status: 503 }
      );
    }

    const [statsByQueue, jobs] = await Promise.all([
      queueManager.getAllStats(),
      queueManager.listJobs(500),
    ]);

    const totals = Object.values(statsByQueue).reduce(
      (acc, item) => {
        acc.waiting += item.waiting;
        acc.active += item.active;
        acc.completed += item.completed;
        acc.failed += item.failed;
        acc.delayed += item.delayed;
        return acc;
      },
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    );

    const byType = jobs.reduce((acc, job) => {
      const type = mapStateToType(job.name);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const durationStats = jobs
      .filter((job) => typeof job.processedOn === 'number' && typeof job.finishedOn === 'number' && job.finishedOn! >= job.processedOn!)
      .map((job) => ({
        type: mapStateToType(job.name),
        durationMs: (job.finishedOn as number) - (job.processedOn as number),
      }));

    const averageDuration: Record<string, number> = {};
    const bucket: Record<string, { total: number; count: number }> = {};
    for (const entry of durationStats) {
      bucket[entry.type] = bucket[entry.type] || { total: 0, count: 0 };
      bucket[entry.type].total += entry.durationMs;
      bucket[entry.type].count += 1;
    }
    Object.entries(bucket).forEach(([type, value]) => {
      averageDuration[type] = Math.round(value.total / Math.max(1, value.count));
    });

    const successRate = totals.completed + totals.failed > 0
      ? Number(((totals.completed / (totals.completed + totals.failed)) * 100).toFixed(2))
      : 0;

    return NextResponse.json({
      total: jobs.length,
      byStatus: {
        queued: totals.waiting + totals.delayed,
        processing: totals.active,
        completed: totals.completed,
        failed: totals.failed,
      },
      byType,
      averageDuration,
      successRate,
      queues: statsByQueue,
      timestamp: new Date().toISOString(),
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
    console.error('Failed to fetch queue statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue statistics' },
      { status: 500 }
    );
  }
}
