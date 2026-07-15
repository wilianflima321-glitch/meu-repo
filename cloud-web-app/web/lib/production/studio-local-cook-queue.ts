import type { RuntimeCapabilityKey } from '@/lib/production/ai-quality-orchestrator'
import type { GameAssetQualityTier } from '@/lib/production/game-asset-quality-pipeline'
import { buildRuntimeJobRequest, type RuntimeJobRequest } from '@/lib/production/governed-runtime-jobs'
import { RUNTIME_ENGINE_TOOLCHAIN_REGISTRY } from '@aethel/runtime/runtime-engine-spine'

export type StudioLocalCookStageId =
  | 'preflight'
  | 'provenance'
  | 'normalize-gltf'
  | 'mesh-optimize'
  | 'texture-compress'
  | 'collision-navmesh'
  | 'thumbnail-capture'
  | 'review-packet'

export type StudioLocalCookQueueState = 'blocked' | 'held' | 'captured-planning-only' | 'needs-review'
export type StudioLocalCookToolId = string

/**
 * Which compressor worker pool a stage's native tool dispatch belongs to.
 * Cook & Build Pipeline Stage 1 (Asset Cooker) routes stages with the same
 * `parallelGroup` (see `computeParallelGroups`) to separate Background
 * Workers by this class — e.g. `mesh-optimize` (geometry) and
 * `texture-compress` (image) never contend for the same worker even though
 * both become ready at the same pipeline level.
 */
export type StudioLocalCookCompressorClass = 'geometry' | 'texture' | 'audio' | 'general'

export interface StudioLocalCookStage {
  id: StudioLocalCookStageId
  label: string
  requiredTools: StudioLocalCookToolId[]
  requiredEvidence: string[]
  /** Stage ids that must have already run before this one may be dispatched. */
  dependsOn: StudioLocalCookStageId[]
  compressorClass: StudioLocalCookCompressorClass
}

export interface StudioLocalCookJobRequest {
  assetId: string
  assetName: string
  goal: string
  sourceAssetUri: string
  sourceSha256: string
  sourceFormat: 'glb' | 'gltf' | 'fbx' | 'obj' | 'usd' | 'usdz' | 'blend' | 'unknown'
  currentTier: GameAssetQualityTier
  targetTier: GameAssetQualityTier
  availableTools: StudioLocalCookToolId[]
  evidenceRefs: string[]
  requestedStages?: StudioLocalCookStageId[]
  estimatedCostUsd: number
  estimatedMinutes: number
  requestedByAgent: string
}

export interface StudioLocalCookQueuePlan {
  version: 1
  queue: 'studio-local-cook-queue'
  state: StudioLocalCookQueueState
  executionAllowed: false
  dispatchAllowed: false
  request: StudioLocalCookJobRequest
  stages: StudioLocalCookStage[]
  requiredTools: StudioLocalCookToolId[]
  missingTools: StudioLocalCookToolId[]
  requiredEvidence: string[]
  missingEvidence: string[]
  blockers: string[]
  /** Dependency-leveled dispatch groups — see `computeParallelGroups`. Groups run in array order; stages within a group may dispatch to parallel workers. */
  parallelGroups: StudioLocalCookStageId[][]
  governedJob: RuntimeJobRequest
  queueNote: 'Studio Local cook job captured only. Native execution requires a signed daemon dispatch and separate human approval.'
  nextAction: string
}

const TOOL_IDS = RUNTIME_ENGINE_TOOLCHAIN_REGISTRY.map((tool: any) => tool.id)

