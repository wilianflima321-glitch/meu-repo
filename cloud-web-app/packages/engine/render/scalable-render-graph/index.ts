/**
 * Law XV — Scalable Render Graph blueprint registry.
 * Spec §3.4 — nodes are registered with honest execution status.
 * Block 3B.1 CORE: planner + letter ci FSR spatial executor.
 * Full frame graph (GBuffer/RT/SSR/…) remains HELD until 3B.2.
 */

import type { HardwareStaticProfile, RenderTier } from '../hardware-profile'
import { tierFromCapabilityScore } from '../hardware-profile'

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

export function buildScalableRenderGraphReport(
  profile: HardwareStaticProfile
): ScalableRenderGraphReport {
  const blueprint = getBlueprintForScore(profile.capabilityScore)
  const nodes = resolveActiveNodes(profile)
  const executableNodeCount = nodes.filter((n) => n.status === 'registered').length
  const fsrExecutorLive = nodes.some((n) => n.id === 'FSR' && n.status === 'registered')

  return {
    generatedAt: new Date().toISOString(),
    capabilityScore: profile.capabilityScore,
    tier: profile.tier,
    blueprint,
    nodes,
    executableNodeCount,
    frameGraphLive: false,
    fsrExecutorLive,
    claim: fsrExecutorLive
      ? `Law XV blueprint ${profile.tier} (score ${profile.capabilityScore}) — FSR spatial executor [CLOSED letter ci]; remaining nodes [HELD] until 3B.2; DLSS web HELD`
      : `Law XV blueprint ${profile.tier} (score ${profile.capabilityScore}) — render nodes [HELD] until desktop frame graph (3B.2)`,
  }
}
