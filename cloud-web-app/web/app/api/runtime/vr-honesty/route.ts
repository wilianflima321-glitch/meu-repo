import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { buildDefaultWebXrHonesty } from '@/lib/webxr/webxr-honesty-capability'
import { evaluateVrHonesty } from '@/lib/production/vr-honesty-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/vr-honesty/route')

export const dynamic = 'force-dynamic'

/** Block 8 — honest WebXR / VR capability report (no XR marketing without evidence). */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webxr = buildDefaultWebXrHonesty()
  const report = evaluateVrHonesty({
    navigatorXrPresent: webxr.webxrApiAvailable,
    applyToLayerInFrame: webxr.foveationWiredInFrameLoop,
    desktopExclusiveReady: false,
  })

  log.info('vr_honesty_api', {
    shipStatus: webxr.shipStatus,
    marketing: webxr.marketingAllowed,
    desktop: report.desktopExclusiveVr.status,
  })

  return NextResponse.json({ report: webxr, vrDetail: report })
}
