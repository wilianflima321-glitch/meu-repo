import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { buildConsolidationTruthMatrix } from '@/lib/production/consolidation-truth-matrix'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/consolidation-truth/route')

export const dynamic = 'force-dynamic'

/**
 * CW1 — fail-closed product truth matrix for Studio / Critic / badges.
 * Query: webgpu=1|0, webgl2=1|0, desktopWgpu=1|0, webgpuAdapterAcquired=1|0
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized', mock: false }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const parseBool = (key: string): boolean | undefined => {
    const v = sp.get(key)
    if (v === null) return undefined
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
    return undefined
  }

  const matrix = buildConsolidationTruthMatrix({
    renderer: {
      webgpuAvailable: parseBool('webgpu'),
      webgl2Available: parseBool('webgl2'),
      desktopWgpuAvailable: parseBool('desktopWgpu'),
      forceWebHeld: parseBool('forceWebHeld'),
      forceDesktopHeld: parseBool('forceDesktopHeld'),
    },
    renderPath: {
      webgpuAvailable: parseBool('webgpu'),
      webgl2Available: parseBool('webgl2'),
      desktopWgpuMounted: parseBool('desktopWgpu'),
      webgpuAdapterAcquired: parseBool('webgpuAdapterAcquired'),
      forceHeld: parseBool('forceWebHeld'),
    },
  })

  log.info('consolidation_truth_api', {
    rows: matrix.rows.length,
    held: matrix.summary.held,
    marketingAaaAllowed: matrix.marketingAaaAllowed,
  })

  return NextResponse.json({
    mock: false,
    wave: 'CW1',
    marketingAaaAllowed: false,
    matrix,
  })
}
