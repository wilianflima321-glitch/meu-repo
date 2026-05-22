import { NextRequest, NextResponse } from 'next/server';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/system-health/route');

export const dynamic = 'force-dynamic';

const buildHeldHealthPayload = (reason: string) => ({
  overall: 'degraded',
  dependencies: [
    {
      name: 'Aethel local runtime server',
      status: 'unknown',
      required: false,
      errorMessage: reason,
    },
  ],
  canRunBasicFeatures: true,
  canRunFullFeatures: false,
  missingRequired: [],
  missingOptional: ['Aethel local runtime server'],
  capabilityStatus: 'held',
  analysisMode: 'local_runtime_unavailable',
  reason,
});

const resolveServerBaseUrl = () => {
  const envUrl = process.env.AETHEL_SERVER_URL || process.env.NEXT_PUBLIC_AETHEL_SERVER_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return null;
};

export async function GET(_request: NextRequest) {
  try {
    const baseUrl = resolveServerBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        buildHeldHealthPayload('AETHEL_SERVER_URL is not configured; browser and cloud surfaces remain available.'),
      );
    }

    const res = await fetch(`${baseUrl}/api/health/system`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(buildHeldHealthPayload(`System health upstream returned ${res.status}.`));
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    routeLogger.warn('[system-health] upstream unavailable; returning held capability state', error);
    return NextResponse.json(
      buildHeldHealthPayload(error instanceof Error ? error.message : 'System health upstream unavailable.'),
    );
  }
}
