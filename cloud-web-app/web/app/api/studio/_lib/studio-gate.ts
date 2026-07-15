import { NextRequest } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'

type StudioGateOptions = {
  request: NextRequest
  endpoint: string
  capability: string
  milestone: string
  notes?: string
}

export function studioNotImplemented(options: StudioGateOptions) {
  const traceId =
    options.request.headers.get('x-request-id') ||
    options.request.headers.get('x-trace-id') ||
    crypto.randomUUID()

  return capabilityResponse({
    error: 'STUDIO_RUNTIME_GATED',
    status: 503,
    capability: options.capability,
    capabilityStatus: 'PARTIAL',
    milestone: options.milestone,
    message: options.notes
      ? `${options.endpoint} is not available yet. ${options.notes}`
      : `${options.endpoint} is not available yet.`,
    metadata: {
      endpoint: options.endpoint,
      traceId,
      runtimeMode: 'cloud-web',
    },
  })
}
