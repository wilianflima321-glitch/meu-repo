import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { trackCompatibilityRouteHit } from '@/lib/server/compatibility-route-telemetry';

export const dynamic = 'force-dynamic';

async function deprecatedResponse(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    return NextResponse.json(
      {
        error: 'DEPRECATED_ROUTE',
        message: 'Use /api/files/tree as the canonical file tree endpoint.',
        replacement: '/api/files/tree',
        deprecatedSince: '2026-02-11',
        removalCycleTarget: '2026-cycle-2',
        deprecationPolicy: 'phaseout_after_2_cycles',
      },
      {
        status: 410,
        headers: trackCompatibilityRouteHit({
          request,
          route: '/api/workspace/tree',
          replacement: '/api/files/tree',
          status: 'deprecated',
          deprecatedSince: '2026-02-11',
          removalCycleTarget: '2026-cycle-2',
          deprecationPolicy: 'phaseout_after_2_cycles',
        }),
      }
    );
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function GET(request: NextRequest) {
  return deprecatedResponse(request);
}

export async function POST(request: NextRequest) {
  return deprecatedResponse(request);
}
