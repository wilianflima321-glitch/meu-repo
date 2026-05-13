import type {
  RepositoryCartographyManifest,
  RepositoryContextStrategy,
  RepositorySurface,
  RepositorySurfaceDomain,
} from './repository-cartography'
import type { ResearchIntelligencePacket } from './research-intelligence-bridge'

export type ProjectMemoryLayer =
  | 'project-overview'
  | 'domain-summary'
  | 'surface-index'
  | 'symbol-index'
  | 'asset-metadata'
  | 'external-research'
  | 'validation-evidence'

export type ProjectMemoryLoadStrategy =
  | 'direct-context'
  | 'summary-first'
  | 'index-only'
  | 'metadata-only'
  | 'human-review'

export type ProjectMemoryCacheTier =
  | 'local-hot'
  | 'local-warm'
  | 'cloud-cold'
  | 'metadata-only'
  | 'held'

export type ProjectMemoryIndexingLane =
  | 'ui-safe'
  | 'local-worker'
  | 'local-sidecar'
  | 'cloud-indexer'
  | 'human-review'

export type ProjectMemoryThermalState = 'nominal' | 'warm' | 'hot' | 'critical' | 'unknown'

export interface ProjectMemoryShard {
  id: string
  layer: ProjectMemoryLayer
  title: string
  summary: string
  sourceRefs: string[]
  domains: RepositorySurfaceDomain[]
  strategy: ProjectMemoryLoadStrategy
  byteBudget: number
  estimatedTokenBudget: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  requiresReadReceipt: boolean
  blockers: string[]
}

export interface MultiResolutionProjectMemory {
  version: 1
  projectId: string
  generatedAt: string
  manifestId: string
  totalFiles: number
  totalBytes: number
  shards: ProjectMemoryShard[]
  retrievalPolicy: string[]
  noRawContextRules: string[]
}

export interface ProjectMemoryRetrievalPlan {
  selectedShardIds: string[]
  directContextRefs: string[]
  summaryRefs: string[]
  metadataRefs: string[]
  heldRefs: string[]
  estimatedTokens: number
  blockers: string[]
  nextAction: string
}

export interface ProjectMemoryRuntimeProbe {
  availableRamBytes: number
  availableDiskBytes: number
  thermalState: ProjectMemoryThermalState
  cpuLoadPercent: number
  localCacheBytes: number
  webGpuAvailable: boolean
  browserOperatorReplayAvailable: boolean
  signedAt?: string
}

export interface ProjectMemoryIndexingShardPlan {
  shardId: string
  layer: ProjectMemoryLayer
  cacheTier: ProjectMemoryCacheTier
  lane: ProjectMemoryIndexingLane
  estimatedBytes: number
  estimatedTokens: number
  requiresReadReceipt: boolean
  requiresReplay: boolean
  reasons: string[]
}

export interface GbScaleProjectIndexingPlan {
  projectId: string
  totalBytes: number
  canRunOnUiThread: false
  localBytesPlanned: number
  cloudBytesPlanned: number
  heldBytes: number
  metadataOnlyRefs: string[]
  shardPlans: ProjectMemoryIndexingShardPlan[]
  blockers: string[]
  nextAction: string
}

function strategyFromRepositoryStrategy(strategy: RepositoryContextStrategy): ProjectMemoryLoadStrategy {
  switch (strategy) {
    case 'direct-read':
      return 'direct-context'
    case 'summarize-first':
      return 'summary-first'
    case 'index-only':
      return 'index-only'
    case 'external-mirror':
      return 'metadata-only'
    case 'manual-review':
      return 'human-review'
  }
}

function estimateTokens(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / 4))
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'memory'
}

function compactPaths(surfaces: RepositorySurface[], limit: number): string[] {
  return surfaces
    .slice()
    .sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 }
      return priority[a.priority] - priority[b.priority] || b.sizeBytes - a.sizeBytes || a.path.localeCompare(b.path)
    })
    .slice(0, limit)
    .map((surface) => surface.path)
}

