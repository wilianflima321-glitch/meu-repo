import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const getHandler = async () =>
  NextResponse.json({
    limits: [],
    capability: 'ADMIN_SECURITY_RATE_LIMITS',
    capabilityStatus: 'PARTIAL',
    message: 'Rate limit governance is pending provider-level integration.',
  })

export const GET = withAdminAuth(getHandler, 'ops:settings:view')
