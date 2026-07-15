/**
 * Health Check API
 * GET /api/health - Check service health
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/health/route');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        api: 'up',
      },
    });
  } catch (error) {
    routeLogger.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
          api: 'up',
        },
      },
      { status: 503 }
    );
  }
}
