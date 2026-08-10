import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { probeForgeSandboxHonesty } from '@/lib/production/forge-sandbox-honesty'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/forge-sandbox-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * L.1 / runtime-provision — Forge sandbox + Firecracker microVM honesty.
 * Fail-closed: firecrackerMicroVmReady is always false without host binary.
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized', mock: false }, { status: 401 })
  }

  const report = await probeForgeSandboxHonesty()

  log.info('forge_sandbox_honesty_api', {
    stamp: report.stamp,
    firecracker: report.firecrackerMicroVmReady,
    local: report.localIsolatedReady,
    e2b: report.e2bReady,
  })

  return NextResponse.json({
    mock: false,
    report,
    marketingAllowed: false,
  })
}