function dominantStrategy(surfaces: RepositorySurface[]): ProjectMemoryLoadStrategy {
  if (surfaces.some((surface) => surface.strategy === 'manual-review')) return 'human-review'
  if (surfaces.some((surface) => surface.strategy === 'external-mirror')) return 'metadata-only'
  if (surfaces.some((surface) => surface.strategy === 'index-only')) return 'index-only'
  if (surfaces.some((surface) => surface.strategy === 'summarize-first')) return 'summary-first'
  return 'direct-context'
}

function shardPriority(surfaces: RepositorySurface[]): ProjectMemoryShard['priority'] {
  if (surfaces.some((surface) => surface.priority === 'critical')) return 'critical'
  if (surfaces.some((surface) => surface.priority === 'high')) return 'high'
  if (surfaces.some((surface) => surface.priority === 'medium')) return 'medium'
  return 'low'
}

function buildDomainShards(manifest: RepositoryCartographyManifest): ProjectMemoryShard[] {
  const domains = Array.from(new Set(manifest.surfaces.map((surface) => surface.domain))).sort()
  return domains.map((domain) => {
    const surfaces = manifest.surfaces.filter((surface) => surface.domain === domain)
    const totalBytes = surfaces.reduce((sum, surface) => sum + surface.sizeBytes, 0)
    const blockers = manifest.criticalGaps
      .filter((gap) => gap.affectedPaths.some((path) => surfaces.some((surface) => surface.path === path)))
      .map((gap) => gap.title)

    return {
      id: `domain-${domain}`,
      layer: 'domain-summary',
      title: `${domain} domain memory`,
      summary: `${surfaces.length} surfaces, ${Math.round(totalBytes / 1024 / 1024)} MB, strategy ${dominantStrategy(surfaces)}.`,
      sourceRefs: compactPaths(surfaces, 12),
      domains: [domain],
      strategy: dominantStrategy(surfaces),
      byteBudget: totalBytes,
      estimatedTokenBudget: estimateTokens(Math.min(totalBytes, 128_000)),
      priority: shardPriority(surfaces),
      requiresReadReceipt: true,
      blockers,
    } satisfies ProjectMemoryShard
  })
}

function buildSurfaceShards(manifest: RepositoryCartographyManifest): ProjectMemoryShard[] {
  return manifest.surfaces
    .filter((surface) => surface.priority === 'critical' || surface.priority === 'high' || surface.strategy !== 'direct-read')
    .slice(0, 80)
    .map((surface) => ({
      id: `surface-${slugify(surface.path)}`,
      layer: surface.domain === 'asset' || surface.domain === 'audio' || surface.domain === 'video' ? 'asset-metadata' : 'surface-index',
      title: surface.path,
      summary: `${surface.domain} / ${surface.layer} / ${surface.sizeClass}; strategy ${surface.strategy}; owners ${surface.ownerAgents.join(', ')}.`,
      sourceRefs: [surface.path, surface.hash ? `hash:${surface.hash}` : '', surface.sourceUrl ? `source:${surface.sourceUrl}` : ''].filter(Boolean),
      domains: [surface.domain],
      strategy: strategyFromRepositoryStrategy(surface.strategy),
      byteBudget: surface.sizeBytes,
      estimatedTokenBudget: estimateTokens(Math.min(surface.sizeBytes, surface.strategy === 'direct-read' ? surface.sizeBytes : 32_000)),
      priority: surface.priority,
      requiresReadReceipt: true,
      blockers: surface.risks,
    }))
}

