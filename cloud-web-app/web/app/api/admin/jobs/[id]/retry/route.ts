import { NextRequest, NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import { withAdminAuth } from '@/lib/rbac'
import { queueManager } from '@/lib/queue-system'

export const dynamic = 'force-dynamic'
const CAPABILITY = 'ADMIN_JOB_RETRY'

const postHandler = async (request: NextRequest) => {
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0] || ''
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

  const result = await queueManager.retryJob(id)
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

  if (!result.retried) {
    if (result.reason === 'JOB_NOT_FAILED') {
      return capabilityResponse({
        error: 'JOB_NOT_FAILED',
        message: 'Only failed jobs can be retried.',
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { id, state: result.state },
      })
    }

    return capabilityResponse({
      error: result.reason || 'RETRY_UNAVAILABLE',
      message: 'Job retry is unavailable for this state.',
      status: 409,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { id, state: result.state },
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Job retry scheduled successfully.',
    job: {
      id,
      status: 'queued',
      retriedAt: new Date().toISOString(),
    },
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
  })
}

export const POST = withAdminAuth(postHandler, 'ops:dashboard:metrics')
