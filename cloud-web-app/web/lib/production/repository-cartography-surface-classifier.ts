import type {
  CartographySourceKind,
  RepositoryArtifactInput,
  RepositoryContextStrategy,
  RepositoryPriority,
  RepositorySurface,
  RepositorySurfaceDomain,
  RepositorySurfaceLayer,
} from './repository-cartography'

const ONE_MB = 1024 * 1024
const DIRECT_READ_LIMIT = 256 * 1024
const SUMMARY_LIMIT = 5 * ONE_MB
const LARGE_ASSET_LIMIT = 50 * ONE_MB
const HUGE_SURFACE_LIMIT = 250 * ONE_MB

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

function asNonEmptyString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
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

export function buildRepositorySurface(input: RepositoryArtifactInput, index: number): RepositorySurface {
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
