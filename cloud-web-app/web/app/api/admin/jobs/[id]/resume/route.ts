import { notImplementedCapability } from '@/lib/server/capability-response'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const postHandler = async () =>
  notImplementedCapability({
    message: 'Resume action is gated until queue orchestration controls are available.',
    capability: 'ADMIN_JOB_RESUME',
    milestone: 'P1',
  })

export const POST = withAdminAuth(postHandler, 'ops:dashboard:metrics')
