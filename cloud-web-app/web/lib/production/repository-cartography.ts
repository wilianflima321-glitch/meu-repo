import {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionNodeStatus,
  mergeAgenticProductionState,
} from './agentic-production-state'

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

const ONE_MB = 1024 * 1024
const DIRECT_READ_LIMIT = 256 * 1024
const SUMMARY_LIMIT = 5 * ONE_MB
const LARGE_ASSET_LIMIT = 50 * ONE_MB
const HUGE_SURFACE_LIMIT = 250 * ONE_MB

const domainKeys: RepositorySurfaceDomain[] = [
  'app-code',
  'api-server',
  'engine-code',
  'game-scene',
  'film-shot',
  'asset',
  'audio',
  'video',
  'story-doc',
  'test',
  'config',
  'infra',
  'unknown',
]

const strategyKeys: RepositoryContextStrategy[] = [
  'direct-read',
  'summarize-first',
  'index-only',
  'external-mirror',
  'manual-review',
]

const codeExtensions = new Set([
  'c',
  'cc',
  'cpp',
  'cs',
  'css',
  'go',
  'h',
  'hpp',
  'java',
  'js',
  'jsx',
  'kt',
  'lua',
  'mjs',
  'py',
  'rs',
  'shader',
  'ts',
  'tsx',
  'wgsl',
])

const assetExtensions = new Set([
  'blend',
  'fbx',
  'glb',
  'gltf',
  'hdr',
  'jpeg',
  'jpg',
  'ktx2',
  'mtl',
  'obj',
  'png',
  'psd',
  'tga',
  'tif',
  'tiff',
  'usdz',
  'webp',
])

const audioExtensions = new Set(['aac', 'flac', 'm4a', 'mp3', 'ogg', 'opus', 'wav'])
const videoExtensions = new Set(['avi', 'm4v', 'mkv', 'mov', 'mp4', 'webm'])
const sceneExtensions = new Set(['level', 'map', 'scene', 'tscn', 'umap', 'unity'])
const filmExtensions = new Set(['edl', 'fcpxml', 'otio', 'srt', 'timeline', 'vtt'])
const configExtensions = new Set(['env', 'ini', 'json', 'lock', 'toml', 'yaml', 'yml'])

function makeEmptyDomainCounts(): Record<RepositorySurfaceDomain, number> {
  return domainKeys.reduce((counts, key) => {
    counts[key] = 0
    return counts
  }, {} as Record<RepositorySurfaceDomain, number>)
}

function makeEmptyStrategyCounts(): Record<RepositoryContextStrategy, number> {
  return strategyKeys.reduce((counts, key) => {
    counts[key] = 0
    return counts
  }, {} as Record<RepositoryContextStrategy, number>)
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function asNonEmptyString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeRepoPath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').trim()
}