const COOK_STAGES: StudioLocalCookStage[] = [
  {
    id: 'preflight',
    label: 'Source preflight and manifest',
    requiredTools: ['gltf-transform'],
    requiredEvidence: ['source asset manifest', 'download hash', 'source sha256'],
    dependsOn: [],
    compressorClass: 'general',
  },
  {
    id: 'provenance',
    label: 'License and provenance check',
    requiredTools: ['gltf-transform'],
    requiredEvidence: ['license/provenance receipt', 'creator/source URL', 'usage rights'],
    dependsOn: ['preflight'],
    compressorClass: 'general',
  },
  {
    id: 'normalize-gltf',
    label: 'Normalize to glTF/GLB runtime source',
    requiredTools: ['gltf-transform', 'blender-headless'],
    requiredEvidence: ['normalized glb manifest', 'unit scale report', 'axis/origin report'],
    dependsOn: ['preflight', 'provenance'],
    compressorClass: 'general',
  },
  {
    id: 'mesh-optimize',
    label: 'Mesh optimization and LOD pass',
    requiredTools: ['meshoptimizer', 'gltf-transform'],
    requiredEvidence: ['retopology or curated mesh receipt', 'LOD0/LOD1/LOD2/LOD3 manifest', 'mesh density report'],
    dependsOn: ['normalize-gltf'],
    compressorClass: 'geometry',
  },
  {
    id: 'texture-compress',
    label: 'PBR texture compression',
    requiredTools: ['ktx-software-basisu', 'gltf-transform'],
    requiredEvidence: ['UV/material validation', 'PBR texture compression report', 'KTX2/Basis output'],
    // Independent of mesh-optimize once the source is normalized — the two
    // dispatch to separate compressor worker pools in the same parallel group.
    dependsOn: ['normalize-gltf'],
    compressorClass: 'texture',
  },
  {
    id: 'collision-navmesh',
    label: 'Collision and navmesh proxy',
    requiredTools: ['recast-detour', 'rapier-physics'],
    requiredEvidence: ['collision/navmesh proxy report', 'walkable surface report', 'physics collider validation'],
    dependsOn: ['mesh-optimize'],
    compressorClass: 'geometry',
  },
  {
    id: 'thumbnail-capture',
    label: 'Review thumbnail and capture',
    requiredTools: ['blender-headless', 'ffmpeg'],
    requiredEvidence: ['final preview frame capture', 'thumbnail render', 'viewport performance trace'],
    dependsOn: ['mesh-optimize', 'texture-compress'],
    compressorClass: 'general',
  },
  {
    id: 'review-packet',
    label: 'Human review packet',
    requiredTools: ['ffmpeg'],
    requiredEvidence: ['human art-direction approval', 'runtime execution evidence', 'rollback plan'],
    dependsOn: ['collision-navmesh', 'thumbnail-capture'],
    compressorClass: 'general',
  },
]

/**
 * Levels the requested stages by dependency depth so the daemon dispatcher
 * (once signed off — this queue only plans, never executes) knows which
 * stages are safe to hand to separate parallel workers. Stages in the same
 * group have no dependency edge between them, so `mesh-optimize` (geometry
 * compressor) and `texture-compress` (image compressor) land in the same
 * group and run side by side instead of serially.
 */
export function computeParallelGroups(stages: StudioLocalCookStage[]): StudioLocalCookStageId[][] {
  const included = new Set(stages.map(stage => stage.id))
  const depth = new Map<StudioLocalCookStageId, number>()

  function depthOf(stage: StudioLocalCookStage): number {
    const cached = depth.get(stage.id)
    if (cached !== undefined) return cached
    const relevantDeps = stage.dependsOn.filter(dep => included.has(dep))
    const maxParentDepth = relevantDeps.reduce((max, depId) => {
      const parent = stages.find(s => s.id === depId)
      return parent ? Math.max(max, depthOf(parent) + 1) : max
    }, 0)
    depth.set(stage.id, maxParentDepth)
    return maxParentDepth
  }

  const groups: StudioLocalCookStageId[][] = []
  for (const stage of stages) {
    const level = depthOf(stage)
    groups[level] = groups[level] || []
    groups[level].push(stage.id)
  }
  return groups.filter((group): group is StudioLocalCookStageId[] => Boolean(group))
}

