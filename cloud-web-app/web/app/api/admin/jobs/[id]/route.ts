import { NextRequest } from 'next/server'
import { notImplementedCapability } from '@/lib/server/capability-response'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const deleteHandler = async (request: NextRequest) =>
  notImplementedCapability({
    message: 'Job cancellation is gated until queue backend integration is complete.',
    capability: 'ADMIN_JOB_CANCEL',
    milestone: 'P1',
    metadata: {
      method: request.method,
      queueBackend: 'pending',
    },
  })

export const DELETE = withAdminAuth(deleteHandler, 'ops:dashboard:metrics')
