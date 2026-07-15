import { NextRequest, NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  DEFAULT_RUNTIME_CANDIDATES,
  MAX_RUNTIME_DISCOVERY_CANDIDATES,
  discoverPreviewRuntime,
  parseRuntimeDiscoveryCandidates,
} from '@/lib/server/preview-runtime'
import { getPreviewRuntimeReadiness } from '@/lib/server/preview-runtime-readiness'
import {
  PREVIEW_DISCOVERY_RATE_LIMIT,
  enforcePreviewRuntimeRateLimit,
} from '@/lib/server/preview-runtime-rate-limit'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_DISCOVERY'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rateLimited = enforcePreviewRuntimeRateLimit({
    req: request,
    capability: CAPABILITY,
    route: '/api/preview/runtime-discover',
    config: PREVIEW_DISCOVERY_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited

  const requestedCandidates = parseRuntimeDiscoveryCandidates(request.nextUrl.searchParams)
  const usingDefaultCandidates = requestedCandidates.length === 0
  const candidates = usingDefaultCandidates ? DEFAULT_RUNTIME_CANDIDATES : requestedCandidates

  if (candidates.length > MAX_RUNTIME_DISCOVERY_CANDIDATES) {
    return capabilityResponse({
      error: 'RUNTIME_DISCOVERY_TOO_MANY_CANDIDATES',
      message: `Runtime discovery accepts at most ${MAX_RUNTIME_DISCOVERY_CANDIDATES} candidates per request.`,
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        maxCandidates: MAX_RUNTIME_DISCOVERY_CANDIDATES,
        providedCandidates: candidates.length,
      },
    })
  }

  const payload = await discoverPreviewRuntime(candidates, 1800)
  const readiness = await getPreviewRuntimeReadiness()

  return NextResponse.json(
    {
      scannedAt: payload.scannedAt,
      preferredRuntimeUrl: payload.preferredRuntimeUrl,
      candidates: payload.candidates,
      summary: payload.summary,
      guidance: {
        strategy: readiness.strategy,
        managedProvider: readiness.managedProvider,
        managedProviderLabel: readiness.managedProviderLabel,
        managedProviderMode: readiness.managedProviderMode,
        instructions: readiness.instructions,
        recommendedCommands: readiness.recommendedCommands,
      },
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        source: usingDefaultCandidates ? 'default' : 'request',
      },
    },
    {
      status: 200,
      headers: {
        'x-aethel-capability': CAPABILITY,
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}
