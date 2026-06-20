/**
 * POST /api/render/jobs/[jobId]/cancel — cancel an in-progress render job
 *
 * DEBT-RENDER-001: Fixed — typed Prisma access + authorization.
 *
 * Capability contract (RENDER_JOB_CANCEL): queued jobs can be cancelled now;
 * actively-rendering jobs cannot be signalled to stop until the provider cancel
 * channel is wired, so the capability is reported as PARTIAL.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { capabilityResponse } from '@/lib/server/capability-response'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'

const CAPABILITY = 'RENDER_JOB_CANCEL'
const log = createComponentLogger('api/render/jobs/[jobId]/cancel')

const ACTIVE_STATES = new Set(['rendering', 'processing', 'running', 'active'])
const FINALIZED_STATES = new Set(['completed', 'failed', 'cancelled'])

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const job = await prisma.renderJob.findFirst({
      where: { id: params.jobId },
      select: { id: true, status: true, requestedBy: true, projectId: true },
    })

    if (!job) {
      return capabilityResponse({
        error: 'JOB_NOT_FOUND',
        message: 'Render job was not found.',
        status: 404,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { jobId: params.jobId },
      })
    }

    // Authorization: only the job requester can cancel
    if (job.requestedBy !== userId) {
      return NextResponse.json({ error: 'Forbidden — only the job owner can cancel.' }, { status: 403 })
    }

    const status = String(job.status ?? '').toLowerCase()

    if (FINALIZED_STATES.has(status)) {
      return capabilityResponse({
        error: 'JOB_ALREADY_FINALIZED',
        message: `Render job is already ${status}.`,
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { jobId: params.jobId, state: status },
      })
    }

    if (ACTIVE_STATES.has(status)) {
      return capabilityResponse({
        error: 'JOB_ACTIVE_CANNOT_CANCEL',
        message: 'Active render jobs cannot be cancelled until the provider cancel channel is wired.',
        status: 409,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: { jobId: params.jobId, state: status },
      })
    }

    const cancelled = await prisma.renderJob.update({
      where: { id: params.jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorMessage: `Cancelled by user ${userId} at ${new Date().toISOString()}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Render job cancelled successfully.',
      job: cancelled,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  } catch (error) {
    log.error('POST /api/render/jobs/[jobId]/cancel failed', error)
    return capabilityResponse({
      error: 'QUEUE_BACKEND_UNAVAILABLE',
      message: 'Render job backend is not available or query failed.',
      status: 503,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: { jobId: params.jobId, error: String(error) },
    })
  }
}
