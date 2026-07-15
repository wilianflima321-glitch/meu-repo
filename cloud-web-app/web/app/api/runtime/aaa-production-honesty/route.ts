import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateAaaProductionHonesty } from '@/lib/immunity/aaa-production-capability'
import { ensureZstdEncoder } from '@/lib/immunity/aethel-pack-compress'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/aaa-production-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * 7 Critical AAA Production Gaps — honesty capability report.
 * Query flags are explicit probes only; defaults fail-closed.
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

  await ensureZstdEncoder()

  const report = evaluateAaaProductionHonesty({
    nativeBakerToolchainReady: parseBool('baker'),
    cookManifestArtifactsPresent: parseBool('cookArtifacts'),
    cookPackProven: parseBool('cookPack'),
    crossOriginIsolated: parseBool('coi'),
    sharedArrayBufferAvailable: parseBool('sab'),
    objectPoolSoakPassed: parseBool('poolSoak'),
    fixedPointPhysicsWired: parseBool('fixedPhysics'),
    competitiveRollbackSoakPassed: parseBool('competitiveSoak'),
    physicsWorkerProven: parseBool('physicsWorker'),
    ggpoSessionProven: parseBool('ggpo'),
    wasmAbiNegotiateOk: parseBool('wasmAbi'),
    dx12VulkanBackendLive: parseBool('dxvk'),
    consoleHalProven: parseBool('consoleHal'),
    publishedBundleStripped: parseBool('stripEditor'),
    editorRuntimeIsolatedProven: parseBool('editorIsolated'),
  })

  log.info('aaa_production_honesty_api', {
    cookPackReady: report.capability.cookPackReady,
    zstdEncoderReady: report.capability.zstdEncoderReady,
    sabTransformsReady: report.capability.sabTransformsReady,
    physicsWorkerReady: report.capability.physicsWorkerReady,
    editorRuntimeIsolated: report.capability.editorRuntimeIsolated,
    v8WinitHostReady: report.capability.v8WinitHostReady,
    wasmPluginAbiReady: report.capability.wasmPluginAbiReady,
    consoleHalReady: report.capability.consoleHalReady,
    competitiveRollbackSoakReady: report.capability.competitiveRollbackSoakReady,
    marketingAllowed: report.capability.marketingAaaProductionAllowed,
  })

  return NextResponse.json({
    mock: false,
    letter: 'ce',
    focus: 'competitive-rollback-gameloop-soak',
    report,
  })
}
