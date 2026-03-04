import { NextRequest, NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import { isAllowedRuntimeUrl, probeRuntimeUrl } from '@/lib/server/preview-runtime'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url')?.trim()
  if (!target) {
    return capabilityResponse({
      error: 'RUNTIME_URL_REQUIRED',
      message: 'Missing runtime URL for health check.',
      status: 400,
      capability: 'IDE_PREVIEW_RUNTIME_HEALTH',
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'missing_url' },
    })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return capabilityResponse({
      error: 'RUNTIME_URL_INVALID',
      message: 'Runtime URL is invalid.',
      status: 400,
      capability: 'IDE_PREVIEW_RUNTIME_HEALTH',
      capabilityStatus: 'PARTIAL',
      metadata: { reason: 'invalid_url' },
    })
  }

  if (!isAllowedRuntimeUrl(parsed)) {
    return capabilityResponse({
      error: 'RUNTIME_URL_NOT_ALLOWED',
      message: 'Runtime URL host is not allowed for server-side probe.',
      status: 403,
      capability: 'IDE_PREVIEW_RUNTIME_HEALTH',
      capabilityStatus: 'PARTIAL',
      metadata: {
        reason: 'blocked_host',
        hostname: parsed.hostname,
        port: parsed.port || 'default',
      },
    })
  }

  const result = await probeRuntimeUrl(parsed.toString(), 2500)
  return NextResponse.json(result, {
    status: 200,
    headers: {
      'x-aethel-capability': 'IDE_PREVIEW_RUNTIME_HEALTH',
      'x-aethel-capability-status': 'PARTIAL',
    },
  })
}
