import { NextResponse, type NextRequest } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { getCompatibilityRouteMetrics } from '@/lib/server/compatibility-route-telemetry'

export const dynamic = 'force-dynamic'

const handleGet = withAdminAuth(
  async (_request: NextRequest) => {
    const metrics = await getCompatibilityRouteMetrics()
    const now = Date.now()
    const cutoffWindowMs = 14 * 24 * 60 * 60 * 1000

    const routes = metrics.map((item) => {
      const lastHitAt = item.lastHitAt ? new Date(item.lastHitAt).getTime() : 0
      const silentForMs = lastHitAt > 0 ? Math.max(0, now - lastHitAt) : cutoffWindowMs
      const hasUsageWindow = item.hits > 0
      const supportsCutoff = item.status === 'deprecated' || item.status === 'compatibility-wrapper'
      const candidateForRemoval = supportsCutoff && (item.hits === 0 || silentForMs >= cutoffWindowMs)
      return {
        ...item,
        candidateForRemoval,
        silenceDays: Math.floor(silentForMs / (24 * 60 * 60 * 1000)),
        hasUsageWindow,
      }
    })

    const removalCandidates = routes.filter((item) => item.candidateForRemoval).map((item) => item.route)

    return NextResponse.json({
      routes,
      totalRoutes: routes.length,
      totalHits: routes.reduce((sum, item) => sum + item.hits, 0),
      removalCandidates,
      generatedAt: new Date().toISOString(),
      policy: {
        deprecationMode: 'phaseout_after_2_cycles',
        requiredSilentDays: 14,
      },
    })
  },
  'ops:dashboard:metrics'
)

export const GET = handleGet
