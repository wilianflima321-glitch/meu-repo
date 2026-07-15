import { NextRequest, NextResponse } from 'next/server'
import { capabilityResponse } from '@/lib/server/capability-response'
import { withAdminAuth } from '@/lib/rbac'
import { queueManager } from '@/lib/queue-system'

export const dynamic = 'force-dynamic'
const CAPABILITY = 'ADMIN_JOB_PAUSE'

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

  const job = await queueManager.getJobById(id)
  if (!job) {
    return capabilityResponse({
      error: 'JOB_NOT_FOUND',
      message: 'Job was not found.',
      status: 404,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { id },
    })
  }

  await queueManager.pauseQueue(job.queueName)
  return NextResponse.json({
    success: true,
    message: 'Queue paused successfully for job scope.',
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    metadata: {
      id,
      queueName: job.queueName,
      scope: 'queue',
      requestedState: 'paused',
    },
  })
}

export const POST = withAdminAuth(postHandler, 'ops:dashboard:metrics')