function buildSymbolShard(manifest: RepositoryCartographyManifest): ProjectMemoryShard | null {
  const symbolSurfaces = manifest.surfaces.filter((surface) => surface.symbols.length > 0)
  if (symbolSurfaces.length === 0) return null

  return {
    id: 'symbol-index',
    layer: 'symbol-index',
    title: 'Symbol index memory',
    summary: `${symbolSurfaces.length} surfaces expose symbols for precise code navigation and no-hallucination references.`,
    sourceRefs: symbolSurfaces.slice(0, 40).flatMap((surface) => surface.symbols.map((symbol) => `${surface.path}#${symbol}`)),
    domains: Array.from(new Set(symbolSurfaces.map((surface) => surface.domain))),
    strategy: 'index-only',
    byteBudget: symbolSurfaces.reduce((sum, surface) => sum + surface.sizeBytes, 0),
    estimatedTokenBudget: 4_000,
    priority: 'high',
    requiresReadReceipt: true,
    blockers: [],
  }
}

function buildResearchShard(packet: ResearchIntelligencePacket | null | undefined): ProjectMemoryShard | null {
  if (!packet) return null
  return {
    id: 'external-research',
    layer: 'external-research',
    title: 'Research Intelligence memory',
    summary: `${packet.sources.length} sources, ${packet.claims.length} claims, ${packet.risks.length} risks connected to repository evidence.`,
    sourceRefs: packet.sources.map((source) => source.url ?? source.id).slice(0, 40),
    domains: ['unknown'],
    strategy: 'metadata-only',
    byteBudget: 0,
    estimatedTokenBudget: 4_000,
    priority: packet.risks.some((risk) => risk.severity === 'blocker' || risk.severity === 'high') ? 'critical' : 'high',
    requiresReadReceipt: true,
    blockers: packet.risks.filter((risk) => risk.severity === 'blocker').map((risk) => risk.title),
  }
}

export function buildMultiResolutionProjectMemory(input: {
  manifest: RepositoryCartographyManifest
  researchPacket?: ResearchIntelligencePacket | null
  generatedAt?: string
}): MultiResolutionProjectMemory {
  const { manifest } = input
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const overview: ProjectMemoryShard = {
    id: 'project-overview',
    layer: 'project-overview',
    title: 'Project overview memory',
    summary: `${manifest.totals.totalFiles} files mapped across ${manifest.sourceKinds.join(', ')} with ${manifest.criticalGaps.length} critical gaps.`,
    sourceRefs: [manifest.id, ...manifest.contextPlan.mustReadFirst],
    domains: Array.from(new Set(manifest.surfaces.map((surface) => surface.domain))),
    strategy: 'summary-first',
    byteBudget: manifest.totals.totalBytes,
    estimatedTokenBudget: 3_000,
    priority: manifest.criticalGaps.some((gap) => gap.severity === 'blocker') ? 'critical' : 'high',
    requiresReadReceipt: true,
    blockers: manifest.criticalGaps.filter((gap) => gap.severity === 'blocker').map((gap) => gap.title),
  }

  const symbolShard = buildSymbolShard(manifest)
  const researchShard = buildResearchShard(input.researchPacket)

  return {
    version: 1,
    projectId: manifest.projectId,
    generatedAt,
    manifestId: manifest.id,
    totalFiles: manifest.totals.totalFiles,
    totalBytes: manifest.totals.totalBytes,
    shards: [overview, ...buildDomainShards(manifest), ...buildSurfaceShards(manifest), symbolShard, researchShard].filter(
      (shard): shard is ProjectMemoryShard => Boolean(shard)
    ),
    retrievalPolicy: [
      'Load project-overview and symbol-index before asking agents to edit.',
      'Use metadata-only shards for Hugging Face, GitHub, S3, marketplace, and browser exports before downloading large content.',
      'Use summary-first shards for medium code/docs and index-only shards for binaries, scenes, meshes, audio, and video.',
      'Require read receipts for every selected shard before apply.',
    ],
    noRawContextRules: [
      'Never dump an entire GB-scale repository into a model context.',
      'Never replace unknown scenes, lore, characters, assets, or gameplay systems with demos.',
      'Never treat external assets as approved until license/provenance metadata exists.',
    ],
  }
}

