import { NextResponse } from 'next/server'
import { getPreviewRuntimeReadiness } from '@/lib/server/preview-runtime-readiness'

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
    console.error('[preview/runtime-readiness] failed:', error)
    return NextResponse.json(
      {
        status: 'partial',
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
        error: 'PREVIEW_RUNTIME_READINESS_UNAVAILABLE',
      },
      { status: 500 }
    )
  }
}
