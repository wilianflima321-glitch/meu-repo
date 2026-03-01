import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    return NextResponse.json({
      agents: [],
      capability: 'AI_AGENTS_OVERVIEW',
      capabilityStatus: 'PARTIAL',
      message: 'Agent dashboard surface is active with empty baseline dataset.',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'AI_AGENTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load AI agents',
      },
      { status: 500 }
    )
  }
}
