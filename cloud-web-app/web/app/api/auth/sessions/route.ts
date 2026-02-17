import { NextRequest, NextResponse } from 'next/server';
import { trackCompatibilityRouteHit } from '@/lib/server/compatibility-route-telemetry';

export const dynamic = 'force-dynamic';

function deprecatedResponse(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'DEPRECATED_ROUTE',
      message: 'JWT-only auth is active. Session endpoints are decommissioned.',
      authModel: 'jwt',
      deprecatedSince: '2026-02-11',
      removalCycleTarget: '2026-cycle-2',
      deprecationPolicy: 'phaseout_after_2_cycles',
    },
    {
      status: 410,
      headers: trackCompatibilityRouteHit({
        request,
        route: '/api/auth/sessions',
        replacement: 'JWT auth endpoints',
        status: 'deprecated',
        deprecatedSince: '2026-02-11',
        removalCycleTarget: '2026-cycle-2',
        deprecationPolicy: 'phaseout_after_2_cycles',
      }),
    }
  );
}

export async function GET(request: NextRequest) {
  return deprecatedResponse(request);
}

export async function POST(request: NextRequest) {
  return deprecatedResponse(request);
}

export async function DELETE(request: NextRequest) {
  return deprecatedResponse(request);
}
