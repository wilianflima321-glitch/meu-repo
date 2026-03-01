import { notImplementedCapability } from '@/lib/server/capability-response'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const postHandler = async () =>
  notImplementedCapability({
    message: 'Retry action is gated until queue worker retry semantics are implemented.',
    capability: 'ADMIN_JOB_RETRY',
    milestone: 'P1',
  })

export const POST = withAdminAuth(postHandler, 'ops:dashboard:metrics')
