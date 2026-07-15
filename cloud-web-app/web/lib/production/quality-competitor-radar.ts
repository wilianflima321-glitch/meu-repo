/**
 * Letter cx — Quality-vs-competitor radar scaffold.
 * Honest metrics from existing honesty APIs — never fake Unreal FPS / Nanite FPS.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { evaluateRendererHonesty, type RendererHonestyReport } from '@/lib/production/renderer-honesty-capability'
import { evaluateHubHonesty, type HubHonestyReport } from '@/lib/hub/hub-honesty-capability'
import {
  evaluateAaaProductionHonesty,
  type AaaProductionHonestyReport,
} from '@/lib/immunity/aaa-production-capability'
import { evaluatePublishArcadeHonesty, type PublishArcadeHonestyReport } from '@/lib/production/publish-arcade-honesty'
import { probeWorldForgeHonesty, type WorldForgeHonestyReport } from '@/lib/world-forge/world-forge-honesty'

const log = createComponentLogger('quality-competitor-radar')

export const QUALITY_COMPETITOR_RADAR_LETTER = 'cx' as const
export const QUALITY_COMPETITOR_RADAR_WIRED = true as const
/** Live FPS / Unreal parity marketing always HELD on this scaffold */
export const COMPETITOR_FPS_CLAIM_HELD = true as const
export const FAKE_UNREAL_FPS_FORBIDDEN = true as const

export type CompetitorAxisId =
  | 'renderer'
  | 'hub'
  | 'aaa-production'
  | 'publish'
  | 'world-forge'
  | 'forge-finops'

export type CompetitorAxisStatus = 'lead' | 'parity' | 'trail' | 'held' | 'unknown'

export interface CompetitorAxisScore {
  axis: CompetitorAxisId
  status: CompetitorAxisStatus
  /** 0–100 honest score from gates — not invented FPS */
  score: number
  notes: string[]
  marketingClaimAllowed: false
}

export interface QualityCompetitorRadarReport {
  letter: typeof QUALITY_COMPETITOR_RADAR_LETTER
  generatedAt: string
  axes: CompetitorAxisScore[]
  /** Always false — never claim fake Unreal FPS or Nanite FPS */
  fakeUnrealFpsForbidden: true
  marketingSurpassUnrealAllowed: false
  claim: string
  productCopy: string
  sources: {
    renderer?: RendererHonestyReport
    hub?: HubHonestyReport
    aaa?: AaaProductionHonestyReport
    publish?: PublishArcadeHonestyReport
    worldForge?: WorldForgeHonestyReport
  }
}

export interface QualityCompetitorRadarInput {
  renderer?: Parameters<typeof evaluateRendererHonesty>[0]
  hub?: Parameters<typeof evaluateHubHonesty>[0]
  aaa?: Parameters<typeof evaluateAaaProductionHonesty>[0]
  publish?: Parameters<typeof evaluatePublishArcadeHonesty>[0]
  worldForge?: Parameters<typeof probeWorldForgeHonesty>[0]
  /** FinOps / Founder God Mode wired */
  finOpsWired?: boolean
  domainEconomicRouterWired?: boolean
  weeklyEvolutionWired?: boolean
}

function axisFromBoolean(ok: boolean, partial: boolean): { status: CompetitorAxisStatus; score: number } {
  if (ok) return { status: 'parity', score: 72 }
  if (partial) return { status: 'trail', score: 48 }
  return { status: 'held', score: 20 }
}

/**
 * Aggregate honesty probes into a radar scaffold. Never invent FPS numbers.
 */
export function buildQualityCompetitorRadar(
  input: QualityCompetitorRadarInput = {},
): QualityCompetitorRadarReport {
  const renderer = evaluateRendererHonesty(input.renderer)
  const hub = evaluateHubHonesty(input.hub)
  const aaa = evaluateAaaProductionHonesty(input.aaa)
  const publish = evaluatePublishArcadeHonesty(input.publish)
  const worldForge = probeWorldForgeHonesty(input.worldForge)

  const rendererOk = renderer.web.status === 'live' || renderer.web.status === 'fallback'
  const hubPartial = hub.marketingHubCheckoutAllowed === false
  const aaaPartial =
    aaa.capability.cookPackReady ||
    aaa.capability.sabTransformsReady ||
    aaa.capability.physicsWorkerReady
  const publishOk = publish.bakedLightingGate.status === 'PASS'
  const worldPartial = worldForge.conveyorReady === true

  const finOpsWired =
    input.finOpsWired === true ||
    (input.domainEconomicRouterWired === true && input.weeklyEvolutionWired === true)

  const axes: CompetitorAxisScore[] = [
    {
      axis: 'renderer',
      ...axisFromBoolean(rendererOk && renderer.marketingAllowed === false, rendererOk),
      notes: [
        ...renderer.web.notes.slice(0, 2),
        'No invented Unreal FPS — honesty path only',
      ],
      marketingClaimAllowed: false,
    },
    {
      axis: 'hub',
      status: hubPartial ? 'trail' : 'held',
      score: hubPartial ? 55 : 25,
      notes: [hub.claim, 'Coins/Agones checkout HELD'],
      marketingClaimAllowed: false,
    },
    {
      axis: 'aaa-production',
      ...axisFromBoolean(false, aaaPartial),
      notes: [
        'AAA production scaffolds CLOSED where proven; marketingAaaProductionAllowed always false',
        `cookPackReady=${aaa.capability.cookPackReady}`,
      ],
      marketingClaimAllowed: false,
    },
    {
      axis: 'publish',
      status: publishOk ? 'parity' : 'held',
      score: publishOk ? 70 : 30,
      notes: publish.bakedLightingGate.notes.slice(0, 2),
      marketingClaimAllowed: false,
    },
    {
      axis: 'world-forge',
      status: worldForge.surpassUnrealUnityAaaRuntime ? 'lead' : worldPartial ? 'trail' : 'held',
      score: worldPartial ? 52 : 28,
      notes: [
        'Honest: NOT surpassed Unreal/Unity AAA runtime',
        `gpuRecastReady=${worldForge.gpuRecastReady} detourNavReady=${worldForge.detourNavReady}`,
      ],
      marketingClaimAllowed: false,
    },
    {
      axis: 'forge-finops',
      status: finOpsWired ? 'parity' : 'held',
      score: finOpsWired ? 68 : 15,
      notes: [
        'Domain economic router + weekly evolution + hot-fix cadence (letter cx)',
        'War room = Studio Agents rail — not orphan admin dashboard',
      ],
      marketingClaimAllowed: false,
    },
  ]

  const report: QualityCompetitorRadarReport = {
    letter: QUALITY_COMPETITOR_RADAR_LETTER,
    generatedAt: new Date().toISOString(),
    axes,
    fakeUnrealFpsForbidden: true,
    marketingSurpassUnrealAllowed: false,
    claim:
      'Quality radar aggregates honesty APIs only — never invent Unreal FPS, Nanite FPS, or Coins/Agones readiness',
    productCopy:
      'Compare Aethel vs competitors using real gate evidence. Fake FPS tiles are forbidden.',
    sources: { renderer, hub, aaa, publish, worldForge },
  }

  log.info('quality_competitor_radar_built', {
    letter: QUALITY_COMPETITOR_RADAR_LETTER,
    axes: axes.length,
    finOpsWired,
  })
  return report
}