export function planProjectMemoryRetrieval(input: {
  memory: MultiResolutionProjectMemory
  mission: string
  requestedPaths?: string[]
  maxTokenBudget: number
}): ProjectMemoryRetrievalPlan {
  const mission = input.mission.toLowerCase()
  const requested = new Set(input.requestedPaths ?? [])
  const selected = input.memory.shards.filter((shard) => {
    if (shard.layer === 'project-overview' || shard.layer === 'symbol-index') return true
    if (shard.sourceRefs.some((ref) => requested.has(ref))) return true
    return shard.domains.some((domain) => mission.includes(domain.replace('-', ' ')) || mission.includes(domain))
  })

  const ordered = selected.sort((a, b) => {
    const priority = { critical: 0, high: 1, medium: 2, low: 3 }
    return priority[a.priority] - priority[b.priority] || a.estimatedTokenBudget - b.estimatedTokenBudget
  })

  const chosen: ProjectMemoryShard[] = []
  let estimatedTokens = 0
  for (const shard of ordered) {
    if (estimatedTokens + shard.estimatedTokenBudget > input.maxTokenBudget && chosen.length > 0) continue
    chosen.push(shard)
    estimatedTokens += shard.estimatedTokenBudget
  }

  return {
    selectedShardIds: chosen.map((shard) => shard.id),
    directContextRefs: chosen.filter((shard) => shard.strategy === 'direct-context').flatMap((shard) => shard.sourceRefs),
    summaryRefs: chosen.filter((shard) => shard.strategy === 'summary-first').flatMap((shard) => shard.sourceRefs),
    metadataRefs: chosen.filter((shard) => ['index-only', 'metadata-only'].includes(shard.strategy)).flatMap((shard) => shard.sourceRefs),
    heldRefs: chosen.filter((shard) => shard.strategy === 'human-review').flatMap((shard) => shard.sourceRefs),
    estimatedTokens,
    blockers: chosen.flatMap((shard) => shard.blockers),
    nextAction:
      chosen.some((shard) => shard.strategy === 'human-review')
        ? 'Collect human/license review before generation or apply.'
        : 'Create read receipts for selected shards before apply.',
  }
}

function isRuntimeConstrained(runtime: ProjectMemoryRuntimeProbe): boolean {
  return (
    runtime.thermalState === 'critical' ||
    runtime.cpuLoadPercent >= 92 ||
    runtime.availableRamBytes < 1_500_000_000 ||
    runtime.availableDiskBytes < 2_000_000_000
  )
}

function hasExternalReplayRequirement(shard: ProjectMemoryShard): boolean {
  return shard.layer === 'external-research' || shard.sourceRefs.some((ref) => /browser|http|huggingface|github/i.test(ref))
}

function chooseIndexingLane(input: {
  shard: ProjectMemoryShard
  runtime: ProjectMemoryRuntimeProbe
  allowCloud: boolean
  maxLocalHotBytes: number
  maxLocalWarmBytes: number
}): Pick<ProjectMemoryIndexingShardPlan, 'cacheTier' | 'lane' | 'reasons'> {
  const { shard, runtime, allowCloud, maxLocalHotBytes, maxLocalWarmBytes } = input
  const reasons: string[] = []

  if (shard.strategy === 'human-review') {
    return {
      cacheTier: 'held',
      lane: 'human-review',
      reasons: ['Shard requires human or license review before indexing.'],
    }
  }

  if (isRuntimeConstrained(runtime)) {
    reasons.push('Local runtime is constrained by RAM, CPU, disk, or thermal state.')
    if (allowCloud && shard.strategy !== 'metadata-only') {
      return { cacheTier: 'cloud-cold', lane: 'cloud-indexer', reasons }
    }
    return { cacheTier: 'held', lane: 'human-review', reasons }
  }

  if (shard.strategy === 'metadata-only' || shard.layer === 'asset-metadata') {
    return {
      cacheTier: 'metadata-only',
      lane: 'local-worker',
      reasons: ['Large/external assets stay metadata-first until license, thumbnail, and provenance are validated.'],
    }
  }

  if (shard.byteBudget <= maxLocalHotBytes && runtime.localCacheBytes + shard.byteBudget <= maxLocalWarmBytes) {
    return {
      cacheTier: 'local-hot',
      lane: shard.byteBudget < 256_000 ? 'ui-safe' : 'local-worker',
      reasons: ['Shard fits the hot local memory budget.'],
    }
  }

  if (shard.byteBudget <= maxLocalWarmBytes) {
    return {
      cacheTier: 'local-warm',
      lane: 'local-sidecar',
      reasons: ['Shard is too large for model context but safe for sidecar indexing.'],
    }
  }

  if (allowCloud) {
    return {
      cacheTier: 'cloud-cold',
      lane: 'cloud-indexer',
      reasons: ['Shard exceeds local cache budget and is routed to cloud indexing.'],
    }
  }

  return {
    cacheTier: 'held',
    lane: 'human-review',
    reasons: ['Shard exceeds local cache budget and cloud indexing is disabled.'],
  }
}

