import { RUNTIME_ENGINE_TOOLCHAIN_REGISTRY } from './runtime-engine-spine'

export type AethelToolchainLaneId =
  | 'apps-production'
  | 'research-intelligence'
  | 'game-prototype'
  | 'game-vertical-slice'
  | 'complete-game-plan'
  | 'film-cinematic'
  | 'asset-finalization'
  | 'cloud-stream'
  | 'studio-local-release'
  | 'marketplace-provenance'

export type AethelDependencyKind =
  | 'npm-runtime'
  | 'native-tool'
  | 'external-service'
  | 'cloud-provider'
  | 'human-process'

export type AethelDependencyCriticality = 'required' | 'recommended' | 'optional' | 'held-by-design'
export type AethelProductionDepth = 'prototype' | 'demo' | 'vertical-slice' | 'complete-game-plan' | 'release'
export type AethelLaneStatus = 'ready' | 'held' | 'blocked'

export interface AethelToolchainDependency {
  id: string
  label: string
  kind: AethelDependencyKind
  criticality: AethelDependencyCriticality
  requiredFor: AethelProductionDepth[]
  policy: 'manual-consent-only' | 'env-config-required' | 'human-approval-required' | 'package-managed'
  evidence: string[]
}

export interface AethelToolchainLane {
  id: AethelToolchainLaneId
  label: string
  userOutcome: string
  maxHonestClaim: string
  minimumDepth: AethelProductionDepth
  dependencies: AethelToolchainDependency[]
  requiredEvidence: string[]
  blockersWhenMissing: string[]
}

export interface AethelToolchainDependencyMatrixInput {
  laneIds?: AethelToolchainLaneId[]
  installedNativeToolIds?: string[]
  configuredServiceIds?: string[]
  availablePackageIds?: string[]
  approvedHumanProcessIds?: string[]
}

export interface AethelToolchainLaneReadiness {
  laneId: AethelToolchainLaneId
  status: AethelLaneStatus
  missingDependencies: string[]
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
  maxHonestClaim: string
}

export interface AethelToolchainDependencyMatrix {
  version: 1
  lanes: AethelToolchainLaneReadiness[]
  requiredNativeTools: string[]
  configuredServices: string[]
  packageDependencies: string[]
  humanProcessDependencies: string[]
  blockers: string[]
  nextAction: string
}

const REQUIRED_FINAL_ASSET_EVIDENCE = [
  'license/provenance receipt',
  'creator/source URL',
  'usage rights',
  'source sha256',
  'LOD0/LOD1/LOD2/LOD3 manifest',
  'mesh density report',
  'UV/material validation',
  'PBR texture compression report',
  'collision/navmesh proxy report',
  'viewport performance trace',
  'runtime execution evidence',
  'human art-direction approval',
]

const APP_RELEASE_EVIDENCE = [
  'route contracts pass',
  'typecheck pass',
  'lint pass',
  'preview runtime readiness',
  'rollback plan',
  'human release approval',
]

const RESEARCH_EVIDENCE = [
  'source URLs/dates captured',
  'confidence score',
  'contradiction check',
  'browser replay evidence',
  'human approval for weak claims',
]

function dep(input: AethelToolchainDependency): AethelToolchainDependency {
  return input
}

const NPM_DEPS = {
  next: dep({
    id: 'next',
    label: 'Next.js App Router',
    kind: 'npm-runtime',
    criticality: 'required',
    requiredFor: ['prototype', 'demo', 'vertical-slice', 'release'],
    policy: 'package-managed',
    evidence: ['typecheck pass', 'route contracts pass'],
  }),
  prisma: dep({
    id: '@prisma/client',
    label: 'Prisma persistence',
    kind: 'npm-runtime',
    criticality: 'required',
    requiredFor: ['demo', 'vertical-slice', 'release'],
    policy: 'package-managed',
    evidence: ['migration applied', 'data rollback plan'],
  }),
  stripe: dep({
    id: 'stripe',
    label: 'Stripe billing and marketplace payouts',
    kind: 'npm-runtime',
    criticality: 'required',
    requiredFor: ['release'],
    policy: 'env-config-required',
    evidence: ['webhook signature verification', 'billing readiness check'],
  }),
  sentry: dep({
    id: '@sentry/nextjs',
    label: 'Sentry observability',
    kind: 'npm-runtime',
    criticality: 'recommended',
    requiredFor: ['release'],
    policy: 'env-config-required',
    evidence: ['error capture configured', 'release trace sample'],
  }),
  yjs: dep({
    id: 'yjs',
    label: 'Yjs collaboration and offline editing',
    kind: 'npm-runtime',
    criticality: 'recommended',
    requiredFor: ['demo', 'vertical-slice'],
    policy: 'package-managed',
    evidence: ['offline collaboration smoke test'],
  }),
  three: dep({
    id: 'three',
    label: 'Three.js browser preview renderer',
    kind: 'npm-runtime',
    criticality: 'required',
    requiredFor: ['prototype', 'demo'],
    policy: 'package-managed',
    evidence: ['preview rendering smoke test', 'bundle boundary pass'],
  }),
  monaco: dep({
    id: 'monaco-editor',
    label: 'Monaco IDE editor',
    kind: 'npm-runtime',
    criticality: 'required',
    requiredFor: ['prototype', 'demo', 'vertical-slice'],
    policy: 'package-managed',
    evidence: ['IDE lazy-load boundary pass'],
  }),
}

