import { NextRequest, NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  DEFAULT_RUNTIME_CANDIDATES,
  MAX_RUNTIME_DISCOVERY_CANDIDATES,
  discoverPreviewRuntime,
  parseRuntimeDiscoveryCandidates,
} from '@/lib/server/preview-runtime'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_DISCOVERY'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

  return NextResponse.json(
    {
      scannedAt: payload.scannedAt,
      preferredRuntimeUrl: payload.preferredRuntimeUrl,
      candidates: payload.candidates,
      summary: payload.summary,
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
