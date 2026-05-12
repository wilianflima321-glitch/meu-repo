import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { buildAgentOverview, parseAgentLimit } from '@/lib/server/agent-observability'
import { listAgentSnapshots } from '@/lib/server/agent-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const limit = parseAgentLimit(request.nextUrl.searchParams.get('limit'), 50)
    const snapshots = await listAgentSnapshots(auth.userId)
    const overview = buildAgentOverview(snapshots, limit)

    return NextResponse.json({
      executions: overview.executions,
      summary: overview.summary,
      capability: 'AI_AGENTS_EXECUTIONS',
      capabilityStatus: 'READY',
      retention: 'local-agent-store',
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
