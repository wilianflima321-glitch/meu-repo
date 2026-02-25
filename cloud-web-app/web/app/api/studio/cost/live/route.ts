import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getStudioSession } from '@/lib/server/studio-home-store'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { computeStudioBudgetAlert } from '@/lib/server/studio-budget'

export const dynamic = 'force-dynamic'

const MAX_ROUTE_ID_LENGTH = 120

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-cost-live',
      key: auth.userId,
      max: 240,
      windowMs: 60 * 1000,
      message: 'Too many studio cost polling requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const url = new URL(req.url)
    const sessionId = (url.searchParams.get('sessionId') || '').trim()
    if (!sessionId || sessionId.length > MAX_ROUTE_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'SESSION_ID_REQUIRED',
          message: 'sessionId query is required and must be under 120 characters.',
        },
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
    const budgetAlert = computeStudioBudgetAlert(session.cost)

    return NextResponse.json({
      ok: true,
      capability: 'STUDIO_HOME_COST_LIVE',
      capabilityStatus: 'IMPLEMENTED',
      sessionId,
      cost: session.cost,
      budgetAlert,
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
