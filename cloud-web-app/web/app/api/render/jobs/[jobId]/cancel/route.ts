import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { queueBackendUnavailableCapability } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

const MAX_JOB_ID_LENGTH = 120
const normalizeJobId = (value?: string) => String(value ?? '').trim()
type RouteContext = { params: Promise<{ jobId: string }> }

/**
 * POST /api/render/jobs/{jobId}/cancel
 *
 * Explicit capability gate: cancellation requires queue/runtime integration.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'render-job-cancel-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many render job cancel requests. Please wait before retrying.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const resolved = await params
    const jobId = normalizeJobId(resolved?.jobId)
    if (!jobId || jobId.length > MAX_JOB_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_JOB_ID', message: 'jobId is required and must be under 120 characters.' },
        { status: 400 }
      )
    }

    return queueBackendUnavailableCapability({
      message: 'Render job cancellation requires queue backend wiring and is currently unavailable.',
      capability: 'RENDER_JOB_CANCEL',
      milestone: 'P1',
      metadata: { jobId, reason: 'queue-runtime-not-wired' },
    })
  } catch (error) {
    console.error('[render/jobs/cancel] Error:', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
