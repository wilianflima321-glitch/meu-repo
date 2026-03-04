import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { capabilityResponse } from '@/lib/server/capability-response'
import { queueManager } from '@/lib/queue-system'

export const dynamic = 'force-dynamic'
const CAPABILITY = 'ADMIN_JOB_QUEUE_STATS'

const getHandler = async (_request: NextRequest) => {
  const available = await queueManager.isAvailable()
  if (!available) {
    return capabilityResponse({
      error: 'QUEUE_BACKEND_UNAVAILABLE',
      message: 'Queue backend is not configured.',
      status: 503,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }

  const allStats = await queueManager.getAllStats()
  let pending = 0
  let running = 0
  let completed = 0
  let failed = 0

  for (const stats of Object.values(allStats)) {
    pending += stats.waiting + stats.delayed
    running += stats.active
    completed += stats.completed
    failed += stats.failed
  }

  return NextResponse.json({
    pending,
    running,
    completed,
    failed,
    avgProcessingTime: 0,
    throughput: 0,
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    metadata: {
      queues: Object.keys(allStats).length,
    },
  })
}

export const GET = withAdminAuth(getHandler, 'ops:dashboard:metrics')
