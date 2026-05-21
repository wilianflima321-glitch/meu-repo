import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { buildAgentOverview, parseAgentLimit } from '@/lib/server/agent-observability'
import { AI_AGENT_READ_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'
import { listAgentSnapshots } from '@/lib/server/agent-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const rateLimited = enforceAiCoreRateLimit({
      req: request,
      capability: 'ai.agent.overview',
      route: '/api/ai/agents',
      config: AI_AGENT_READ_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    const limit = parseAgentLimit(request.nextUrl.searchParams.get('limit'), 25)
    const snapshots = await listAgentSnapshots(auth.userId)
    const overview = buildAgentOverview(snapshots, limit)

    return NextResponse.json({
      ...overview,
      capability: 'AI_AGENTS_OVERVIEW',
      capabilityStatus: 'READY',
      retention: 'local-agent-store',
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
