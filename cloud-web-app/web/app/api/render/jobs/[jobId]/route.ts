/**
 * GET /api/render/jobs/[jobId] — get render job status and progress
 *
 * BACKLOG §10.4 #29 / STRATEGY — completes render job lifecycle
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'

const log = createComponentLogger('api/render/jobs/[jobId]')

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // RenderJob model — may be pending schema migration
    const job = await (prisma as any).renderJob
      ?.findFirst({
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
      .catch(() => null)

    if (job === null) {
      return NextResponse.json(
        { error: 'Schema migration pending — RenderJob model not yet available.', schemaPending: true },
        { status: 503 }
      )
    }
    if (!job) {
      return NextResponse.json({ error: 'Render job not found' }, { status: 404 })
    }

    return NextResponse.json({ job })
  } catch (error) {
    log.error('GET /api/render/jobs/[jobId] failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
