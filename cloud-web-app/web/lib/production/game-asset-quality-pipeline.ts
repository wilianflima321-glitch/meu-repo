import type { ProductionRuntimeTarget } from '@/lib/production/agentic-production-state'

export type GameAssetQualityTier = 'ai-draft' | 'curated-marketplace' | 'studio-local-optimized' | 'cloud-render-grade'
export type GameAssetDomain = 'character' | 'creature' | 'environment' | 'prop' | 'weapon' | 'vehicle' | 'vfx' | 'audio' | 'cinematic'
export type GameAssetPipelineStageState = 'required' | 'held' | 'optional'
export type AssetFinalClaimState = 'blocked' | 'needs-review'

export interface GameAssetQualityStage {
  id: string
  label: string
  state: GameAssetPipelineStageState
  target: 'browser' | 'studio-local' | 'cloud-stream' | 'human-review'
  evidence: string[]
  blockers: string[]
}

export interface GameAssetQualityLane {
  tier: GameAssetQualityTier
  label: string
  maxPreviewTriangles: number
  maxHeroTriangles: number
  textureBudget: string
  runtimeTargets: ProductionRuntimeTarget[]
  recommendedFor: GameAssetDomain[]
  requiredStages: string[]
  honestLimitations: string[]
}

export interface GameAssetQualityPipeline {
  id: 'game-asset-quality-pipeline:v1'
  noTenKMeshAsFinalClaim: true
  browserIsPreviewOnlyForHeroAssets: true
  requiresLicenseAndProvenance: true
  requiresHumanArtDirectionForPremiumClaims: true
  acquisitionLanes: string[]
  sidecarDependencies: string[]
  stages: GameAssetQualityStage[]
  lanes: GameAssetQualityLane[]
  releaseBlockers: string[]
}

export const GAME_ASSET_QUALITY_REQUIRED_EVIDENCE = [
  'art direction board',
  'license/provenance receipt',
  'source asset manifest',
  'retopology or curated mesh receipt',
  'UV/material validation',
  'PBR texture compression report',
  'LOD0/LOD1/LOD2/LOD3 manifest',
  'collision/navmesh proxy report',
  'rig/animation validation when character or creature',
  'viewport performance trace',
  'human art-direction approval',
] as const

const REQUIRED_STAGES: GameAssetQualityStage[] = [
  {
    id: 'reference-and-style-lock',
    label: 'Reference and style lock',
    state: 'required',
    target: 'human-review',
    evidence: ['art direction board', 'style tokens', 'silhouette sheet'],
    blockers: ['No premium generation without an approved visual target.'],
  },
  {
    id: 'provenance-and-license',
    label: 'Provenance and license',
    state: 'required',
    target: 'human-review',
    evidence: ['license/provenance receipt', 'creator/source URL', 'usage rights'],
    blockers: ['Unverified assets cannot enter marketplace, public demo, or client delivery.'],
  },
  {
    id: 'source-acquisition',
    label: 'Source acquisition',
    state: 'required',
    target: 'cloud-stream',
    evidence: ['source asset manifest', 'generation seed or marketplace asset ID', 'download hash'],
    blockers: ['10k polygon AI output is draft-only until upgraded or replaced by curated source assets.'],
  },
  {
    id: 'retopo-and-mesh-upgrade',
    label: 'Retopology and mesh upgrade',
    state: 'required',
    target: 'studio-local',
    evidence: ['retopology or curated mesh receipt', 'mesh density report', 'normal/tangent validation'],
    blockers: ['Final hero assets need curated topology, not raw text-to-3D output.'],
  },
  {
    id: 'pbr-material-pass',
    label: 'PBR material pass',
    state: 'required',
    target: 'studio-local',
    evidence: ['UV/material validation', 'PBR texture compression report', 'KTX2/Basis output'],
    blockers: ['Flat generated materials cannot be called production quality.'],
  },
  {
    id: 'lod-collision-streaming',
    label: 'LOD, collision, and streaming',
    state: 'required',
    target: 'studio-local',
    evidence: ['LOD0/LOD1/LOD2/LOD3 manifest', 'collision/navmesh proxy report', 'streaming budget'],
    blockers: ['Large worlds require LODs and streaming budgets before browser preview.'],
  },
  {
    id: 'animation-and-gameplay-fit',
    label: 'Animation and gameplay fit',
    state: 'required',
    target: 'studio-local',
    evidence: ['rig/animation validation when character or creature', 'hitbox/camera pass', 'controller feel note'],
    blockers: ['Characters and creatures are blocked until rig, animation, and gameplay fit are proven.'],
  },
  {
    id: 'render-and-performance-proof',
    label: 'Render and performance proof',
    state: 'required',
    target: 'cloud-stream',
    evidence: ['viewport performance trace', 'VRAM budget', 'final preview frame capture'],
    blockers: ['Quality claims require runtime evidence on Browser, Studio Local, or Cloud Stream.'],
  },
]

