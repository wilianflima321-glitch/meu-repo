/**
 * POST /api/render/jobs/[jobId]/cancel — cancel an in-progress render job
 *
 * BACKLOG §10.4 #29 — completes render job lifecycle (cancel endpoint)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Attempt to cancel the render job
    const job = await (prisma as any).renderJob
      ?.update({
        where: { id: params.jobId },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          errorMessage: `Cancelled by user ${userId} at ${new Date().toISOString()}`,
        },
      })
      .catch(() => null)

    if (job === null) {
      return NextResponse.json(
        { error: 'Schema migration pending or job not found', schemaPending: true },
        { status: 503 }
      )
    }
    if (!job) {
      return NextResponse.json({ error: 'Render job not found' }, { status: 404 })
    }

    return NextResponse.json({ cancelled: true, job })
  } catch (error) {
    console.error('[POST /api/render/jobs/[jobId]/cancel]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
