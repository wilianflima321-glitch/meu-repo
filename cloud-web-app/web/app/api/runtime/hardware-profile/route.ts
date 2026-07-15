import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import {
  buildHardwareStaticProfile,
  deriveUMABudget,
  resolveCullingPolicy,
} from '@aethel/engine/render/hardware-profile'
import { buildScalableRenderGraphReport } from '@aethel/engine/render/scalable-render-graph'
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

  log.info('hardware_profile_api', {
    score: profile.capabilityScore,
    tier: profile.tier,
    executableNodes: srg.executableNodeCount,
  })

  return NextResponse.json({
    mock: false,
    focus: '3B.1',
    profile,
    scalableRenderGraph: srg,
    umaBudget: uma,
    cullingPolicy: culling,
    held: {
      frameGraph: true,
      gpuCullingInFrame: true,
      cookTorranceShader: true,
      dlssNativeWeb: true,
      reason:
        '3B.2–3B.4 — full frame graph HELD; letter ci FSR spatial executor CLOSED (partial); DLSS web HELD; do not market dual live GPU',
    },
    fsrSrg: {
      letter: 'ci',
      fsrExecutorLive: srg.fsrExecutorLive,
      executableNodeCount: srg.executableNodeCount,
      frameGraphLive: srg.frameGraphLive,
    },
  })
}
