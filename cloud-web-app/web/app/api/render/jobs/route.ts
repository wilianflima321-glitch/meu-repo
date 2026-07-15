import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'
import { enforceRouteRateLimit, RENDER_JOB_RATE_LIMIT, RENDER_JOB_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit'

export const runtime = 'nodejs'

const log = createComponentLogger('api/render/jobs')

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try {
    user = requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.userId

  const rateLimited = await enforceRouteRateLimit({
    req,
    capability: 'RENDER_JOB_CREATE',
    route: '/api/render/jobs',
    config: RENDER_JOB_RATE_LIMIT,
    identifier: userId,
  })
  if (rateLimited) return rateLimited

  try {
    const body = await req.json()
    const { projectId, provider = 'internal' } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or forbidden' }, { status: 403 })
    }

    // Create the job
    const job = await prisma.renderJob.create({
      data: {
        projectId,
        requestedBy: userId,
        status: 'queued',
        progress: 0,
        provider,
      },
    })

    log.info(`RenderJob ${job.id} created for project ${projectId} by ${userId}`)

    // Note: Render worker picks up 'queued' jobs from the database asynchronously.

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    log.error('POST /api/render/jobs failed', error)
    return NextResponse.json(
      {
        error: 'RENDER_JOB_CREATION_FAILED',
        message: 'Failed to create render job.',
        details: process.env.NODE_ENV !== 'production' ? (error as Error)?.message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try {
    user = requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.userId

  const rateLimited = await enforceRouteRateLimit({
    req,
    capability: 'RENDER_JOB_LIST',
    route: '/api/render/jobs:list',
    config: RENDER_JOB_READ_RATE_LIMIT,
    identifier: userId,
  })
  if (rateLimited) return rateLimited

  try {
    const projectId = req.nextUrl.searchParams.get('projectId')
    const where: any = { requestedBy: userId }
    if (projectId) {
      where.projectId = projectId
    }

    const jobs = await prisma.renderJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const mappedJobs = jobs.map((job) => {
      let uiStatus = job.status
      if (['processing', 'running', 'active'].includes(job.status)) {
        uiStatus = 'rendering'
      } else if (job.status === 'cancelled') {
        uiStatus = 'failed'
      }
      return {
        ...job,
        status: uiStatus,
      }
    })

    return NextResponse.json({ jobs: mappedJobs })
  } catch (error) {
    log.error('GET /api/render/jobs failed', error)
    return NextResponse.json(
      {
        error: 'RENDER_JOB_LIST_FAILED',
        message: 'Failed to fetch render jobs.',
        details: process.env.NODE_ENV !== 'production' ? (error as Error)?.message : undefined,
      },
      { status: 500 }
    )
  }
}