function basenameOf(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function extensionOf(path: string): string {
  const base = basenameOf(path).toLowerCase()
  if (base === '.aethelrules') return 'aethelrules'
  const index = base.lastIndexOf('.')
  return index >= 0 ? base.slice(index + 1) : ''
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'surface'
}

function inferSizeClass(sizeBytes: number): RepositorySurface['sizeClass'] {
  if (sizeBytes <= DIRECT_READ_LIMIT) return 'tiny'
  if (sizeBytes <= ONE_MB) return 'small'
  if (sizeBytes <= SUMMARY_LIMIT) return 'medium'
  if (sizeBytes <= HUGE_SURFACE_LIMIT) return 'large'
  return 'huge'
}

function pathIncludes(path: string, fragments: string[]): boolean {
  const lower = path.toLowerCase()
  const rooted = `/${lower.replace(/^\/+/, '')}`
  return fragments.some((fragment) => lower.includes(fragment) || rooted.includes(fragment))
}

function inferDomain(path: string, extension: string, mimeType?: string): RepositorySurfaceDomain {
  const lower = path.toLowerCase()
  const mime = mimeType?.toLowerCase() ?? ''

  if (pathIncludes(lower, ['/test/', '/tests/', '/__tests__/', '.spec.', '.test.', '/playtest/'])) return 'test'
  if (pathIncludes(lower, ['/api/', '/server/', '/route.ts', '/route.js']) && codeExtensions.has(extension)) return 'api-server'
  if (pathIncludes(lower, ['/infra/', '/docker', '/k8s/', '/terraform/', '/helm/', '/.github/'])) return 'infra'
  if (
    extension === 'aethelrules' ||
    lower.endsWith('package.json') ||
    lower.endsWith('tsconfig.json') ||
    lower.endsWith('next.config.js') ||
    lower.endsWith('next.config.mjs') ||
    lower.includes('tailwind.config') ||
    (configExtensions.has(extension) && pathIncludes(lower, ['/config/', '/configs/', '/settings/']))
  ) {
    return 'config'
  }
  if (
    pathIncludes(lower, [
      '/story/',
      '/stories/',
      '/narrative/',
      '/script/',
      '/screenplay/',
      '/docs/',
      '/lore/',
      '/bible',
      'creative-bible',
      'game-design',
    ]) &&
    ['md', 'mdx', 'txt', 'rtf', 'docx', 'pdf', 'json'].includes(extension)
  ) {
    return 'story-doc'
  }
  if (
    filmExtensions.has(extension) ||
    pathIncludes(lower, [
      '/shot/',
      '/shots/',
      '/sequence/',
      '/sequencer/',
      '/timeline/',
      '/storyboard/',
      '/cinematic/',
      '/cinematics/',
      'cinematic/',
      'cinematics/',
      'timeline',
      'shot_',
    ])
  ) {
    return 'film-shot'
  }
  if (videoExtensions.has(extension) || mime.startsWith('video/')) return 'video'
  if (audioExtensions.has(extension) || mime.startsWith('audio/')) return 'audio'
  if (
    sceneExtensions.has(extension) ||
    pathIncludes(lower, ['/scene/', '/scenes/', '/level/', '/levels/', '/world/', '/worlds/', '/map/', '/maps/'])
  ) {
    return 'game-scene'
  }
  if (assetExtensions.has(extension) || mime.startsWith('image/') || mime.includes('model')) return 'asset'
  if (
    codeExtensions.has(extension) &&
    pathIncludes(lower, ['/engine/', '/game/', '/games/', '/combat/', '/quest/', '/ai/', '/animation/', '/physics/'])
  ) {
    return 'engine-code'
  }
  if (codeExtensions.has(extension)) return 'app-code'
  return 'unknown'
}

function inferLayer(path: string, domain: RepositorySurfaceDomain, sourceKind: CartographySourceKind): RepositorySurfaceLayer {
  if (sourceKind !== 'local-workspace' && sourceKind !== 'git') return 'external'
  if (pathIncludes(path, ['.aethelrules', '/mission/', '/project-brain/', '/ledger/'])) return 'mission-control'
  if (domain === 'story-doc') return 'documentation'
  if (domain === 'asset' || domain === 'audio' || domain === 'video' || domain === 'game-scene' || domain === 'film-shot') {
    return 'content'
  }
  if (domain === 'engine-code') return 'engine'
  if (domain === 'test') return 'validation'
  if (domain === 'infra' || domain === 'config') return 'release'
  if (domain === 'app-code' || domain === 'api-server') return 'application'
  return 'unknown'
}

function isTextLike(domain: RepositorySurfaceDomain, extension: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? ''
  return (
    mime.startsWith('text/') ||
    ['md', 'mdx', 'txt', 'json', 'yaml', 'yml', 'toml', 'env', 'html', 'css'].includes(extension) ||
    ['app-code', 'api-server', 'engine-code', 'test', 'config', 'infra', 'story-doc', 'film-shot'].includes(domain)
  )
}

function hasLicense(value: string | null | undefined): boolean {
  return Boolean(asNonEmptyString(value))
}

function resolveContextStrategy(input: {
  artifact: RepositoryArtifactInput
  domain: RepositorySurfaceDomain
  extension: string
  sizeBytes: number
}): RepositoryContextStrategy {
  const sourceKind = input.artifact.sourceKind ?? 'local-workspace'
  const externalLargeSource =
    ['huggingface-hub', 's3', 'marketplace', 'browser-export'].includes(sourceKind) &&
    input.sizeBytes > LARGE_ASSET_LIMIT
  if (externalLargeSource) return 'external-mirror'

  const mediaOrAsset = ['asset', 'audio', 'video', 'game-scene', 'film-shot'].includes(input.domain)
  if (mediaOrAsset && !hasLicense(input.artifact.license)) return 'manual-review'

  if (input.sizeBytes <= DIRECT_READ_LIMIT && isTextLike(input.domain, input.extension, input.artifact.mimeType ?? undefined)) {
    return 'direct-read'
  }
  if (input.sizeBytes <= SUMMARY_LIMIT && isTextLike(input.domain, input.extension, input.artifact.mimeType ?? undefined)) {
    return 'summarize-first'
  }
  if (input.sizeBytes > LARGE_ASSET_LIMIT || mediaOrAsset) return 'index-only'
  return 'summarize-first'
}

function priorityForSurface(input: {
  path: string
  domain: RepositorySurfaceDomain
  strategy: RepositoryContextStrategy
}): RepositoryPriority {
  const lower = input.path.toLowerCase()
  if (
    lower.endsWith('.aethelrules') ||
    lower.endsWith('readme.md') ||
    lower.endsWith('package.json') ||
    lower.includes('creative-bible') ||
    lower.includes('technical-bible') ||
    lower.includes('game-design') ||
    lower.includes('story-bible') ||
    lower.includes('asset-manifest') ||
    lower.includes('scene-manifest')
  ) {
    return 'critical'
  }
  if (input.strategy === 'manual-review' || input.strategy === 'external-mirror') return 'high'
  if (['story-doc', 'config', 'infra', 'api-server', 'engine-code', 'game-scene', 'film-shot'].includes(input.domain)) {
    return 'high'
  }
  if (['asset', 'audio', 'video', 'test'].includes(input.domain)) return 'medium'
  return 'low'
}

function ownerAgentsForDomain(domain: RepositorySurfaceDomain): string[] {
  switch (domain) {
    case 'asset':
    case 'audio':
    case 'video':
      return ['Asset Librarian Agent', 'Performance Agent']
    case 'game-scene':
      return ['Technical Artist Agent', 'Gameplay Engineer Agent']
    case 'film-shot':
      return ['Cinematic Editor Agent', 'Story Agent']
    case 'engine-code':
      return ['Gameplay Engineer Agent', 'Performance Agent']
    case 'story-doc':
      return ['Story Agent', 'Producer Agent']
    case 'test':
      return ['QA Agent']
    case 'infra':
    case 'config':
      return ['Release Agent']
    case 'api-server':
      return ['Software Engineer Agent', 'Release Agent']
    case 'app-code':
      return ['Software Engineer Agent']
    default:
      return ['Producer Agent']
  }
}

function risksForSurface(input: {
  surface: Pick<RepositorySurface, 'domain' | 'path' | 'sizeBytes' | 'sourceKind' | 'strategy' | 'license'>
}): string[] {
  const risks: string[] = []
  const mediaOrAsset = ['asset', 'audio', 'video', 'game-scene', 'film-shot'].includes(input.surface.domain)
  if (mediaOrAsset && !hasLicense(input.surface.license)) {
    risks.push('Missing license/provenance; do not use in commercial output until reviewed.')
  }
  if (input.surface.strategy === 'external-mirror') {
    risks.push('Large external source requires metadata mirror before downloading or editing.')
  }
  if (input.surface.sizeBytes > HUGE_SURFACE_LIMIT) {
    risks.push('Huge surface can freeze local work; route through indexed summaries or cloud/native workers.')
  }
  if (input.surface.domain === 'unknown') {
    risks.push('Unknown domain; require Producer Agent classification before agent edits.')
  }
  return risks
}

function buildSurface(input: RepositoryArtifactInput, index: number): RepositorySurface {
  const path = normalizeRepoPath(input.path)
  const extension = extensionOf(path)
  const domain = inferDomain(path, extension, input.mimeType ?? undefined)
  const sourceKind = input.sourceKind ?? 'local-workspace'
  const strategy = resolveContextStrategy({ artifact: input, domain, extension, sizeBytes: input.sizeBytes })
  const priority = priorityForSurface({ path, domain, strategy })
  const baseSurface = {
    domain,
    path,
    sizeBytes: Math.max(0, input.sizeBytes),
    sourceKind,
    strategy,
    license: asNonEmptyString(input.license),
  }

  return {
    id: `surface-${index + 1}-${slugify(path)}`,
    path,
    basename: basenameOf(path),
    extension,
    sizeBytes: Math.max(0, input.sizeBytes),
    sizeClass: inferSizeClass(Math.max(0, input.sizeBytes)),
    sourceKind,
    sourceUrl: asNonEmptyString(input.sourceUrl),
    mimeType: asNonEmptyString(input.mimeType),
    hash: asNonEmptyString(input.hash),
    license: asNonEmptyString(input.license),
    domain,
    layer: inferLayer(path, domain, sourceKind),
    strategy,
    priority,
    ownerAgents: ownerAgentsForDomain(domain),
    risks: risksForSurface({ surface: baseSurface }),
    symbols: input.symbols ?? [],
    dependencies: input.dependencies ?? [],
    lastModified: asNonEmptyString(input.lastModified),
  }
}

function buildDuplicateGroups(surfaces: RepositorySurface[]): RepositoryDuplicateGroup[] {
  const byKey = new Map<string, { reason: RepositoryDuplicateGroup['reason']; surfaces: RepositorySurface[] }>()

  for (const surface of surfaces) {
    const hashKey = surface.hash ? `hash:${surface.hash}` : null
    const nameSizeKey = `name-size:${surface.basename.toLowerCase()}:${surface.sizeBytes}`
    const key = hashKey ?? nameSizeKey
    const existing = byKey.get(key)
    if (existing) {
      existing.surfaces.push(surface)
    } else {
      byKey.set(key, {
        reason: hashKey ? 'hash' : 'name-size',
        surfaces: [surface],
      })
    }
  }

  return Array.from(byKey.entries())
    .filter(([, group]) => group.surfaces.length > 1)
    .map(([key, group], index) => ({
      id: `duplicate-${index + 1}-${slugify(key)}`,
      reason: group.reason,
      totalBytes: group.surfaces.reduce((total, surface) => total + surface.sizeBytes, 0),
      paths: group.surfaces.map((surface) => surface.path).sort((a, b) => a.localeCompare(b)),
    }))
}

function scoreMustReadSurface(surface: RepositorySurface): number {
  const lower = surface.path.toLowerCase()
  if (lower.endsWith('.aethelrules')) return 100
  if (lower.endsWith('readme.md')) return 95
  if (lower.endsWith('package.json')) return 90
  if (lower.includes('106_ai_game_film_production_contract')) return 88
  if (lower.includes('90_canonical_product_quality_triage')) return 86
  if (lower.includes('91_product_quality_execution_checklist')) return 84
  if (lower.includes('creative-bible') || lower.includes('story-bible')) return 82
  if (lower.includes('technical-bible') || lower.includes('game-design')) return 80
  if (lower.includes('asset-manifest') || lower.includes('scene-manifest') || lower.includes('shot-list')) return 78
  if (surface.domain === 'story-doc') return 70
  if (surface.domain === 'config') return 65
  if (surface.domain === 'test' && lower.includes('playtest')) return 60
  if (surface.priority === 'critical') return 55
  return 0
}

function buildMustReadFirst(surfaces: RepositorySurface[]): string[] {
  return surfaces
    .filter((surface) => surface.strategy === 'direct-read' || surface.strategy === 'summarize-first')
    .map((surface) => ({ surface, score: scoreMustReadSurface(surface) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.surface.path.localeCompare(b.surface.path))
    .slice(0, 16)
    .map((entry) => entry.surface.path)
}

function buildCriticalGaps(surfaces: RepositorySurface[], duplicates: RepositoryDuplicateGroup[]): RepositoryCriticalGap[] {
  const gaps: RepositoryCriticalGap[] = []
  const hasGameOrFilm = surfaces.some((surface) =>
    ['game-scene', 'film-shot', 'engine-code', 'asset', 'audio', 'video'].includes(surface.domain)
  )
  const hasStoryDoc = surfaces.some((surface) => surface.domain === 'story-doc')
  const hasTests = surfaces.some((surface) => surface.domain === 'test')
  const hasRules = surfaces.some((surface) => surface.extension === 'aethelrules')
  const hasBuildConfig = surfaces.some((surface) => surface.path.toLowerCase().endsWith('package.json'))
  const unlicensedMedia = surfaces.filter(
    (surface) =>
      ['asset', 'audio', 'video', 'game-scene', 'film-shot'].includes(surface.domain) && !hasLicense(surface.license)
  )
  const externalMirrors = surfaces.filter((surface) => surface.strategy === 'external-mirror')
  const unknownSurfaces = surfaces.filter((surface) => surface.domain === 'unknown')

  if (hasGameOrFilm && !hasStoryDoc) {
    gaps.push({
      id: 'gap-story-bible',
      severity: 'high',
      title: 'Creative bible missing for game/film production',
      recommendation: 'Create or locate story, gameplay, visual style, continuity, and shot intent before agents generate content.',
      affectedPaths: [],
    })
  }

  if (unlicensedMedia.length > 0) {
    gaps.push({
      id: 'gap-license-provenance',
      severity: 'blocker',
      title: 'Media assets need license/provenance review',
      recommendation: 'Asset Librarian Agent must verify source, commercial rights, duplicates, LOD, and material maps before production use.',
      affectedPaths: unlicensedMedia.slice(0, 12).map((surface) => surface.path),
    })
  }

  if (duplicates.length > 0) {
    gaps.push({
      id: 'gap-duplicate-surfaces',
      severity: 'medium',
      title: 'Duplicate files can confuse agents and inflate context',
      recommendation: 'Keep one canonical asset/code surface and mark copies as references, variants, or deprecated before editing.',
      affectedPaths: duplicates.flatMap((group) => group.paths).slice(0, 12),
    })
  }

  if (hasGameOrFilm && !hasTests) {
    gaps.push({
      id: 'gap-playtest-validation',
      severity: 'high',
      title: 'Playtest/render validation is missing',
      recommendation: 'Add automated playtest, viewport capture, render preview, or build checks before agents claim quality or completion.',
      affectedPaths: [],
    })
  }

  if (!hasRules) {
    gaps.push({
      id: 'gap-project-rules',
      severity: 'medium',
      title: 'Project rules are missing from cartography input',
      recommendation: 'Include .aethelrules or equivalent project policy in must-read context before agent edits.',
      affectedPaths: [],
    })
  }

  if (!hasBuildConfig && surfaces.some((surface) => ['app-code', 'api-server', 'engine-code'].includes(surface.domain))) {
    gaps.push({
      id: 'gap-build-contract',
      severity: 'medium',
      title: 'Build contract not visible',
      recommendation: 'Surface package/build/test configuration so agents can validate real builds instead of guessing commands.',
      affectedPaths: [],
    })
  }

  if (externalMirrors.length > 0) {
    gaps.push({
      id: 'gap-external-mirror',
      severity: 'medium',
      title: 'Large external sources need mirrored metadata',
      recommendation: 'Use paginated metadata from sources such as huggingface-hub, GitHub, S3, or marketplace manifests before downloading GB-scale content.',
      affectedPaths: externalMirrors.slice(0, 12).map((surface) => surface.path),
    })
  }

  if (unknownSurfaces.length > 0) {
    gaps.push({
      id: 'gap-unknown-surfaces',
      severity: 'low',
      title: 'Some surfaces are unclassified',
      recommendation: 'Producer Agent should classify unknown files before allowing specialized agents to edit or delete them.',
      affectedPaths: unknownSurfaces.slice(0, 12).map((surface) => surface.path),
    })
  }

  return gaps
}

function buildDoNotInvent(surfaces: RepositorySurface[], gaps: RepositoryCriticalGap[]): string[] {
  const rules = [
    'Do not create demo/prototype replacements when a canonical file, asset, scene, shot, or contract already exists.',
    'Do not edit large binary assets directly; use manifest metadata, generated previews, and approved import/export steps.',
    'Do not claim AAA, playable, shippable, or cinematic completion without validation evidence and human approval.',
  ]

  if (gaps.some((gap) => gap.id === 'gap-story-bible')) {
    rules.push('Do not invent lore, combat feel, character motivation, shots, or continuity until the creative bible is captured.')
  }
  if (gaps.some((gap) => gap.id === 'gap-license-provenance')) {
    rules.push('Do not use or publish unlicensed assets, audio, video, rigs, or marketplace packs in final output.')
  }
  if (gaps.some((gap) => gap.id === 'gap-duplicate-surfaces')) {
    rules.push('Do not fork duplicate files into new variants until one canonical owner path is approved.')
  }
  if (surfaces.some((surface) => surface.strategy === 'external-mirror')) {
    rules.push('Do not download GB-scale external repositories blindly; mirror file trees, hashes, licenses, and summaries first.')
  }

  return unique(rules)
}

function buildIndexingPolicy(surfaces: RepositorySurface[]): string[] {
  const direct = surfaces.filter((surface) => surface.strategy === 'direct-read').length
  const summary = surfaces.filter((surface) => surface.strategy === 'summarize-first').length
  const indexOnly = surfaces.filter((surface) => surface.strategy === 'index-only').length
  const external = surfaces.filter((surface) => surface.strategy === 'external-mirror').length
  const manual = surfaces.filter((surface) => surface.strategy === 'manual-review').length

  return [
    `${direct} tiny critical files may be read directly into agent context.`,
    `${summary} medium text surfaces require summaries before agent planning.`,
    `${indexOnly} large surfaces require chunk indexes, hashes, thumbnails, or generated previews instead of raw context.`,
    `${external} external-mirror surfaces require paginated source metadata before download.`,
    `${manual} manual-review surfaces require human/license approval before release use.`,
    'Agents must request the Project Brain, Mission Ledger, mustReadFirst files, and graph-specific manifests before editing.',
  ]
}

function surfacesByStrategy(
  surfaces: RepositorySurface[],
  strategy: RepositoryContextStrategy,
  limit: number
): RepositorySurface[] {
  const priorityOrder: Record<RepositoryPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  return surfaces
    .filter((surface) => surface.strategy === strategy)
    .sort(
      (a, b) =>
        priorityOrder[b.priority] - priorityOrder[a.priority] ||
        b.sizeBytes - a.sizeBytes ||
        a.path.localeCompare(b.path)
    )
    .slice(0, limit)
}

function buildRetrievalBatch(input: {
  id: string
  strategy: RepositoryContextStrategy
  purpose: string
  surfaces: string[]
  maxSurfaceCount: number
}): RepositoryRetrievalBatch | null {
  if (input.surfaces.length === 0) return null
  return {
    id: input.id,
    strategy: input.strategy,
    purpose: input.purpose,
    maxSurfaceCount: input.maxSurfaceCount,
    surfaces: input.surfaces.slice(0, input.maxSurfaceCount),
  }
}

function estimateChunkCount(surfaces: RepositorySurface[]): number {
  return surfaces.reduce((total, surface) => {
    if (surface.strategy === 'direct-read') return total + 1
    if (surface.strategy === 'summarize-first') return total + Math.max(1, Math.ceil(surface.sizeBytes / (64 * 1024)))
    if (surface.strategy === 'index-only') return total + Math.max(1, Math.ceil(surface.sizeBytes / (8 * ONE_MB)))
    if (surface.strategy === 'external-mirror') return total + Math.max(1, Math.ceil(surface.sizeBytes / (64 * ONE_MB)))
    return total + 1
  }, 0)
}

function buildContextBudget(
  surfaces: RepositorySurface[],
  contextPlan: RepositoryContextPlan,
  criticalGaps: RepositoryCriticalGap[]
): RepositoryContextBudget {
  const bytesByStrategy = strategyKeys.reduce((totals, strategy) => {
    totals[strategy] = surfaces
      .filter((surface) => surface.strategy === strategy)
      .reduce((total, surface) => total + surface.sizeBytes, 0)
    return totals
  }, {} as Record<RepositoryContextStrategy, number>)

  const retrievalBatches = [
    buildRetrievalBatch({
      id: 'read-canonical-contracts',
      strategy: 'direct-read',
      purpose: 'Prime agents with mission rules, README, build config, and creative/technical bibles before planning.',
      maxSurfaceCount: 16,
      surfaces: contextPlan.mustReadFirst,
    }),
    buildRetrievalBatch({
      id: 'summarize-medium-text',
      strategy: 'summarize-first',
      purpose: 'Summarize medium docs/code before adding them to chat context or agent plans.',
      maxSurfaceCount: 24,
      surfaces: surfacesByStrategy(surfaces, 'summarize-first', 24).map((surface) => surface.path),
    }),
    buildRetrievalBatch({
      id: 'index-heavy-surfaces',
      strategy: 'index-only',
      purpose: 'Build indexes, hashes, thumbnails, symbol maps, LOD/material metadata, or generated previews instead of raw context.',
      maxSurfaceCount: 24,
      surfaces: surfacesByStrategy(surfaces, 'index-only', 24).map((surface) => surface.path),
    }),
    buildRetrievalBatch({
      id: 'mirror-external-metadata',
      strategy: 'external-mirror',
      purpose: 'Fetch paginated source metadata, file trees, cards/readmes, hashes, and licenses before downloading GB-scale repositories.',
      maxSurfaceCount: 24,
      surfaces: surfacesByStrategy(surfaces, 'external-mirror', 24).map((surface) => surface.path),
    }),
    buildRetrievalBatch({
      id: 'manual-review-queue',
      strategy: 'manual-review',
      purpose: 'Hold assets/scenes/shots for human/license approval before commercial use, render, deploy, or agent edits.',
      maxSurfaceCount: 24,
      surfaces: surfacesByStrategy(surfaces, 'manual-review', 24).map((surface) => surface.path),
    }),
  ].filter((batch): batch is RepositoryRetrievalBatch => Boolean(batch))

  const largestContextRisks = surfaces
    .filter((surface) => surface.strategy !== 'direct-read' || surface.sizeBytes > SUMMARY_LIMIT)
    .sort((a, b) => b.sizeBytes - a.sizeBytes || a.path.localeCompare(b.path))
    .slice(0, 12)
    .map((surface) => ({
      path: surface.path,
      sizeBytes: surface.sizeBytes,
      domain: surface.domain,
      strategy: surface.strategy,
      sourceKind: surface.sourceKind,
    }))

  return {
    version: 1,
    directReadBytes: bytesByStrategy['direct-read'],
    summarizeFirstBytes: bytesByStrategy['summarize-first'],
    indexOnlyBytes: bytesByStrategy['index-only'],
    externalMirrorBytes: bytesByStrategy['external-mirror'],
    manualReviewBytes: bytesByStrategy['manual-review'],
    estimatedChunkCount: estimateChunkCount(surfaces),
    retrievalBatches,
    largestContextRisks,
    guardrails: unique([
      'Never load the full repository, game project, film timeline, or asset pack into chat context.',
      'Read canonical contracts first, then summarize medium surfaces, then retrieve only the slices needed for the current mission.',
      'For Hugging Face, GitHub, S3, marketplace, or browser-export sources, mirror metadata before downloading large payloads.',
      'For binaries and media, use hashes, thumbnails, preview renders, LOD/material metadata, transcripts, and license records as context.',
      'If retrieval batches are missing, stale, or blocked by critical gaps, keep agents in planning/review mode.',
      ...criticalGaps
        .filter((gap) => gap.severity === 'blocker' || gap.severity === 'high')
        .map((gap) => `Resolve or explicitly accept ${gap.severity} gap before broad retrieval: ${gap.title}.`),
    ]),
  }
}

function priorityFromSurfaces(surfaces: RepositorySurface[]): RepositoryPriority {
  if (surfaces.some((surface) => surface.priority === 'critical')) return 'critical'
  if (surfaces.some((surface) => surface.priority === 'high')) return 'high'
  if (surfaces.some((surface) => surface.priority === 'medium')) return 'medium'
  return 'low'
}

function buildAgentHandoffs(surfaces: RepositorySurface[], gaps: RepositoryCriticalGap[]): RepositoryAgentHandoff[] {
  const byAgent = new Map<string, RepositorySurface[]>()
  for (const surface of surfaces) {
    for (const agent of surface.ownerAgents) {
      const list = byAgent.get(agent) ?? []
      list.push(surface)
      byAgent.set(agent, list)
    }
  }

  const handoffs: RepositoryAgentHandoff[] = [
    {
      agent: 'Producer Agent',
      priority: gaps.some((gap) => gap.severity === 'blocker' || gap.severity === 'high') ? 'critical' : 'high',
      surfaces: surfaces
        .filter((surface) => surface.priority === 'critical')
        .slice(0, 12)
        .map((surface) => surface.path),
      objective: 'Lock mission scope, canonical owners, approval gates, and no-invention rules before specialized agents act.',
      requiredEvidence: ['Project Brain update', 'Mission Ledger entry', 'Approval checkpoint'],
    },
    {
      agent: 'Research Agent',
      priority: surfaces.some((surface) => surface.sourceKind === 'huggingface-hub' || surface.strategy === 'external-mirror')
        ? 'high'
        : 'medium',
      surfaces: surfaces
        .filter((surface) => surface.sourceKind === 'huggingface-hub' || surface.strategy === 'external-mirror')
        .slice(0, 12)
        .map((surface) => surface.path),
      objective: 'Mirror external metadata, licenses, model/dataset readmes, and folder trees without pulling unnecessary GB payloads.',
      requiredEvidence: ['External source manifest', 'License summary', 'Download budget'],
    },
  ]

  for (const [agent, agentSurfaces] of byAgent.entries()) {
    if (agent === 'Producer Agent') continue
    handoffs.push({
      agent,
      priority: priorityFromSurfaces(agentSurfaces),
      surfaces: agentSurfaces
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 12)
        .map((surface) => surface.path),
      objective: objectiveForAgent(agent),
      requiredEvidence: evidenceForAgent(agent),
    })
  }

  return handoffs.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || a.agent.localeCompare(b.agent))
}

function priorityWeight(priority: RepositoryPriority): number {
  switch (priority) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'medium':
      return 2
    default:
      return 1
  }
}