const TIER_STAGE_MAP: Record<GameAssetQualityTier, StudioLocalCookStageId[]> = {
  'ai-draft': ['preflight', 'provenance'],
  'curated-marketplace': ['preflight', 'provenance', 'normalize-gltf', 'texture-compress'],
  'studio-local-optimized': [
    'preflight',
    'provenance',
    'normalize-gltf',
    'mesh-optimize',
    'texture-compress',
    'collision-navmesh',
    'thumbnail-capture',
    'review-packet',
  ],
  'cloud-render-grade': [
    'preflight',
    'provenance',
    'normalize-gltf',
    'mesh-optimize',
    'texture-compress',
    'collision-navmesh',
    'thumbnail-capture',
    'review-packet',
  ],
}

const TOOL_CAPABILITY_MAP: Partial<Record<StudioLocalCookToolId, RuntimeCapabilityKey>> = {
  'gltf-transform': 'gltfpack',
  meshoptimizer: 'meshoptimizer',
  'ktx-software-basisu': 'ktx2-basis',
  'blender-headless': 'blender-assimp',
  'rapier-physics': 'rapier',
  ffmpeg: 'ffmpeg',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback
}

function pickArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return unique(value.filter((item): item is string => typeof item === 'string'))
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function stagesForRequest(request: StudioLocalCookJobRequest): StudioLocalCookStage[] {
  const requested = request.requestedStages?.length ? request.requestedStages : TIER_STAGE_MAP[request.targetTier]
  const requestedSet = new Set(requested)
  return COOK_STAGES.filter((stage) => requestedSet.has(stage.id))
}

function uniqueRuntimeCapabilities(values: RuntimeCapabilityKey[]): RuntimeCapabilityKey[] {
  return Array.from(new Set(values))
}

function requiredCapabilitiesForTools(tools: string[]): RuntimeCapabilityKey[] {
  return uniqueRuntimeCapabilities(tools.map((tool: any) => TOOL_CAPABILITY_MAP[tool]).filter((tool: any): tool is RuntimeCapabilityKey => Boolean(tool)))
}

function nextActionFor(input: {
  missingTools: string[]
  missingEvidence: string[]
  blockers: string[]
}) {
  if (input.blockers.length > 0) return 'Resolve source, hash, provenance, or budget blockers before preparing native cook dispatch.'
  if (input.missingTools.length > 0) return 'Open Studio Local and install missing cook tools before dispatch.'
  if (input.missingEvidence.length > 0) return 'Attach missing cook evidence before requesting native dispatch approval.'
  return 'Request signed Studio Local dispatch approval; execution is still separate from planning capture.'
}

export function coerceStudioLocalCookJobRequest(input: unknown): StudioLocalCookJobRequest | null {
  if (!isRecord(input)) return null
  const assetId = pickString(input.assetId)
  const assetName = pickString(input.assetName)
  const goal = pickString(input.goal)
  const sourceAssetUri = pickString(input.sourceAssetUri)
  const sourceSha256 = pickString(input.sourceSha256)
  if (!assetId || !assetName || !goal) return null

  const stageIds = COOK_STAGES.map((stage) => stage.id)
  const requestedStages = pickArray(input.requestedStages).filter((stage): stage is StudioLocalCookStageId =>
    stageIds.includes(stage as StudioLocalCookStageId)
  )

  return {
    assetId,
    assetName,
    goal,
    sourceAssetUri,
    sourceSha256,
    sourceFormat: pickEnum(input.sourceFormat, ['glb', 'gltf', 'fbx', 'obj', 'usd', 'usdz', 'blend', 'unknown'] as const, 'unknown'),
    currentTier: pickEnum(input.currentTier, ['ai-draft', 'curated-marketplace', 'studio-local-optimized', 'cloud-render-grade'] as const, 'ai-draft'),
    targetTier: pickEnum(input.targetTier, ['ai-draft', 'curated-marketplace', 'studio-local-optimized', 'cloud-render-grade'] as const, 'studio-local-optimized'),
    availableTools: pickArray(input.availableTools).filter((tool: any) => TOOL_IDS.includes(tool)),
    evidenceRefs: pickArray(input.evidenceRefs),
    requestedStages: requestedStages.length > 0 ? requestedStages : undefined,
    estimatedCostUsd: pickNumber(input.estimatedCostUsd, 0),
    estimatedMinutes: pickNumber(input.estimatedMinutes, 20),
    requestedByAgent: pickString(input.requestedByAgent, 'Studio Local Cook Agent'),
  }
}

