import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { notImplementedCapability } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CHANGE_APPLY'

export async function POST(request: NextRequest) {
  try {
    requireAuth(request)

    return notImplementedCapability({
      message: 'Apply pipeline is gated until rollback tokens and persistence are fully implemented.',
      capability: CAPABILITY,
      milestone: 'P1',
      metadata: {
        applyMode: 'serial-gated',
        requires: ['validation-pass', 'rollback-token-store'],
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'APPLY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process apply request',
      },
      { status: 500 }
    )
  }
}