function objectiveForAgent(agent: string): string {
  switch (agent) {
    case 'Asset Librarian Agent':
      return 'Normalize asset provenance, duplicates, quality, size, LOD, materials, animation clips, and scene usage.'
    case 'Technical Artist Agent':
      return 'Connect scene/world surfaces to viewport, lighting, materials, collision, streaming, and performance budgets.'
    case 'Gameplay Engineer Agent':
      return 'Map gameplay systems, combat feel, inputs, physics, enemies, quests, and playtest criteria before code edits.'
    case 'Cinematic Editor Agent':
      return 'Map shots, timeline, cameras, audio, subtitles, continuity, render queue, and review states.'
    case 'Story Agent':
      return 'Protect narrative continuity, style, character intent, quests, shots, and approved creative decisions.'
    case 'QA Agent':
      return 'Attach test, playtest, render, build, license, and regression evidence to every mission milestone.'
    case 'Performance Agent':
      return 'Prevent UI freezes by routing heavy assets, builds, renders, and indexing to workers, native, or cloud.'
    case 'Release Agent':
      return 'Verify build, deploy, rollback, environment, status, and release evidence before public output.'
    default:
      return 'Inspect owned surfaces and report evidence-backed next actions.'
  }
}

function evidenceForAgent(agent: string): string[] {
  switch (agent) {
    case 'Asset Librarian Agent':
      return ['Asset provenance report', 'Duplicate resolution', 'Quality/LOD summary']
    case 'Technical Artist Agent':
      return ['Viewport screenshot', 'Scene graph diff', 'Performance budget note']
    case 'Gameplay Engineer Agent':
      return ['Playtest capture', 'Input/combat criteria', 'Code diff validation']
    case 'Cinematic Editor Agent':
      return ['Shot preview', 'Timeline/render report', 'Continuity checklist']
    case 'Story Agent':
      return ['Creative bible update', 'Continuity decision', 'Approved story delta']
    case 'QA Agent':
      return ['Test report', 'Regression evidence', 'Known risk list']
    case 'Performance Agent':
      return ['Heavy job routing plan', 'Memory/FPS budget', 'Worker/cloud fallback proof']
    case 'Release Agent':
      return ['Build log', 'Deploy preview', 'Rollback plan']
    default:
      return ['Evidence note']
  }
}

