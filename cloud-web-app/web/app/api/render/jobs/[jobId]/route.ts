/**
 * GET /api/render/jobs/[jobId] — get render job status and progress
 *
 * DEBT-RENDER-001: Fixed — now uses typed Prisma access + proper error surface.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'

const log = createComponentLogger('api/render/jobs/[jobId]')

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  let userId: string
  try {
    userId = requireAuth(req).userId
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const job = await prisma.renderJob.findFirst({
      where: { id: params.jobId },
      select: {
        id: true,
        status: true,
        progress: true,
        provider: true,
        outputUrl: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        costUsd: true,
        projectId: true,
        requestedBy: true,
        receiptRef: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Render job not found' }, { status: 404 })
    }

    // Authorization: only job owner or project owner can view
    if (job.requestedBy !== userId) {
      const project = await prisma.project.findFirst({
        where: { id: job.projectId, userId },
        select: { id: true },
      })
      if (!project) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Map DB status to UI-safe status
    const uiStatus = ['processing', 'running', 'active'].includes(job.status)
      ? 'rendering'
      : job.status === 'cancelled'
      ? 'failed'
      : job.status;

    return NextResponse.json({
      job: {
        ...job,
        status: uiStatus,
      }
    })
  } catch (error) {
    log.error('GET /api/render/jobs/[jobId] failed', error)
    return NextResponse.json(
      {
        error: 'RENDER_JOB_FETCH_FAILED',
        message: 'Failed to fetch render job. If this persists, run pending database migrations.',
        details: process.env.NODE_ENV !== 'production' ? (error as Error)?.message : undefined,
      },
      { status: 500 }
    )
  }
}