export function planGbScaleProjectIndexing(input: {
  memory: MultiResolutionProjectMemory
  runtime: ProjectMemoryRuntimeProbe
  maxLocalHotBytes?: number
  maxLocalWarmBytes?: number
  allowCloudIndexing: boolean
}): GbScaleProjectIndexingPlan {
  const maxLocalHotBytes = input.maxLocalHotBytes ?? 2_000_000
  const maxLocalWarmBytes = input.maxLocalWarmBytes ?? 512_000_000

  const shardPlans = input.memory.shards.map((shard) => {
    const placement = chooseIndexingLane({
      shard,
      runtime: input.runtime,
      allowCloud: input.allowCloudIndexing,
      maxLocalHotBytes,
      maxLocalWarmBytes,
    })
    return {
      shardId: shard.id,
      layer: shard.layer,
      cacheTier: placement.cacheTier,
      lane: placement.lane,
      estimatedBytes: shard.byteBudget,
      estimatedTokens: shard.estimatedTokenBudget,
      requiresReadReceipt: shard.requiresReadReceipt,
      requiresReplay: hasExternalReplayRequirement(shard),
      reasons: placement.reasons,
    } satisfies ProjectMemoryIndexingShardPlan
  })

  const localBytesPlanned = shardPlans
    .filter((plan) => plan.cacheTier === 'local-hot' || plan.cacheTier === 'local-warm')
    .reduce((sum, plan) => sum + plan.estimatedBytes, 0)
  const cloudBytesPlanned = shardPlans
    .filter((plan) => plan.cacheTier === 'cloud-cold')
    .reduce((sum, plan) => sum + plan.estimatedBytes, 0)
  const heldBytes = shardPlans
    .filter((plan) => plan.cacheTier === 'held')
    .reduce((sum, plan) => sum + plan.estimatedBytes, 0)
  const blockers = [
    ...input.memory.shards.flatMap((shard) => shard.blockers),
    ...shardPlans
      .filter((plan) => plan.cacheTier === 'held')
      .map((plan) => `${plan.shardId} is held until local resources, cloud indexing, or human review are available.`),
  ]

  return {
    projectId: input.memory.projectId,
    totalBytes: input.memory.totalBytes,
    canRunOnUiThread: false,
    localBytesPlanned,
    cloudBytesPlanned,
    heldBytes,
    metadataOnlyRefs: input.memory.shards
      .filter((shard) => shard.strategy === 'metadata-only' || shard.layer === 'asset-metadata')
      .flatMap((shard) => shard.sourceRefs),
    shardPlans,
    blockers,
    nextAction:
      heldBytes > 0
        ? 'Pause apply; resolve held shards with cloud indexing, local sidecar capacity, or human review.'
        : 'Index selected shards in workers/sidecar and create read receipts before any agent apply.',
  }
}
