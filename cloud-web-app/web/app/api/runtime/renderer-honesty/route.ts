import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateRendererHonesty } from '@/lib/production/renderer-honesty-capability'
import { buildHardwareStaticProfile } from '@aethel/engine/render/hardware-profile'
import { buildScalableRenderGraphReport } from '@aethel/engine/render/scalable-render-graph'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/renderer-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Focus 2A + 3B.1 + CW3 — honest renderer capability + Law XV score + present root.
 * Query: webgpu=1|0, webgl2=1|0, desktopWgpu=1|0, webgpuAdapterAcquired=1|0,
 *        webgpuDeviceReady=1|0, claimsWebGpuPresent=1|0,
 *        desktopPresented=1|0, desktopSubmitted=1|0, desktopBackend, desktopSurfaceKind,
 *        score=0-100, cores, memGb
 *        (desktop* mirror Tauri renderer_present_probe — never invent presented/submitted)
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

  // Desktop present evidence — only from explicit probe params (never invent).
  // Fail-closed: presented without submitted must not flip live_present.
  const desktopPresented = parseBool('desktopPresented')
  const desktopSubmitted = parseBool('desktopSubmitted')
  const desktopPresentProbe =
    desktopPresented === undefined && desktopSubmitted === undefined
      ? undefined
      : {
          presented: desktopPresented === true,
          submitted: desktopSubmitted === true,
          backend: sp.get('desktopBackend') ?? undefined,
          surfaceKind: sp.get('desktopSurfaceKind') ?? undefined,
          webviewExclusivePresentHeld: true,
          unrealRhiParityReady: false,
        }

  const report = evaluateRendererHonesty({
    webgpuAvailable: parseBool('webgpu'),
    webgpuAdapterAcquired: parseBool('webgpuAdapterAcquired'),
    webgpuDeviceReady: parseBool('webgpuDeviceReady'),
    claimsWebGpuPresent: parseBool('claimsWebGpuPresent') === true,
    webgl2Available: parseBool('webgl2'),
    desktopWgpuAvailable: parseBool('desktopWgpu'),
    desktopPresentProbe,
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
    presentRoot: report.presentRoot?.canonicalPresentId,
    webgpuPresentAllowed: report.webgpuPresentClaim?.allowed === true,
    capabilityScore,
    tier: profile.tier,
  })

  return NextResponse.json({
    mock: false,
    focus: '2A+3B.1+ci+cw3',
    report,
    /** CW3 — operator present root mirrored at top level for Studio/IDE chrome. */
    presentRoot: report.presentRoot ?? null,
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