function buildTotals(surfaces: RepositorySurface[]): RepositoryCartographyTotals {
  const domainCounts = makeEmptyDomainCounts()
  const strategyCounts = makeEmptyStrategyCounts()

  for (const surface of surfaces) {
    domainCounts[surface.domain] += 1
    strategyCounts[surface.strategy] += 1
  }

  return {
    totalFiles: surfaces.length,
    totalBytes: surfaces.reduce((total, surface) => total + surface.sizeBytes, 0),
    domainCounts,
    strategyCounts,
    largestSurfaces: surfaces
      .slice()
      .sort((a, b) => b.sizeBytes - a.sizeBytes)
      .slice(0, 12)
      .map((surface) => ({
        path: surface.path,
        sizeBytes: surface.sizeBytes,
        domain: surface.domain,
        strategy: surface.strategy,
      })),
  }
}

export function buildRepositoryCartographyManifest(input: RepositoryCartographyInput): RepositoryCartographyManifest {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const surfaces = input.artifacts
    .filter((artifact) => artifact.path.trim().length > 0)
    .map((artifact, index) => buildSurface(artifact, index))
    .sort((a, b) => a.path.localeCompare(b.path))
  const duplicateGroups = buildDuplicateGroups(surfaces)
  const criticalGaps = buildCriticalGaps(surfaces, duplicateGroups)
  const contextPlan: RepositoryContextPlan = {
    mustReadFirst: buildMustReadFirst(surfaces),
    doNotInvent: buildDoNotInvent(surfaces, criticalGaps),
    indexingPolicy: buildIndexingPolicy(surfaces),
  }
  const contextBudget = buildContextBudget(surfaces, contextPlan, criticalGaps)

  return {
    version: 1,
    id: `repo-cartography-${slugify(input.projectId)}-${generatedAt.slice(0, 10)}`,
    generatedAt,
    projectId: input.projectId,
    sourceKinds: unique(surfaces.map((surface) => surface.sourceKind)).sort((a, b) => a.localeCompare(b)),
    totals: buildTotals(surfaces),
    surfaces,
    duplicateGroups,
    criticalGaps,
    contextPlan,
    contextBudget,
    agentHandoffs: buildAgentHandoffs(surfaces, criticalGaps),
  }
}