const LANES: GameAssetQualityLane[] = [
  {
    tier: 'ai-draft',
    label: 'AI draft mesh',
    maxPreviewTriangles: 10_000,
    maxHeroTriangles: 25_000,
    textureBudget: '1K-2K draft textures',
    runtimeTargets: ['local-main-safe'],
    recommendedFor: ['prop', 'vfx'],
    requiredStages: ['reference-and-style-lock', 'provenance-and-license', 'source-acquisition'],
    honestLimitations: ['Good for ideation and blockout, not final hero assets or marketplace claims.'],
  },
  {
    tier: 'curated-marketplace',
    label: 'Curated marketplace or library asset',
    maxPreviewTriangles: 250_000,
    maxHeroTriangles: 750_000,
    textureBudget: '2K-4K PBR, compressed per target',
    runtimeTargets: ['local-main-safe', 'local-native'],
    recommendedFor: ['character', 'creature', 'environment', 'prop', 'weapon', 'vehicle'],
    requiredStages: ['reference-and-style-lock', 'provenance-and-license', 'source-acquisition', 'pbr-material-pass', 'lod-collision-streaming'],
    honestLimitations: ['Quality depends on license, source topology, and optimization evidence.'],
  },
  {
    tier: 'studio-local-optimized',
    label: 'Studio Local optimized production asset',
    maxPreviewTriangles: 500_000,
    maxHeroTriangles: 2_000_000,
    textureBudget: '4K-8K source, KTX2/Basis runtime sets',
    runtimeTargets: ['local-native'],
    recommendedFor: ['character', 'creature', 'environment', 'cinematic'],
    requiredStages: REQUIRED_STAGES.map((stage) => stage.id),
    honestLimitations: ['Requires local sidecars for mesh processing, texture compression, animation validation, and performance traces.'],
  },
  {
    tier: 'cloud-render-grade',
    label: 'Cloud render grade asset',
    maxPreviewTriangles: 1_000_000,
    maxHeroTriangles: 10_000_000,
    textureBudget: '8K source with delivery LODs',
    runtimeTargets: ['cloud-sandbox'],
    recommendedFor: ['cinematic', 'environment', 'character', 'creature'],
    requiredStages: REQUIRED_STAGES.map((stage) => stage.id),
    honestLimitations: ['Use for final shots or client demos; not the default browser editing path due to cost and latency.'],
  },
]

export function buildGameAssetQualityPipeline(): GameAssetQualityPipeline {
  return {
    id: 'game-asset-quality-pipeline:v1',
    noTenKMeshAsFinalClaim: true,
    browserIsPreviewOnlyForHeroAssets: true,
    requiresLicenseAndProvenance: true,
    requiresHumanArtDirectionForPremiumClaims: true,
    acquisitionLanes: [
      'AI draft generation for ideation/blockout (Meshy/Tripo clay only)',
      'Letter bw game-ready refine conveyor: retopo → LOD → UV → rig → Radiance PBR → collider → critic → AethelPack',
      'Curated marketplace or licensed library import for hero assets',
      'Kitbash from verified source packs',
      'Studio Local sidecar optimization for mesh, material, LOD, collision, and animation proof',
      'Cloud Stream or render farm for final cinematic review when configured',
    ],
    sidecarDependencies: [
      'Blender/Assimp import lane',
      'meshoptimizer/gltfpack simplification',
      'KTX2/Basis texture compression',
      'DXC/WGSL shader validation',
      'Rapier collision proxy generation',
      'FFmpeg capture and review output',
      'license/provenance scanner',
    ],
    stages: REQUIRED_STAGES,
    lanes: LANES,
    releaseBlockers: [
      'Raw 10k text-to-3D output used as final hero asset',
      'Missing license/provenance receipt',
      'No LOD/collision/streaming manifest for world assets',
      'No performance trace on selected runtime target',
      'No human art-direction approval for premium or client-facing claims',
    ],
  }
}

export function evaluateGameAssetQualityReadiness(input: {
  tier: GameAssetQualityTier
  evidenceRefs: string[]
}): { state: 'held' | 'needs-review'; missingEvidence: string[]; nextAction: string } {
  const pipeline = buildGameAssetQualityPipeline()
  const lane = pipeline.lanes.find((candidate) => candidate.tier === input.tier)
  const evidence = new Set(input.evidenceRefs)
  const requiredEvidence = pipeline.stages
    .filter((stage) => lane?.requiredStages.includes(stage.id))
    .flatMap((stage) => stage.evidence)
  const missingEvidence = requiredEvidence.filter((required) => !evidence.has(required))

  return {
    state: missingEvidence.length > 0 ? 'held' : 'needs-review',
    missingEvidence,
    nextAction:
      missingEvidence.length > 0
        ? 'Attach asset quality evidence before agents can upgrade the asset lane.'
        : 'Request human art-direction approval before premium/public claims.',
  }
}

export function evaluateAssetFinalClaimReadiness(input: {
  currentTier: GameAssetQualityTier
  evidenceRefs: string[]
  humanApproved?: boolean
}): {
  state: AssetFinalClaimState
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
  humanReviewRequired: true
} {
  const evidence = new Set(input.evidenceRefs)
  const missingEvidence = GAME_ASSET_QUALITY_REQUIRED_EVIDENCE.filter((required) => !evidence.has(required))
  const blockers = [
    ...(input.currentTier === 'ai-draft' ? ['AI draft assets are never final; upgrade through curated or Studio Local lanes first.'] : []),
    ...missingEvidence.map((item) => `Missing final evidence: ${item}`),
    ...(input.humanApproved === true ? [] : ['Human art-direction approval is required before final/public claims.']),
  ]

  return {
    state: blockers.length > 0 ? 'blocked' : 'needs-review',
    missingEvidence,
    blockers,
    nextAction:
      blockers.length > 0
        ? 'Complete provenance, LOD/PBR/collision/performance evidence and request human review before final claims.'
        : 'Final claim can enter human release review; do not auto-publish.',
    humanReviewRequired: true,
  }
}
