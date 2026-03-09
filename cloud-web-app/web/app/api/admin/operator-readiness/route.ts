import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { getOperatorReadinessState } from '@/lib/server/operator-readiness'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async () => {
  const readiness = await getOperatorReadinessState()

  return NextResponse.json({
    status: readiness.status,
    blockers: readiness.blockers,
    instructions: readiness.instructions,
    recommendedCommands: readiness.recommendedCommands,
    checks: readiness.checks,
    note: 'Operator readiness aggregates production runtime, billing runtime, and preview runtime preflights.',
  })
}, 'ops:settings:view')
