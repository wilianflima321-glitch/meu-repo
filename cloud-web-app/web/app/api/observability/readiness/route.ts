import { NextRequest, NextResponse } from 'next/server'

import {
  createTraceContext,
  getTraceSampleRate,
  initObservability,
  toTraceparent,
  traceHeaders,
  withTraceSpan,
} from '@/lib/observability/tracing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const parent = request.headers.get('traceparent')

  return withTraceSpan(
    'api.observability.readiness',
    async (span) => {
      initObservability({ runtime: 'nodejs' })
      const context = createTraceContext(span.context)
      return NextResponse.json(
        {
          ready: true,
          service: process.env.OTEL_SERVICE_NAME || 'aethel-engine',
          runtime: 'nodejs',
          tracePropagation: 'w3c-traceparent',
          traceSampleRate: getTraceSampleRate(),
          traceparent: toTraceparent(context),
          drainsConfigured: Boolean(process.env.VERCEL_LOG_DRAIN_CONFIGURED || process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
          sentryConfigured: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
        },
        { headers: traceHeaders(context) },
      )
    },
    { parent, attributes: { route: '/api/observability/readiness' } },
  )
}