const SERVICES = {
  aiProvider: dep({
    id: 'ai-provider',
    label: 'LLM provider routing',
    kind: 'external-service',
    criticality: 'required',
    requiredFor: ['prototype', 'demo', 'vertical-slice', 'complete-game-plan', 'release'],
    policy: 'env-config-required',
    evidence: ['provider status check', 'rate-limit guard'],
  }),
  objectStorage: dep({
    id: 'object-storage',
    label: 'Versioned asset object storage',
    kind: 'cloud-provider',
    criticality: 'required',
    requiredFor: ['vertical-slice', 'release'],
    policy: 'env-config-required',
    evidence: ['asset upload receipt', 'source sha256'],
  }),
  pixelStream: dep({
    id: 'pixel-stream-url',
    label: 'Cloud Stream signaling URL',
    kind: 'external-service',
    criticality: 'held-by-design',
    requiredFor: ['vertical-slice', 'release'],
    policy: 'env-config-required',
    evidence: ['session teardown evidence', 'cost per minute visible', 'signaling health check'],
  }),
}

const HUMAN = {
  artDirection: dep({
    id: 'human-art-direction-approval',
    label: 'Human art-direction approval',
    kind: 'human-process',
    criticality: 'required',
    requiredFor: ['vertical-slice', 'release'],
    policy: 'human-approval-required',
    evidence: ['human art-direction approval'],
  }),
  releaseApproval: dep({
    id: 'human-release-approval',
    label: 'Human release approval',
    kind: 'human-process',
    criticality: 'required',
    requiredFor: ['release'],
    policy: 'human-approval-required',
    evidence: ['human release approval'],
  }),
  engineLicense: dep({
    id: 'target-engine-license-confirmation',
    label: 'External engine license confirmation',
    kind: 'human-process',
    criticality: 'held-by-design',
    requiredFor: ['vertical-slice', 'release'],
    policy: 'human-approval-required',
    evidence: ['target engine license confirmation', 'manual consent receipt'],
  }),
}

function nativeTool(id: string, criticality: AethelDependencyCriticality, requiredFor: AethelProductionDepth[]): AethelToolchainDependency {
  const tool = RUNTIME_ENGINE_TOOLCHAIN_REGISTRY.find((entry) => entry.id === id)
  return dep({
    id,
    label: tool?.label ?? id,
    kind: 'native-tool',
    criticality,
    requiredFor,
    policy: 'manual-consent-only',
    evidence: ['sha256 digest before execution', 'fresh Studio Local capability probe'],
  })
}

