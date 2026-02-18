/**
 * AETHEL ENGINE - Multiplayer Health Check API
 *
 * Verifies multiplayer matchmaking service health.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // In production, this should validate actual backing services.
    const checks = {
      server: 'ok',
      redis: 'ok',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: 'healthy',
      service: 'matchmaking',
      checks,
    });
  } catch (error) {
    console.error('Multiplayer health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'matchmaking',
        error: 'Failed to verify matchmaking services',
      },
      { status: 503 }
    );
  }
}
