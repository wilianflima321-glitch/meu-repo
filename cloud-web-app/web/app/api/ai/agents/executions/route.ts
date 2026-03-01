import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    return NextResponse.json({
      executions: [],
      capability: 'AI_AGENTS_EXECUTIONS',
      capabilityStatus: 'PARTIAL',
      message: 'Execution history API is running with baseline retention only.',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'AI_AGENTS_EXECUTIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load executions',
      },
      { status: 500 }
    )
  }
}