export const AETHEL_TOOLCHAIN_LANES: AethelToolchainLane[] = [
  {
    id: 'apps-production',
    label: 'Apps and SaaS production',
    userOutcome: 'Ship a real app with auth, billing, deploy readiness, observability, and rollback evidence.',
    maxHonestClaim: 'production-ready app workflow when release evidence and human approval are present',
    minimumDepth: 'release',
    dependencies: [NPM_DEPS.next, NPM_DEPS.prisma, NPM_DEPS.stripe, NPM_DEPS.sentry, NPM_DEPS.yjs, SERVICES.aiProvider, HUMAN.releaseApproval],
    requiredEvidence: APP_RELEASE_EVIDENCE,
    blockersWhenMissing: ['Do not claim app release readiness without route, deploy, billing, observability, and approval evidence.'],
  },
  {
    id: 'research-intelligence',
    label: 'Advanced research and Manus-style evidence',
    userOutcome: 'Produce source-grounded research with plan, browser replay, artifacts, confidence, contradictions, and delivery evidence.',
    maxHonestClaim: 'auditable research workspace with human-reviewed weak claims',
    minimumDepth: 'demo',
    dependencies: [SERVICES.aiProvider, NPM_DEPS.next, HUMAN.releaseApproval],
    requiredEvidence: RESEARCH_EVIDENCE,
    blockersWhenMissing: ['Do not publish research claims without source dates, confidence, contradictions, and review evidence.'],
  },
  {
    id: 'game-prototype',
    label: 'Game prototype',
    userOutcome: 'Create a fast playable prototype with scoped mechanics, browser preview, and honest draft asset quality.',
    maxHonestClaim: 'playable prototype, not final art or production runtime',
    minimumDepth: 'prototype',
    dependencies: [NPM_DEPS.three, SERVICES.aiProvider, nativeTool('gltf-transform', 'recommended', ['prototype', 'demo'])],
    requiredEvidence: ['scope selection', 'notFullGameClaim: true', 'draft asset disclaimer', 'basic playtest note'],
    blockersWhenMissing: ['Draft assets are not final; prototype quality cannot be marketed as production art.'],
  },
  {
    id: 'game-vertical-slice',
    label: 'Game vertical slice',
    userOutcome: 'Produce a small, playable, performance-traced slice with curated assets, LOD/PBR, collision, navmesh, bots, and review holds.',
    maxHonestClaim: 'governed vertical slice when playtest, asset quality, and human review evidence exist',
    minimumDepth: 'vertical-slice',
    dependencies: [
      NPM_DEPS.three,
      SERVICES.aiProvider,
      SERVICES.objectStorage,
      nativeTool('gltf-transform', 'required', ['vertical-slice']),
      nativeTool('meshoptimizer', 'required', ['vertical-slice']),
      nativeTool('ktx-software-basisu', 'required', ['vertical-slice']),
      nativeTool('blender-headless', 'required', ['vertical-slice']),
      nativeTool('recast-detour', 'required', ['vertical-slice']),
      nativeTool('rapier-physics', 'required', ['vertical-slice']),
      nativeTool('ffmpeg', 'required', ['vertical-slice']),
      HUMAN.artDirection,
    ],
    requiredEvidence: [...REQUIRED_FINAL_ASSET_EVIDENCE, 'bot playtest replay', 'frame-time performance trace', 'release hold'],
    blockersWhenMissing: ['Do not claim final game quality until LOD/PBR/collision/navmesh/perf/playtest and human review evidence exist.'],
  },
  {
    id: 'complete-game-plan',
    label: 'Complete game plan',
    userOutcome: 'Plan the full game: bible, scope, scenes, systems, asset backlog, risks, cost, and phased production without claiming it is built.',
    maxHonestClaim: 'complete-game-plan, not a complete playable shipped game',
    minimumDepth: 'complete-game-plan',
    dependencies: [SERVICES.aiProvider, NPM_DEPS.prisma, HUMAN.releaseApproval],
    requiredEvidence: ['deep production bible', 'scope cuts', 'milestone plan', 'content backlog', 'notFullGameClaim: true', 'release hold'],
    blockersWhenMissing: ['Do not say complete game is ready; this lane produces an auditable production plan.'],
  },
  {
    id: 'film-cinematic',
    label: 'Film and cinematic production',
    userOutcome: 'Produce shots, timelines, voice/music cues, render packets, and playback evidence with no fake final video.',
    maxHonestClaim: 'cinematic review packet when render backend and playback evidence exist',
    minimumDepth: 'vertical-slice',
    dependencies: [
      SERVICES.aiProvider,
      nativeTool('blender-headless', 'required', ['vertical-slice']),
      nativeTool('ffmpeg', 'required', ['vertical-slice']),
      nativeTool('openusd-tools', 'recommended', ['vertical-slice']),
      SERVICES.pixelStream,
      HUMAN.artDirection,
    ],
    requiredEvidence: ['shot list', 'storyboard frames', 'audio cue sheet', 'performance report', 'validation report', 'playback evidence'],
    blockersWhenMissing: ['No manifest-only cinematic output can be marked final without playback and validation evidence.'],
  },
  {
    id: 'asset-finalization',
    label: 'Asset finalization',
    userOutcome: 'Upgrade assets beyond 10k-poly AI draft into curated, optimized, traceable runtime assets.',
    maxHonestClaim: 'ready for art-direction review, never final without human approval',
    minimumDepth: 'vertical-slice',
    dependencies: [
      nativeTool('gltf-transform', 'required', ['vertical-slice', 'release']),
      nativeTool('meshoptimizer', 'required', ['vertical-slice', 'release']),
      nativeTool('ktx-software-basisu', 'required', ['vertical-slice', 'release']),
      nativeTool('blender-headless', 'required', ['vertical-slice', 'release']),
      nativeTool('recast-detour', 'recommended', ['vertical-slice', 'release']),
      nativeTool('rapier-physics', 'recommended', ['vertical-slice', 'release']),
      HUMAN.artDirection,
    ],
    requiredEvidence: [...REQUIRED_FINAL_ASSET_EVIDENCE, 'signed Studio Local daemon dispatch', 'rollback plan'],
    blockersWhenMissing: ['AI-generated meshes stay draft until provenance, LOD, PBR, collision/navmesh, performance trace, and human review exist.'],
  },
  {
    id: 'cloud-stream',
    label: 'Cloud Stream runtime',
    userOutcome: 'Stream high-end renderer sessions only when signaling, cost, teardown, and session evidence are configured.',
    maxHonestClaim: 'available Cloud Stream session only with configured signaling URL and cost controls',
    minimumDepth: 'vertical-slice',
    dependencies: [SERVICES.pixelStream, SERVICES.objectStorage, HUMAN.releaseApproval],
    requiredEvidence: ['signaling health check', 'cost per minute visible', 'session teardown evidence', 'stream recording evidence'],
    blockersWhenMissing: ['Cloud Stream remains held when URL, cost, teardown, or session evidence is missing.'],
  },
  {
    id: 'studio-local-release',
    label: 'Studio Local release',
    userOutcome: 'Distribute the desktop runtime only when CI, signing, updater, install proof, and rollback evidence are present.',
    maxHonestClaim: 'beta desktop runtime until signed installers and notarization evidence exist',
    minimumDepth: 'release',
    dependencies: [nativeTool('ffmpeg', 'required', ['release']), nativeTool('zig-toolchain', 'recommended', ['release']), HUMAN.releaseApproval],
    requiredEvidence: ['3-OS CI build', 'signed installer evidence', 'notarization evidence', 'updater signature', 'rollback plan'],
    blockersWhenMissing: ['Do not claim installer signed while signing, notarization, or updater evidence is held.'],
  },
  {
    id: 'marketplace-provenance',
    label: 'Marketplace provenance',
    userOutcome: 'Install or sell assets/plugins only with permissions, license, provenance, risk, rollback, and creator payout evidence.',
    maxHonestClaim: 'reviewable marketplace install, not public trust unless provenance is complete',
    minimumDepth: 'release',
    dependencies: [NPM_DEPS.stripe, SERVICES.objectStorage, HUMAN.releaseApproval],
    requiredEvidence: ['permission manifest', 'license/provenance receipt', 'rollback plan', 'creator payout readiness', 'risk review'],
    blockersWhenMissing: ['Do not simulate public marketplace install without provenance, permission, rollback, and payout evidence.'],
  },
]

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function hasDependency(input: {
  dependency: AethelToolchainDependency
  nativeTools: Set<string>
  services: Set<string>
  packages: Set<string>
  humanProcesses: Set<string>
}): boolean {
  if (input.dependency.kind === 'native-tool') return input.nativeTools.has(input.dependency.id)
  if (input.dependency.kind === 'external-service' || input.dependency.kind === 'cloud-provider') return input.services.has(input.dependency.id)
  if (input.dependency.kind === 'npm-runtime') return input.packages.has(input.dependency.id)
  return input.humanProcesses.has(input.dependency.id)
}

