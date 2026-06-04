export type CartographySourceKind =
  | 'local-workspace'
  | 'git'
  | 'github'
  | 'huggingface-hub'
  | 's3'
  | 'marketplace'
  | 'user-upload'
  | 'browser-export'

export type RepositorySurfaceDomain =
  | 'app-code'
  | 'api-server'
  | 'engine-code'
  | 'game-scene'
  | 'film-shot'
  | 'asset'
  | 'audio'
  | 'video'
  | 'story-doc'
  | 'test'
  | 'config'
  | 'infra'
  | 'unknown'

export type RepositorySurfaceLayer =
  | 'mission-control'
  | 'application'
  | 'studio'
  | 'engine'
  | 'content'
  | 'validation'
  | 'release'
  | 'documentation'
  | 'external'
  | 'unknown'

export type RepositoryContextStrategy =
  | 'direct-read'
  | 'summarize-first'
  | 'index-only'
  | 'external-mirror'
  | 'manual-review'

export type RepositoryPriority = 'critical' | 'high' | 'medium' | 'low'
export type RepositoryGapSeverity = 'blocker' | 'high' | 'medium' | 'low'

export interface RepositoryArtifactInput {
  path: string
  sizeBytes: number
  sourceKind?: CartographySourceKind
  mimeType?: string | null
  hash?: string | null
  lastModified?: string | null
  symbols?: string[]
  dependencies?: string[]
  license?: string | null
  sourceUrl?: string | null
}

export interface RepositorySurface {
  id: string
  path: string
  basename: string
  extension: string
  sizeBytes: number
  sizeClass: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  sourceKind: CartographySourceKind
  sourceUrl?: string
  mimeType?: string
  hash?: string
  license?: string
  domain: RepositorySurfaceDomain
  layer: RepositorySurfaceLayer
  strategy: RepositoryContextStrategy
  priority: RepositoryPriority
  ownerAgents: string[]
  risks: string[]
  symbols: string[]
  dependencies: string[]
  lastModified?: string
}

export interface RepositoryDuplicateGroup {
  id: string
  reason: 'hash' | 'name-size'
  totalBytes: number
  paths: string[]
}

export interface RepositoryCriticalGap {
  id: string
  severity: RepositoryGapSeverity
  title: string
  recommendation: string
  affectedPaths: string[]
}

export interface RepositoryAgentHandoff {
  agent: string
  priority: RepositoryPriority
  surfaces: string[]
  objective: string
  requiredEvidence: string[]
}

export interface RepositoryContextPlan {
  mustReadFirst: string[]
  doNotInvent: string[]
  indexingPolicy: string[]
}

export interface RepositoryRetrievalBatch {
  id: string
  strategy: RepositoryContextStrategy
  purpose: string
  maxSurfaceCount: number
  surfaces: string[]
}

export interface RepositoryContextBudget {
  version: 1
  directReadBytes: number
  summarizeFirstBytes: number
  indexOnlyBytes: number
  externalMirrorBytes: number
  manualReviewBytes: number
  estimatedChunkCount: number
  retrievalBatches: RepositoryRetrievalBatch[]
  largestContextRisks: Array<Pick<RepositorySurface, 'path' | 'sizeBytes' | 'domain' | 'strategy' | 'sourceKind'>>
  guardrails: string[]
}

export interface RepositoryCartographyTotals {
  totalFiles: number
  totalBytes: number
  domainCounts: Record<RepositorySurfaceDomain, number>
  strategyCounts: Record<RepositoryContextStrategy, number>
  largestSurfaces: Array<Pick<RepositorySurface, 'path' | 'sizeBytes' | 'domain' | 'strategy'>>
}

export interface RepositoryCartographyManifest {
  version: 1
  id: string
  generatedAt: string
  projectId: string
  sourceKinds: CartographySourceKind[]
  totals: RepositoryCartographyTotals
  surfaces: RepositorySurface[]
  duplicateGroups: RepositoryDuplicateGroup[]
  criticalGaps: RepositoryCriticalGap[]
  contextPlan: RepositoryContextPlan
  contextBudget: RepositoryContextBudget
  agentHandoffs: RepositoryAgentHandoff[]
}

export interface RepositoryCartographyInput {
  projectId: string
  generatedAt?: string
  artifacts: RepositoryArtifactInput[]
}

export const REPOSITORY_CARTOGRAPHY_SETTINGS_KEY = 'aethelRepositoryCartographyManifest'
