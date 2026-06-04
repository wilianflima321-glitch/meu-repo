import { NextResponse } from 'next/server'
import { getPreviewRuntimeReadiness } from '@/lib/server/preview-runtime-readiness'

import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/preview/runtime-readiness/route');
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const readiness = await getPreviewRuntimeReadiness()
    return NextResponse.json(
      {
        ...readiness,
        capability: 'IDE_PREVIEW_RUNTIME',
        capabilityStatus: 'PARTIAL',
      },
      {
        headers: {
          'x-aethel-capability': 'IDE_PREVIEW_RUNTIME',
          'x-aethel-capability-status': 'PARTIAL',
        },
      }
    )
  } catch (error) {
    routeLogger.error('[preview/runtime-readiness] failed:', error)
    return NextResponse.json(
      {
        status: 'held',
        strategy: 'inline',
        managedConfigured: false,
        managedProvider: null,
        managedProviderLabel: null,
        managedProviderMode: 'unknown',
        preferredRuntimeUrl: null,
        routeProvisionSupported: false,
        readyForManagedProvision: false,
        blockers: ['PREVIEW_RUNTIME_READINESS_UNAVAILABLE'],
        instructions: ['Runtime readiness could not be loaded.'],
        recommendedCommands: ['npm --prefix cloud-web-app/web run dev'],
        capability: 'IDE_PREVIEW_RUNTIME',
        capabilityStatus: 'held',
        error: 'PREVIEW_RUNTIME_READINESS_UNAVAILABLE',
      },
      {
        status: 200,
        headers: {
          'x-aethel-capability': 'IDE_PREVIEW_RUNTIME',
          'x-aethel-capability-status': 'held',
        },
      }
    )
  }
}