function graphStatusForManifest(manifest: RepositoryCartographyManifest, key: ProductionGraphKey): ProductionNodeStatus {
  const hasBlocker = manifest.criticalGaps.some((gap) => gap.severity === 'blocker')
  if (key === 'assetGraph' && hasBlocker) return 'blocked'
  if (key === 'validationGraph' && manifest.criticalGaps.some((gap) => gap.id === 'gap-playtest-validation')) {
    return 'needs-review'
  }
  if (key === 'evidenceGraph') return 'ready'
  if (manifest.criticalGaps.length > 0) return 'needs-review'
  return 'ready'
}

function buildCartographyGraphNode(
  manifest: RepositoryCartographyManifest,
  key: ProductionGraphKey,
  label: string,
  ownerAgent: string
): ProductionGraphNode {
  return {
    id: `repo-cartography-${key}`,
    label,
    status: graphStatusForManifest(manifest, key),
    ownerAgent,
    evidenceRefs: [`repo-cartography:${manifest.id}`],
    blockers: manifest.criticalGaps
      .filter((gap) => gap.severity === 'blocker' || gap.severity === 'high')
      .map((gap) => gap.title),
    updatedAt: manifest.generatedAt,
  }
}

function upsertGraphNode(nodes: ProductionGraphNode[], node: ProductionGraphNode): ProductionGraphNode[] {
  return [node, ...nodes.filter((candidate) => candidate.id !== node.id)]
}

