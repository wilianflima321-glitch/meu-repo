import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const getHandler = async () =>
  NextResponse.json({
    events: [],
    capability: 'ADMIN_SECURITY_EVENTS',
    capabilityStatus: 'PARTIAL',
    message: 'Security event stream is in baseline mode.',
  })

export const GET = withAdminAuth(getHandler, 'ops:settings:view')