function nextActionFor(lane: AethelToolchainLane, missingDependencies: string[], missingEvidence: string[]): string {
  if (missingDependencies.length > 0) {
    return `Resolve ${missingDependencies[0]} for ${lane.label}; keep the lane held until dependency evidence is present.`
  }
  if (missingEvidence.length > 0) {
    return `Attach ${missingEvidence[0]} for ${lane.label}; do not upgrade the claim yet.`
  }
  return `${lane.label} can proceed to the next governed step while preserving human review and evidence capture.`
}

export function buildAethelToolchainDependencyMatrix(
  input: AethelToolchainDependencyMatrixInput = {}
): AethelToolchainDependencyMatrix {
  const nativeTools = new Set(input.installedNativeToolIds ?? [])
  const services = new Set(input.configuredServiceIds ?? [])
  const packages = new Set(input.availablePackageIds ?? Object.values(NPM_DEPS).map((dependency) => dependency.id))
  const humanProcesses = new Set(input.approvedHumanProcessIds ?? [])
  const selectedLaneIds = new Set(input.laneIds ?? AETHEL_TOOLCHAIN_LANES.map((lane) => lane.id))

  const lanes = AETHEL_TOOLCHAIN_LANES.filter((lane) => selectedLaneIds.has(lane.id)).map((lane) => {
    const missingDependencies = lane.dependencies
      .filter((dependency) => dependency.criticality === 'required' || dependency.criticality === 'held-by-design')
      .filter((dependency) => !hasDependency({ dependency, nativeTools, services, packages, humanProcesses }))
      .map((dependency) => dependency.id)
    const missingEvidence = unique(lane.requiredEvidence.filter((evidence) => !humanProcesses.has(evidence) && !services.has(evidence)))
    const blockers = unique([
      ...missingDependencies.map((dependency) => `Missing dependency: ${dependency}`),
      ...(missingEvidence.length > 0 ? lane.blockersWhenMissing : []),
    ])
    const status: AethelLaneStatus = blockers.length === 0 ? 'ready' : missingDependencies.length > 0 ? 'blocked' : 'held'

    return {
      laneId: lane.id,
      status,
      missingDependencies,
      missingEvidence,
      blockers,
      nextAction: nextActionFor(lane, missingDependencies, missingEvidence),
      maxHonestClaim: lane.maxHonestClaim,
    }
  })
  const blockers = unique(lanes.flatMap((lane) => lane.blockers.map((blocker) => `${lane.laneId}: ${blocker}`)))

  return {
    version: 1,
    lanes,
    requiredNativeTools: unique(
      AETHEL_TOOLCHAIN_LANES.flatMap((lane) => lane.dependencies)
        .filter((dependency) => dependency.kind === 'native-tool')
        .map((dependency) => dependency.id)
    ),
    configuredServices: unique(
      AETHEL_TOOLCHAIN_LANES.flatMap((lane) => lane.dependencies)
        .filter((dependency) => dependency.kind === 'external-service' || dependency.kind === 'cloud-provider')
        .map((dependency) => dependency.id)
    ),
    packageDependencies: unique(
      AETHEL_TOOLCHAIN_LANES.flatMap((lane) => lane.dependencies)
        .filter((dependency) => dependency.kind === 'npm-runtime')
        .map((dependency) => dependency.id)
    ),
    humanProcessDependencies: unique(
      AETHEL_TOOLCHAIN_LANES.flatMap((lane) => lane.dependencies)
        .filter((dependency) => dependency.kind === 'human-process')
        .map((dependency) => dependency.id)
    ),
    blockers,
    nextAction:
      blockers.length > 0
        ? 'Keep missing lanes held; install/probe tools manually, configure services, and attach evidence before making stronger claims.'
        : 'All selected lanes have their modeled dependencies; continue with execution evidence and human review gates.',
  }
}

