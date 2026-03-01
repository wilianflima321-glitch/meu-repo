import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { notImplementedCapability } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CHANGE_ROLLBACK'

export async function POST(request: NextRequest) {
  try {
    requireAuth(request)

    return notImplementedCapability({
      message: 'Rollback endpoint is gated until persistent rollback snapshots are available.',
      capability: CAPABILITY,
      milestone: 'P1',
      metadata: {
        requires: ['rollback-token', 'snapshot-store'],
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'ROLLBACK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process rollback request',
      },
      { status: 500 }
    )
  }
}
