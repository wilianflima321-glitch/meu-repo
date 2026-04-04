import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    const blocked = blockIfSimulationDisabled({
      capability: 'AI_AGENTS_OVERVIEW',
      reason: 'CAPABILITY_NOT_IMPLEMENTED',
      message: 'AI agents overview requires real runtime implementation.',
    })
    if (blocked) return blocked
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
