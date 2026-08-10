/**
 * Law XV — Scalable Render Graph blueprint registry.
 * Spec §3.4 — nodes are registered with honest execution status.
 * Block 3B.1 CORE: planner + letter ci FSR spatial executor + CapScore fail-closed gate.
 * Full frame graph (GBuffer/RT/SSR/…) remains HELD until 3B.2.
 *
 * G.3 code-depth % is fail-closed at scaffold until Progress §G.% Evidence Ladder
 * band gates pass — never invent uplift from CapScore alone.
 */

/** Locked scaffold depth — bump only when Progress ladder band gates pass (Critic). */
export const G3_CODE_DEPTH_PERCENT_LOCKED = 15 as const

/** Progress §G.% Evidence Ladder — do not raise claimed % without band pass. */
export const G3_PERCENT_UPLIFT_REQUIRES_LADDER = true as const

import type { HardwareStaticProfile, RenderTier } from '../hardware-profile'
import { tierFromCapabilityScore } from '../hardware-profile'
import {
  selectScalableRenderTier,
  type CapScoreTierSelection,
  SCALABLE_RENDER_GRAPH_AAA_READY,
  NANITE_MARKETING_ALLOWED,
  LUMEN_MARKETING_ALLOWED,
} from './capscore-tier-gate'

export {
  FSR_SRG_EXECUTOR_LETTER,
  FSR_SRG_EXECUTOR_SHIPPED,
  DLSS_NATIVE_WEB_HELD,
  resolveFsrSrgExecutorPlan,
  applyFsrSrgSpatialSample,
  resolveInternalPresentSize,
  executeFsrSrgNode,
  proveFsrSrgExecutorSoak,
  type FsrSrgQualityMode,
  type FsrSrgExecutorPlan,
  type FsrSrgExecuteInput,
  type FsrSrgExecuteResult,
} from './fsr-executor'

export {
  CAPSCORE_TIER_GATE_LETTER,
  CAPSCORE_TIER_GATE_SHIPPED,
  SCALABLE_RENDER_GRAPH_AAA_READY,
  NANITE_MARKETING_ALLOWED,
  LUMEN_MARKETING_ALLOWED,
  selectScalableRenderTier,
  requireCapScoreForRenderPlan,
  type CapScoreGateRejectCode,
  type CapScoreTierSelection,
} from './capscore-tier-gate'

export type RenderGraphNodeId =
  | 'GBuffer'
  | 'RT_GI'
  | 'SSR'
  | 'SSGI'
  | 'Probes'
  | 'Bloom'
  | 'FSR'
  | 'ForwardPBR'
  | 'BakedLM'
  | 'SimpleShadow'
  | 'Present'

export type RenderGraphNodeStatus = 'registered' | 'held'

export interface RenderGraphNodeSpec {
  id: RenderGraphNodeId
  vramMbMin: number
  requiresBindless: boolean
  requiresCompute: boolean
  requiresRayTracing: boolean
  /** True only when a live executor exists in this build */
  executorShipped: boolean
}

export interface RenderGraphBlueprint {
  tier: RenderTier
  nodes: RenderGraphNodeId[]
}

export interface ResolvedRenderGraphNode {
  id: RenderGraphNodeId
  status: RenderGraphNodeStatus
  reason: string
}

export interface ScalableRenderGraphReport {
  generatedAt: string
  capabilityScore: number
  tier: RenderTier
  blueprint: RenderGraphBlueprint
  nodes: ResolvedRenderGraphNode[]
  /** Count of nodes with live executors (FSR spatial from letter ci; rest HELD) */
  executableNodeCount: number
  /**
   * Full dual-live GPU frame graph — always false until 3B.2.
   * Partial FSR executor does not flip this.
   */
  frameGraphLive: false
  /** True when FSR spatial executor is registered in this report. */
  fsrExecutorLive: boolean
  /** CapScore gate result — fail-closed when score ignored/missing. */
  capScoreGate: CapScoreTierSelection
  /**
   * When CapScore gate fails, plan is refused (empty blueprint, zero executables).
   * Never success with ignored CapScore.
   */
  planAllowed: boolean
  /** AAA / Nanite / Lumen marketing — always false until ladder gates. */
  scalableRenderGraphAaaReady: false
  naniteMarketingAllowed: false
  lumenMarketingAllowed: false
  /**
   * Onda G.3 claimed code-depth % — locked until Progress §G.% Evidence Ladder
   * band gates pass. CapScore / FSR spatial / secondary_winit substrates do NOT uplift.
   */
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  /** Always true — Critic rejects Progress/Index % bumps without ladder evidence. */
  g3PercentUpliftRequiresLadder: typeof G3_PERCENT_UPLIFT_REQUIRES_LADDER
  claim: string
}

