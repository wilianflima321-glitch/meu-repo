import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { buildAgentMetrics, buildAgentOverview } from '@/lib/server/agent-observability'
import { AI_AGENT_READ_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'
import { listAgentSnapshots } from '@/lib/server/agent-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const rateLimited = enforceAiCoreRateLimit({
      req: request,
      capability: 'ai.agent.metrics',
      route: '/api/ai/agents/metrics',
      config: AI_AGENT_READ_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    const snapshots = await listAgentSnapshots(auth.userId)
    const overview = buildAgentOverview(snapshots, 100)
    const metrics = buildAgentMetrics(overview)

    return NextResponse.json({
      ...metrics,
      capability: 'AI_AGENTS_METRICS',
      capabilityStatus: 'READY',
      retention: 'local-agent-store',
      measurementNote: 'Execution counts are persisted; token and cost metering are intentionally marked unmetered until ledger integration.',
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
