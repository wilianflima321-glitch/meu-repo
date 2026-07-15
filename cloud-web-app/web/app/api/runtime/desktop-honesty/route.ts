import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateDesktopHonesty } from '@/lib/production/desktop-honesty-capability'
import { evaluateSidecarAiHealth } from '@/lib/production/sidecar-ai-health'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/desktop-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Block 9 — honest desktop / PTY path capability report.
 * Query: desktop=1|0, cloud=1|0, fsEmit=1|0, fsP95=<ms>, sidecarOk=1|0
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const parseBool = (key: string): boolean | undefined => {
    const v = sp.get(key)
    if (v === null) return undefined
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
    return undefined
  }
  const fsP95Raw = sp.get('fsP95')
  const fsP95 =
    fsP95Raw !== null && fsP95Raw !== ''
      ? Number(fsP95Raw)
      : undefined

  const report = evaluateDesktopHonesty({
    desktopNativeBridgePresent: parseBool('desktop'),
    cloudContainerPtyActive: parseBool('cloud'),
    fsWatchEmitsToUi: parseBool('fsEmit'),
    fsWatchLatencyP95Ms:
      typeof fsP95 === 'number' && Number.isFinite(fsP95) ? fsP95 : null,
    sidecarAiHealthOk: parseBool('sidecarOk'),
  })

  const sidecar = evaluateSidecarAiHealth({
    onnxProbeAvailable: parseBool('sidecarOk') === true,
    pingOk: parseBool('sidecarOk') === true,
    pingLatencyMs: parseBool('sidecarOk') === true ? 12 : null,
  })

  log.info('desktop_honesty_api', {
    path: report.activePty.path,
    marketingLocalShellAllowed: report.marketingLocalShellAllowed,
    sidecar: sidecar.status,
  })

  return NextResponse.json({ report, sidecar })
}
