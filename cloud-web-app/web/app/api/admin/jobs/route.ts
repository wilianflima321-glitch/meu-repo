import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const getHandler = async () =>
  NextResponse.json({
    jobs: [],
    capability: 'ADMIN_JOB_QUEUE',
    capabilityStatus: 'PARTIAL',
    message: 'Job queue API is running in observation mode.',
  })

export const GET = withAdminAuth(getHandler, 'ops:dashboard:metrics')
