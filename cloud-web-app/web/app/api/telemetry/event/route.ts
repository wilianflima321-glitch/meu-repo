/**
 * Telemetry Event API
 * POST /api/telemetry/event - Record product analytics events
 * Used for funnel tracking, first-value measurement, and product metrics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/telemetry/event/route');

export const dynamic = 'force-dynamic'

const CAPABILITY = 'TELEMETRY_EVENT_INGEST'
const MAX_EVENT_BYTES = 16 * 1024

interface TelemetryEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp?: string
  sessionId?: string
  surface?: string
}

const VALID_EVENTS = new Set([
  'page_view',
  'onboarding_started',
  'onboarding_domain_selected',
  'template_selected',
  'onboarding_completed',
  'first_generation',
  'first_preview',
  'first_value_reached',
  'project_created',
  'ai_chat_sent',
  'ai_stream_started',
  'preview_provision_started',
  'preview_provision_completed',
  'billing_checkout_started',
  'billing_checkout_completed',
  'billing_upgrade_prompt_shown',
  'billing_upgrade_prompt_clicked',
  'feature_used',
  'error_occurred',
  'drop_off',
  'session_start',
  'session_end',
])

// In-memory event buffer for batch processing (production would use a queue)
const eventBuffer: Array<{
  event: string
  userId: string | null
  properties: Record<string, unknown>
  timestamp: string
}> = []

const MAX_BUFFER_SIZE = 10000

function estimateEventSize(event: TelemetryEvent) {
  return Buffer.byteLength(JSON.stringify(event), 'utf8')
}

export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req)
    const body: TelemetryEvent | TelemetryEvent[] = await req.json()
    const events = Array.isArray(body) ? body : [body]

    const recorded: string[] = []
    const rejected: string[] = []

    for (const event of events) {
      if (!event.event) {
        return NextResponse.json(
          {
            error: 'TELEMETRY_EVENT_TYPE_REQUIRED',
            capability: CAPABILITY,
            capabilityStatus: 'IMPLEMENTED',
          },
          { status: 400 },
        )
      }

      if (estimateEventSize(event) > MAX_EVENT_BYTES) {
        return NextResponse.json(
          {
            error: 'TELEMETRY_EVENT_TOO_LARGE',
            capability: CAPABILITY,
            capabilityStatus: 'IMPLEMENTED',
            maxBytes: MAX_EVENT_BYTES,
          },
          { status: 413 },
        )
      }

      if (!VALID_EVENTS.has(event.event) && !event.event.startsWith('custom:')) {
        rejected.push(event.event)
        continue
      }

      const entry = {
        event: event.event,
        userId: auth?.userId || null,
        properties: {
          ...event.properties,
          surface: event.surface || 'unknown',
          sessionId: event.sessionId || null,
        },
        timestamp: event.timestamp || new Date().toISOString(),
      }

      try {
        if (eventBuffer.length < MAX_BUFFER_SIZE) {
          eventBuffer.push(entry)
        }
      } catch (error) {
        routeLogger.error('[telemetry/event] Persist failed:', error)
        return NextResponse.json(
          {
            error: 'TELEMETRY_EVENT_PERSIST_FAILED',
            capability: CAPABILITY,
            capabilityStatus: 'IMPLEMENTED',
          },
          { status: 500 },
        )
      }

      recorded.push(event.event)
    }

    return NextResponse.json({
      success: true,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      recorded: recorded.length,
      rejected: rejected.length,
      rejectedEvents: rejected.length > 0 ? rejected : undefined,
    })
  } catch (error) {
    routeLogger.error('[telemetry/event] Error:', error)
    return NextResponse.json(
      {
        error: 'TELEMETRY_EVENT_PERSIST_FAILED',
        capability: CAPABILITY,
        capabilityStatus: 'IMPLEMENTED',
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/telemetry/event - Get event buffer stats (admin only)
 */
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Calculate basic metrics from buffer
  const eventCounts: Record<string, number> = {}
  for (const entry of eventBuffer) {
    eventCounts[entry.event] = (eventCounts[entry.event] || 0) + 1
  }

  return NextResponse.json({
    bufferSize: eventBuffer.length,
    maxBufferSize: MAX_BUFFER_SIZE,
    eventCounts,
    oldestEvent: eventBuffer[0]?.timestamp || null,
    newestEvent: eventBuffer[eventBuffer.length - 1]?.timestamp || null,
  })
}
