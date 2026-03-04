import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { capabilityResponse } from '@/lib/server/capability-response'
import { queueManager } from '@/lib/queue-system'

export const dynamic = 'force-dynamic'
const CAPABILITY = 'RENDER_JOB_CANCEL'

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
    const { jobId } = params

    if (!jobId) {
      return capabilityResponse({
        error: 'JOB_ID_REQUIRED',
        message: 'jobId is required.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
      })
    }

    const available = await queueManager.isAvailable()
    if (!available) {
      return capabilityResponse({
        error: 'QUEUE_BACKEND_UNAVAILABLE',
        message: 'Queue backend is not configured.',
        status: 503,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          jobId,
          userId: user.userId,
        },
      })
    }

    const result = await queueManager.cancelJob(jobId)
    if (!result.found) {
      return capabilityResponse({
        error: 'JOB_NOT_FOUND',
        message: 'Render job not found.',
        status: 404,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          jobId,
        },
      })
    }

    if (!result.cancelled) {
      if (result.reason === 'JOB_ACTIVE_CANNOT_CANCEL') {
        return capabilityResponse({
          error: 'JOB_ACTIVE_CANNOT_CANCEL',
          message: 'Render job is active and cannot be cancelled immediately.',
          status: 409,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            jobId,
            state: result.state,
          },
        })
      }

      if (result.reason === 'JOB_ALREADY_FINALIZED') {
        return capabilityResponse({
          error: 'JOB_ALREADY_FINALIZED',
          message: 'Render job is already finalized.',
          status: 400,
          capability: CAPABILITY,
          capabilityStatus: 'PARTIAL',
          metadata: {
            jobId,
            state: result.state,
          },
        })
      }

      return capabilityResponse({
        error: result.reason || 'CANCEL_UNAVAILABLE',
        message: 'Render job cannot be cancelled in the current state.',
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          jobId,
          state: result.state,
          reason: result.reason,
        },
      })
    }

    return capabilityResponse({
      error: 'NONE',
      message: 'Render job cancelled successfully.',
      status: 200,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
      metadata: {
        jobId,
        state: result.state,
      },
    })
  } catch (error) {
    console.error('[render/jobs/cancel] Error:', error)
    return NextResponse.json({ error: 'Failed to cancel render job' }, { status: 500 })
  }
}
