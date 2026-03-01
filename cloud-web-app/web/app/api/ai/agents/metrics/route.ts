import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    return NextResponse.json({
      totalAgents: 0,
      activeAgents: 0,
      totalExecutions: 0,
      successRate: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      avgExecutionTime: 0,
      errorsToday: 0,
      capability: 'AI_AGENTS_METRICS',
      capabilityStatus: 'PARTIAL',
      message: 'Metrics API is active with baseline telemetry only.',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'AI_AGENTS_METRICS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load metrics',
      },
      { status: 500 }
    )
  }
}