export function buildStudioLocalCookQueuePlan(input: {
  request: StudioLocalCookJobRequest
  projectId?: string
  now?: string
}): StudioLocalCookQueuePlan {
  const stages = stagesForRequest(input.request)
  const requiredTools = unique(stages.flatMap((stage) => stage.requiredTools))
  const requiredEvidence = unique(stages.flatMap((stage) => stage.requiredEvidence))
  const evidence = new Set(input.request.evidenceRefs)
  const missingTools = requiredTools.filter((tool: any) => !input.request.availableTools.includes(tool))
  const missingEvidence = requiredEvidence.filter((item) => !evidence.has(item))
  const blockers = unique([
    ...(input.request.sourceAssetUri ? [] : ['Source asset URI is required before Studio Local cook can be prepared.']),
    ...(input.request.sourceSha256 ? [] : ['Source SHA-256 is required before native cook dispatch.']),
    ...(input.request.estimatedCostUsd > 50 ? ['Cook estimate exceeds the default approval budget.'] : []),
    ...(input.request.currentTier === 'ai-draft' && !evidence.has('license/provenance receipt')
      ? ['AI draft source needs license/provenance receipt before cook dispatch.']
      : []),
  ])
  const state: StudioLocalCookQueueState =
    blockers.length > 0 ? 'blocked' : missingTools.length > 0 || missingEvidence.length > 0 ? 'held' : 'captured-planning-only'
  const runtimeCapabilityStatus = state === 'captured-planning-only' ? 'available' : state
  const governedJob = buildRuntimeJobRequest({
    id: `studio-local-cook-${input.request.assetId}-${input.now ?? new Date().toISOString()}`,
    kind: 'asset-import',
    projectId: input.projectId,
    requestedRuntimeTarget: 'local-native',
    runtimeCapabilityStatus,
    requestedByAgent: input.request.requestedByAgent,
    reason: `Cook ${input.request.assetName} for ${input.request.targetTier}: ${input.request.goal}`,
    requiredCapabilities: uniqueRuntimeCapabilities(['studio-local', ...requiredCapabilitiesForTools(requiredTools)]),
    requiredEvidence: unique([...requiredEvidence, 'signed Studio Local dispatch approval', 'human art-direction approval']),
    evidenceRefs: input.request.evidenceRefs,
    blockers: unique([
      ...blockers,
      ...missingTools.map((tool) => `Missing Studio Local cook tool: ${tool}`),
      ...missingEvidence.map((item) => `Missing cook evidence: ${item}`),
      'Native execution requires signed Studio Local daemon dispatch.',
    ]),
    estimatedCostUsd: input.request.estimatedCostUsd,
    estimatedMinutes: input.request.estimatedMinutes,
    rollbackPlan: `Keep ${input.request.assetName} on the last approved cooked bundle and preserve the source manifest for audit.`,
    approvedForQueue: false,
    now: input.now,
  })

  return {
    version: 1,
    queue: 'studio-local-cook-queue',
    state,
    executionAllowed: false,
    dispatchAllowed: false,
    request: input.request,
    stages,
    requiredTools,
    missingTools,
    requiredEvidence,
    missingEvidence,
    blockers,
    parallelGroups: computeParallelGroups(stages),
    governedJob: {
      ...governedJob,
      executionAllowed: false,
      humanReviewRequired: true,
    },
    queueNote: 'Studio Local cook job captured only. Native execution requires a signed daemon dispatch and separate human approval.',
    nextAction: nextActionFor({ missingTools, missingEvidence, blockers }),
  }
}