const NODE_SPECS: Record<RenderGraphNodeId, RenderGraphNodeSpec> = {
  GBuffer: {
    id: 'GBuffer',
    vramMbMin: 512,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: false,
  },
  RT_GI: {
    id: 'RT_GI',
    vramMbMin: 2048,
    requiresBindless: true,
    requiresCompute: true,
    requiresRayTracing: true,
    executorShipped: false,
  },
  SSR: {
    id: 'SSR',
    vramMbMin: 256,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: false,
  },
  SSGI: {
    id: 'SSGI',
    vramMbMin: 256,
    requiresBindless: false,
    requiresCompute: true,
    requiresRayTracing: false,
    executorShipped: false,
  },
  Probes: {
    id: 'Probes',
    vramMbMin: 128,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: false,
  },
  Bloom: {
    id: 'Bloom',
    vramMbMin: 64,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: false,
  },
  FSR: {
    id: 'FSR',
    vramMbMin: 64,
    requiresBindless: false,
    // Letter ci — spatial upscale does not require compute shaders.
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: true,
  },
  ForwardPBR: {
    id: 'ForwardPBR',
    vramMbMin: 0,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    // Preview path is R3F meshStandard — not this graph executor.
    executorShipped: false,
  },
  BakedLM: {
    id: 'BakedLM',
    vramMbMin: 0,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: false,
  },
  SimpleShadow: {
    id: 'SimpleShadow',
    vramMbMin: 0,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: false,
  },
  Present: {
    id: 'Present',
    vramMbMin: 0,
    requiresBindless: false,
    requiresCompute: false,
    requiresRayTracing: false,
    executorShipped: false,
  },
}

export const BLUEPRINTS: Record<RenderTier, RenderGraphBlueprint> = {
  enthusiast: {
    tier: 'enthusiast',
    nodes: ['GBuffer', 'RT_GI', 'SSR', 'Bloom', 'FSR', 'Present'],
  },
  discrete: {
    tier: 'discrete',
    nodes: ['GBuffer', 'SSGI', 'Probes', 'Bloom', 'FSR', 'Present'],
  },
  integrated: {
    tier: 'integrated',
    nodes: ['ForwardPBR', 'BakedLM', 'SimpleShadow', 'FSR', 'Present'],
  },
  webgl2: {
    tier: 'webgl2',
    // Letter ci — CapScore spatial FSR for GT730 degrade (not compute FSR / not DLSS).
    nodes: ['ForwardPBR', 'BakedLM', 'FSR', 'Present'],
  },
}

export function getBlueprintForScore(score: number): RenderGraphBlueprint {
  return BLUEPRINTS[tierFromCapabilityScore(score)]
}

export function getBlueprintForTier(tier: RenderTier): RenderGraphBlueprint {
  return BLUEPRINTS[tier]
}

function resolveNode(
  id: RenderGraphNodeId,
  profile: HardwareStaticProfile
): ResolvedRenderGraphNode {
  const spec = NODE_SPECS[id]
  if (!spec.executorShipped) {
    return {
      id,
      status: 'held',
      reason:
        'Node executor not shipped — Scalable Render Graph blueprint planner (3B.1); non-FSR frame graph is 3B.2',
    }
  }
  if (spec.requiresRayTracing && !profile.supportsRayTracing) {
    return { id, status: 'held', reason: 'Requires hardware ray tracing' }
  }
  if (spec.requiresBindless && !profile.supportsBindless) {
    return { id, status: 'held', reason: 'Requires bindless (not available on webgl2)' }
  }
  if (spec.requiresCompute && !profile.supportsCompute) {
    return { id, status: 'held', reason: 'Requires compute shaders' }
  }
  if (
    spec.vramMbMin > 0 &&
    profile.dedicatedVramMb !== null &&
    profile.dedicatedVramMb < spec.vramMbMin
  ) {
    return { id, status: 'held', reason: `VRAM below ${spec.vramMbMin}MB` }
  }
  if (id === 'FSR') {
    return {
      id,
      status: 'registered',
      reason:
        'Letter ci — FSR spatial executor live (CapScore internal scale → Present); DLSS web HELD; full frameGraphLive HELD',
    }
  }
  return { id, status: 'registered', reason: 'Executor available' }
}

