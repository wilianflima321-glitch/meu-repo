/**
 * Liveness Check API - Aethel Engine
 * GET /api/health/live - Kubernetes-style liveness probe
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200, headers: { 'Cache-Control': 'no-cache, no-store' } }
  );
}