function upsertLedgerEntry(entries: MissionLedgerEntry[], entry: MissionLedgerEntry): MissionLedgerEntry[] {
  return [entry, ...entries.filter((candidate) => candidate.id !== entry.id)]
}

function formatBytesAsMb(bytes: number): string {
  return `${Math.round((bytes / ONE_MB) * 10) / 10} MB`
}

function buildCartographyLedgerEntry(manifest: RepositoryCartographyManifest): MissionLedgerEntry {
  const blockerCount = manifest.criticalGaps.filter((gap) => gap.severity === 'blocker' || gap.severity === 'high').length
  const manualReviewCount = manifest.totals.strategyCounts['manual-review']
  const externalMirrorCount = manifest.totals.strategyCounts['external-mirror']
  const needsApproval = blockerCount > 0 || manualReviewCount > 0 || manifest.duplicateGroups.length > 0

  return {
    id: 'repo-cartography',
    phase: 'Repository cartography',
    ownerAgent: 'Producer Agent',
    state: needsApproval ? 'needs-approval' : 'running',
    summary: `Mapped ${manifest.totals.totalFiles} files (${formatBytesAsMb(
      manifest.totals.totalBytes
    )}) with ${manifest.duplicateGroups.length} duplicate groups and ${externalMirrorCount} external-mirror surfaces.`,
    acceptance: [
      'mustReadFirst context selected',
      'doNotInvent guardrails generated',
      'agentHandoffs assigned',
      'license/provenance and duplicate risks surfaced',
    ],
    evidenceRefs: [`repo-cartography:${manifest.id}`],
    rollbackPlan: 'Pause agents, keep the previous Project Brain, and discard cartography-derived graph updates.',
    nextAction:
      manifest.criticalGaps[0]?.recommendation ??
      'Route each specialized agent through its handoff before editing files or assets.',
    estimatedCostUsd: 0,
    updatedAt: manifest.generatedAt,
  }
}

