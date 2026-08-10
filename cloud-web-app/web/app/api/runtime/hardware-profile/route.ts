import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import {
  buildHardwareStaticProfile,
  deriveUMABudget,
  resolveCullingPolicy,
} from '@aethel/engine/render/hardware-profile'
import { buildScalableRenderGraphReport } from '@aethel/engine/render/scalable-render-graph'
import { proveGpuDeviceSoakReadiness } from '@aethel/engine/render/gpu-device-soak'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/hardware-profile/route')

export const dynamic = 'force-dynamic'

/**
 * Block 3B.1 — Law XV Capability Score + SRG blueprint report.
 * Query: webgpu=1|0, webgl2=1|0, cores=N, memGb=N, maxTex=N, adapter=name
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
  const parseNum = (key: string): number | undefined => {
    const v = sp.get(key)
    if (v === null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  const profile = buildHardwareStaticProfile({
    webgpuAvailable: parseBool('webgpu'),
    webgl2Available: parseBool('webgl2'),
    hardwareConcurrency: parseNum('cores'),
    deviceMemoryGb: parseNum('memGb'),
    maxTextureDimension2D: parseNum('maxTex'),
    adapterName: sp.get('adapter') || undefined,
  })

  const srg = buildScalableRenderGraphReport(profile)
  const uma = deriveUMABudget(profile)
  const culling = resolveCullingPolicy(profile)
  const gpuSoak = proveGpuDeviceSoakReadiness({
    limits: {
      maxTextureDimension2D: parseNum('maxTex') ?? 8192,
      maxBufferSize: 268_435_456,
    },
  })

  log.info('hardware_profile_api', {
    score: profile.capabilityScore,
    tier: profile.tier,
    executableNodes: srg.executableNodeCount,
    planAllowed: srg.planAllowed,
    gpuSoakReady: gpuSoak.ready,
  })

  return NextResponse.json({
    mock: false,
    focus: '3B.1+xv-capscore',
    profile,
    scalableRenderGraph: srg,
    umaBudget: uma,
    cullingPolicy: culling,
    gpuDeviceSoak: {
      letter: gpuSoak.letter,
      ready: gpuSoak.ready,
      status: gpuSoak.status,
      evidenceFingerprint: gpuSoak.evidenceFingerprint,
      aaaReady: false,
      marketingAllowed: false,
      reason: gpuSoak.reason,
    },
    held: {
      frameGraph: true,
      gpuCullingInFrame: true,
      cookTorranceShader: true,
      dlssNativeWeb: true,
      scalableRenderGraphAaa: true,
      reason:
        '3B.2–3B.4 — full frame graph HELD; CapScore gate + letter ci FSR spatial CLOSED (partial); DLSS/AAA/Nanite/Lumen HELD; G.3% locked without ladder',
    },
    fsrSrg: {
      letter: 'ci',
      fsrExecutorLive: srg.fsrExecutorLive,
      executableNodeCount: srg.executableNodeCount,
      frameGraphLive: srg.frameGraphLive,
      planAllowed: srg.planAllowed,
      g3CodeDepthPercent: srg.g3CodeDepthPercent,
      scalableRenderGraphAaaReady: false,
    },
  })
}
