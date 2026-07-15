import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateMultiplayerHonesty } from '@/lib/production/multiplayer-honesty-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/multiplayer-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Block 2B.3 — honest multiplayer capability report.
 * Query: agones=1|0, simulated=1|0, rollbackProven=1|0, crossPlay=1|0
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

  const report = evaluateMultiplayerHonesty({
    agonesAllocatorConfigured: parseBool('agones'),
    lastAllocationSimulated: parseBool('simulated'),
    rollbackDeterministicProven: parseBool('rollbackProven'),
    crossPlayMarketingUnlocked: parseBool('crossPlay'),
    forceDedicatedHeld: parseBool('forceDedicatedHeld'),
    forceP2pHeld: parseBool('forceP2pHeld'),
  })

  log.info('multiplayer_honesty_api', {
    dedicated: report.dedicated.status,
    marketingDedicatedAllowed: report.marketingDedicatedAllowed,
    marketingCrossPlayAllowed: report.marketingCrossPlayAllowed,
  })

  return NextResponse.json({
    mock: false,
    focus: '2B',
    report,
  })
}