function appendUnique(existing: string[], additions: string[], limit = 40): string[] {
  return unique([...existing, ...additions]).slice(0, limit)
}

export function mergeRepositoryCartographyIntoProductionState(
  state: AgenticProductionState,
  manifest: RepositoryCartographyManifest
): AgenticProductionState {
  const constraints = [
    `Repository cartography coverage: ${manifest.totals.totalFiles} files / ${formatBytesAsMb(manifest.totals.totalBytes)}.`,
    `${manifest.totals.strategyCounts['external-mirror']} surfaces require external-mirror metadata before GB-scale downloads.`,
    `${manifest.contextPlan.mustReadFirst.length} mustReadFirst files must be loaded before mission edits.`,
  ]
  const risks = manifest.criticalGaps.map((gap) => `${gap.severity.toUpperCase()}: ${gap.title}`)
  const ledger = upsertLedgerEntry(state.ledger, buildCartographyLedgerEntry(manifest))
  const graphs: Partial<Record<ProductionGraphKey, ProductionGraphNode[]>> = {
    assetGraph: upsertGraphNode(
      state.graphs.assetGraph,
      buildCartographyGraphNode(manifest, 'assetGraph', 'Asset Graph cartography', 'Asset Librarian Agent')
    ),
    sceneWorldGraph: upsertGraphNode(
      state.graphs.sceneWorldGraph,
      buildCartographyGraphNode(manifest, 'sceneWorldGraph', 'Scene/World cartography', 'Technical Artist Agent')
    ),
    gameplayGraph: upsertGraphNode(
      state.graphs.gameplayGraph,
      buildCartographyGraphNode(manifest, 'gameplayGraph', 'Gameplay cartography', 'Gameplay Engineer Agent')
    ),
    shotFilmGraph: upsertGraphNode(
      state.graphs.shotFilmGraph,
      buildCartographyGraphNode(manifest, 'shotFilmGraph', 'Shot/Film cartography', 'Cinematic Editor Agent')
    ),
    validationGraph: upsertGraphNode(
      state.graphs.validationGraph,
      buildCartographyGraphNode(manifest, 'validationGraph', 'Validation cartography', 'QA Agent')
    ),
    evidenceGraph: upsertGraphNode(
      state.graphs.evidenceGraph,
      buildCartographyGraphNode(manifest, 'evidenceGraph', 'Repository evidence manifest', 'Producer Agent')
    ),
  }

  return mergeAgenticProductionState(
    state,
    {
      brain: {
        technicalBible: {
          ...state.brain.technicalBible,
          constraints: appendUnique(state.brain.technicalBible.constraints, constraints),
        },
        risks: appendUnique(state.brain.risks, risks),
      },
      ledger,
      graphs,
      runtimePolicy:
        manifest.totals.strategyCounts['external-mirror'] > 0 || manifest.totals.strategyCounts['index-only'] > 0
          ? {
              localAcceleration: 'balanced',
              maxConcurrentHeavyJobs: Math.min(state.runtimePolicy.maxConcurrentHeavyJobs, 2),
              requiresHumanApproval: true,
            }
          : {
              requiresHumanApproval: state.runtimePolicy.requiresHumanApproval,
            },
    },
    manifest.generatedAt
  )
}

export function readRepositoryCartographyManifestFromSettings(settings: unknown): RepositoryCartographyManifest | null {
  if (!isRecord(settings)) return null
  const candidate = settings[REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1) return null
  if (typeof candidate.id !== 'string' || typeof candidate.projectId !== 'string') return null
  if (!Array.isArray(candidate.surfaces) || !Array.isArray(candidate.agentHandoffs)) return null
  if (!isRecord(candidate.totals) || !isRecord(candidate.contextPlan)) return null
  return candidate as unknown as RepositoryCartographyManifest
}

export function writeRepositoryCartographyManifestToSettings(
  settings: unknown,
  manifest: RepositoryCartographyManifest
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]: manifest,
  }
}
