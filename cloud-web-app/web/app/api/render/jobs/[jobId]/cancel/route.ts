import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { notImplementedCapability } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

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
    requireAuth(request)
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
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
    return NextResponse.json({ error: 'Failed to cancel render job' }, { status: 500 })
  }
}
