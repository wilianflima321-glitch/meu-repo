import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { notImplementedCapability } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

const MAX_JOB_ID_LENGTH = 120
const normalizeJobId = (value?: string) => String(value ?? '').trim()

/**
 * POST /api/render/jobs/{jobId}/cancel
 *
 * Explicit capability gate: cancellation requires queue/runtime integration.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
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

    const jobId = normalizeJobId(params?.jobId)
    if (!jobId || jobId.length > MAX_JOB_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_JOB_ID', message: 'jobId is required and must be under 120 characters.' },
        { status: 400 }
      )
    }

    return notImplementedCapability({
      error: 'NOT_IMPLEMENTED',
      message: 'Render job cancellation is not wired to queue/runtime yet.',
      capability: 'RENDER_JOB_CANCEL',
      milestone: 'P1',
      metadata: { jobId },
    })
  } catch (error) {
    console.error('[render/jobs/cancel] Error:', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
