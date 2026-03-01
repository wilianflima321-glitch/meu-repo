import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const getHandler = async () =>
  NextResponse.json({
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    capability: 'ADMIN_JOB_QUEUE_STATS',
    capabilityStatus: 'PARTIAL',
  })

export const GET = withAdminAuth(getHandler, 'ops:dashboard:metrics')
