import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateRendererHonesty } from '@/lib/production/renderer-honesty-capability'
import { buildHardwareStaticProfile } from '@aethel/engine/render/hardware-profile'
import { buildScalableRenderGraphReport } from '@aethel/engine/render/scalable-render-graph'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/renderer-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Focus 2A + 3B.1 — honest renderer capability + Law XV score.
 * Query: webgpu=1|0, webgl2=1|0, desktopWgpu=1|0, score=0-100, cores, memGb
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

  const scoreRaw = sp.get('score')
  const capabilityScoreParam =
    scoreRaw !== null && Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : undefined

  const coresRaw = sp.get('cores')
  const memRaw = sp.get('memGb')
  const profile = buildHardwareStaticProfile({
    webgpuAvailable: parseBool('webgpu'),
    webgl2Available: parseBool('webgl2'),
    hardwareConcurrency: coresRaw && Number.isFinite(Number(coresRaw)) ? Number(coresRaw) : undefined,
    deviceMemoryGb: memRaw && Number.isFinite(Number(memRaw)) ? Number(memRaw) : undefined,
  })
  const capabilityScore = capabilityScoreParam ?? profile.capabilityScore
  const srg = buildScalableRenderGraphReport({ ...profile, capabilityScore })

  const report = evaluateRendererHonesty({
    webgpuAvailable: parseBool('webgpu'),
    webgl2Available: parseBool('webgl2'),
    desktopWgpuAvailable: parseBool('desktopWgpu'),
    forceWebHeld: parseBool('forceWebHeld'),
    forceDesktopHeld: parseBool('forceDesktopHeld'),
    capabilityScore,
  })

  report.renderTier = profile.tier
  report.scalableRenderGraphClaim = srg.claim

  log.info('renderer_honesty_api', {
    web: report.web.activePath,
    desktop: report.desktop.activePath,
    marketingAllowed: report.marketingAllowed,
    capabilityScore,
    tier: profile.tier,
  })

  return NextResponse.json({
    mock: false,
    focus: '2A+3B.1+ci',
    report,
    scalableRenderGraph: srg,
    fsrSrg: {
      letter: 'ci',
      fsrExecutorLive: srg.fsrExecutorLive,
      executableNodeCount: srg.executableNodeCount,
      frameGraphLive: false,
      dlssNativeWebAllowed: false,
    },
  })
}