export function validateAethelToolchainDependencyMap(lanes: AethelToolchainLane[] = AETHEL_TOOLCHAIN_LANES): string[] {
  const failures: string[] = []
  const registryIds = new Set(RUNTIME_ENGINE_TOOLCHAIN_REGISTRY.map((tool) => tool.id))
  const seenLaneIds = new Set<string>()

  for (const lane of lanes) {
    if (seenLaneIds.has(lane.id)) failures.push(`${lane.id}: duplicate lane id`)
    seenLaneIds.add(lane.id)
    if (lane.dependencies.length === 0) failures.push(`${lane.id}: dependencies are required`)
    if (lane.requiredEvidence.length === 0) failures.push(`${lane.id}: required evidence is required`)
    if (lane.blockersWhenMissing.length === 0) failures.push(`${lane.id}: blocker copy is required`)
    for (const dependency of lane.dependencies) {
      if (dependency.kind === 'native-tool' && !registryIds.has(dependency.id)) {
        failures.push(`${lane.id}: native tool ${dependency.id} is not in runtime registry`)
      }
      if (dependency.kind === 'native-tool' && dependency.policy !== 'manual-consent-only') {
        failures.push(`${lane.id}: native tool ${dependency.id} must be manual-consent-only`)
      }
      if (dependency.evidence.length === 0) failures.push(`${lane.id}: dependency ${dependency.id} needs evidence`)
    }
  }

  const assetFinalization = lanes.find((lane) => lane.id === 'asset-finalization')
  for (const evidence of REQUIRED_FINAL_ASSET_EVIDENCE) {
    if (!assetFinalization?.requiredEvidence.includes(evidence)) {
      failures.push(`asset-finalization: missing final asset evidence ${evidence}`)
    }
  }

  const completeGamePlan = lanes.find((lane) => lane.id === 'complete-game-plan')
  if (!completeGamePlan?.maxHonestClaim.includes('not a complete playable shipped game')) {
    failures.push('complete-game-plan: must not claim a complete playable shipped game')
  }

  return failures
}
