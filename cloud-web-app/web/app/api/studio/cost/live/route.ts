import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getStudioSession } from '@/lib/server/studio-home-store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const url = new URL(req.url)
    const sessionId = (url.searchParams.get('sessionId') || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'SESSION_ID_REQUIRED', message: 'sessionId query is required.' },
        { status: 400 }
      )
    }

    const session = await getStudioSession(auth.userId, sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }

    const runsByRole = session.agentRuns.reduce<Record<string, number>>((acc, run) => {
      acc[run.role] = (acc[run.role] || 0) + run.cost
      return acc
    }, {})

    return NextResponse.json({
      ok: true,
      capability: 'STUDIO_HOME_COST_LIVE',
      capabilityStatus: 'IMPLEMENTED',
      sessionId,
      cost: session.cost,
      runsByRole,
      totalRuns: session.agentRuns.length,
      budgetExceeded: session.cost.remainingCredits <= 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read studio live cost'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_COST_LIVE_FAILED', message }, { status: 500 })
  }
}

