import { NextRequest, NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import { withAdminAuth } from '@/lib/rbac'
import { queueManager } from '@/lib/queue-system'

export const dynamic = 'force-dynamic'
const CAPABILITY = 'ADMIN_JOB_CANCEL'

const deleteHandler = async (request: NextRequest) => {
  const id = request.nextUrl.pathname.split('/').at(-1) || ''
  if (!id) {
    return capabilityResponse({
      error: 'JOB_ID_REQUIRED',
      message: 'Job id is required.',
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
      metadata: { id },
    })
  }

  const result = await queueManager.cancelJob(id)
  if (!result.found) {
    return capabilityResponse({
      error: 'JOB_NOT_FOUND',
      message: 'Job was not found.',
      status: 404,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { id },
    })
  }

  if (!result.cancelled) {
    if (result.reason === 'JOB_ACTIVE_CANNOT_CANCEL') {
      return capabilityResponse({
        error: 'JOB_ACTIVE_CANNOT_CANCEL',
        message: 'Active jobs cannot be cancelled immediately.',
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { id, state: result.state },
      })
    }
    if (result.reason === 'JOB_ALREADY_FINALIZED') {
      return capabilityResponse({
        error: 'JOB_ALREADY_FINALIZED',
        message: 'Job is already finalized.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { id, state: result.state },
      })
    }

    return capabilityResponse({
      error: result.reason || 'CANCEL_UNAVAILABLE',
      message: 'Job cannot be cancelled in the current state.',
      status: 409,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { id, state: result.state },
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Job cancelled successfully.',
    job: {
      id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    },
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
  })
}

export const DELETE = withAdminAuth(deleteHandler, 'ops:dashboard:metrics')
