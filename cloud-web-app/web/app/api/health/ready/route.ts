/**
 * Readiness Check API - Aethel Engine
 * GET /api/health/ready - Kubernetes-style readiness probe
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('[Health] Database check failed:', error);
  }

  const allHealthy = checks.database;

  return NextResponse.json(
    {
      status: allHealthy ? 'ready' : 'not_ready',
      checks,
    },
    { 
      status: allHealthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-cache, no-store' }
    }
  );
}