export function resolveActiveNodes(profile: HardwareStaticProfile): ResolvedRenderGraphNode[] {
  const blueprint = getBlueprintForScore(profile.capabilityScore)
  return blueprint.nodes.map((id) => resolveNode(id, profile))
}

const EMPTY_BLUEPRINT = (tier: RenderTier): RenderGraphBlueprint => ({
  tier,
  nodes: [],
})

/**
 * Build SRG report — CapScore gate first; refuse plan when score ignored/mismatched.
 * Score always wins over stale profile.tier; explicit claimedTier must match score.
 * G.3 % stays locked — CapScore deepen does not uplift.
 */
export function buildScalableRenderGraphReport(
  profile: HardwareStaticProfile,
  opts?: {
    ignoreCapabilityScore?: boolean
    /** Explicit marketing/UI claimed tier — must match CapScore or fail-closed. */
    claimedTier?: RenderTier | null
  }
): ScalableRenderGraphReport {
  const heldMarketing = {
    scalableRenderGraphAaaReady: SCALABLE_RENDER_GRAPH_AAA_READY,
    naniteMarketingAllowed: NANITE_MARKETING_ALLOWED,
    lumenMarketingAllowed: LUMEN_MARKETING_ALLOWED,
  }

  const capScoreGate = selectScalableRenderTier({
    capabilityScore: profile.capabilityScore,
    ignoreCapabilityScore: opts?.ignoreCapabilityScore,
    claimedTier: opts?.claimedTier,
  })

  if (!capScoreGate.ok) {
    return {
      generatedAt: new Date().toISOString(),
      capabilityScore: Number.isFinite(profile.capabilityScore) ? profile.capabilityScore : 0,
      tier: profile.tier,
      blueprint: EMPTY_BLUEPRINT(profile.tier),
      nodes: [],
      executableNodeCount: 0,
      frameGraphLive: false,
      fsrExecutorLive: false,
      capScoreGate,
      planAllowed: false,
      g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
      g3PercentUpliftRequiresLadder: G3_PERCENT_UPLIFT_REQUIRES_LADDER,
      claim: `Law XV CapScore gate FAIL_CLOSED (${capScoreGate.rejectCode}) — ScalableRenderGraph plan refused; AAA/Nanite/Lumen HELD; G.3 locked ${G3_CODE_DEPTH_PERCENT_LOCKED}%`,
      ...heldMarketing,
    }
  }

  const gatedProfile: HardwareStaticProfile = {
    ...profile,
    capabilityScore: capScoreGate.capabilityScore,
    tier: capScoreGate.tier,
  }
  const blueprint = getBlueprintForScore(gatedProfile.capabilityScore)
  const nodes = blueprint.nodes.map((id) => resolveNode(id, gatedProfile))
  const executableNodeCount = nodes.filter((n) => n.status === 'registered').length
  const fsrExecutorLive = nodes.some((n) => n.id === 'FSR' && n.status === 'registered')

  return {
    generatedAt: new Date().toISOString(),
    capabilityScore: gatedProfile.capabilityScore,
    tier: gatedProfile.tier,
    blueprint,
    nodes,
    executableNodeCount,
    frameGraphLive: false,
    fsrExecutorLive,
    capScoreGate,
    planAllowed: true,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3PercentUpliftRequiresLadder: G3_PERCENT_UPLIFT_REQUIRES_LADDER,
    claim: fsrExecutorLive
      ? `Law XV blueprint ${gatedProfile.tier} (score ${gatedProfile.capabilityScore}) — CapScore gate PASS; FSR spatial executor [CLOSED letter ci]; remaining nodes [HELD] until 3B.2; DLSS web HELD; AAA/Nanite/Lumen HELD; G.3 code-depth locked ${G3_CODE_DEPTH_PERCENT_LOCKED}% (ladder required)`
      : `Law XV blueprint ${gatedProfile.tier} (score ${gatedProfile.capabilityScore}) — CapScore gate PASS; render nodes [HELD] until desktop frame graph (3B.2); DLSS web HELD; G.3 code-depth locked ${G3_CODE_DEPTH_PERCENT_LOCKED}% (ladder required)`,
    ...heldMarketing,
  }
}
