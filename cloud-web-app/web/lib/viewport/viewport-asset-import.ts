import type { ViewportSceneObject } from '@/components/viewport/AethelViewport3D'
import type { GameAssetQualityTier } from '@/lib/production/game-asset-quality-pipeline'
import { resolveUsdBrowserFormatSupport } from '@/lib/production/usd-integrator'

export type ViewportAssetImportFormat = 'glb' | 'gltf' | 'fbx' | 'obj' | 'usd' | 'usda' | 'usdz'
export type ViewportAssetLicenseStatus = 'needs-review' | 'approved' | 'blocked'

export type ViewportAssetImportMetadata = {
  fileName: string
  format: ViewportAssetImportFormat
  sizeBytes: number
  source: 'drag-drop'
  importedAt: string
  licenseStatus: ViewportAssetLicenseStatus
  qualityGate: 'raw-intake' | 'preview-ready'
  qualityTier?: GameAssetQualityTier
  evidenceRef: string
  /** True when meshUrl points at hierarchy-preserving GLTF/FBX/OBJ/USDZ (not a primitive stand-in). */
  hierarchyPreserved?: boolean
  boneCount?: number
  meshCount?: number
  animationCount?: number
  /** Honest viewer status — USDA/USD HELD; USDZ live when meshUrl + USDZLoader path. */
  viewerStatus?: 'live' | 'placeholder' | 'held'
}

export type ViewportAssetImportFile = {
  fileName: string
  sizeBytes: number
  /** Object URL or remote URL for real mesh preview (GLTF/FBX/OBJ). */
  meshUrl?: string
  hierarchyPreserved?: boolean
  boneCount?: number
  meshCount?: number
  animationCount?: number
  viewerStatus?: 'live' | 'placeholder' | 'held'
}

export type ViewportAssetImportRecord = {
  objectId: string
  objectName: string
  metadata: ViewportAssetImportMetadata
}

export type ViewportAssetImportBatch = {
  id: string
  projectId?: string | null
  importedAt: string
  source: 'viewport-drop'
  assets: ViewportAssetImportRecord[]
  evidenceRefs: string[]
}

export type ViewportAssetImportBatchObject = {
  id: string
  name: string
  asset?: ViewportAssetImportMetadata
}

export const VIEWPORT_ASSET_IMPORT_EXTENSIONS: readonly ViewportAssetImportFormat[] = [
  'glb',
  'gltf',
  'fbx',
  'obj',
  'usd',
  'usda',
  'usdz',
]

const VIEWPORT_ASSET_QUALITY_TIERS: readonly GameAssetQualityTier[] = [
  'ai-draft',
  'curated-marketplace',
  'studio-local-optimized',
  'cloud-render-grade',
]

const FORMAT_GEOMETRY: Record<ViewportAssetImportFormat, NonNullable<ViewportSceneObject['geometry']>> = {
  glb: 'box',
  gltf: 'box',
  fbx: 'capsule',
  obj: 'cylinder',
  // Held USD formats must not look like solid character proxies — wireframe box via mesh path.
  usd: 'box',
  usda: 'box',
  usdz: 'box',
}

const PREVIEW_READY_FORMATS: ReadonlySet<ViewportAssetImportFormat> = new Set([
  'glb',
  'gltf',
  'fbx',
  'obj',
  'usdz',
])

export function getViewportAssetImportFormat(fileName: string): ViewportAssetImportFormat | null {
  const extension = fileName.trim().toLowerCase().split('.').pop()
  if (!extension) return null
  return VIEWPORT_ASSET_IMPORT_EXTENSIONS.includes(extension as ViewportAssetImportFormat)
    ? (extension as ViewportAssetImportFormat)
    : null
}

export function formatViewportAssetSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB'] as const
  let value = sizeBytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}

export function buildViewportAssetEvidenceRef(fileName: string, importedAt: string): string {
  const safeName = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'asset'
  return `asset-import:${safeName}:${importedAt}`
}

export function inferViewportAssetQualityTier(asset: ViewportAssetImportMetadata): GameAssetQualityTier {
  if (asset.qualityTier) return asset.qualityTier
  if (asset.licenseStatus === 'approved' && asset.qualityGate === 'preview-ready') return 'curated-marketplace'
  return 'ai-draft'
}

export function buildViewportAssetQualityEvidenceRefs(asset: ViewportAssetImportMetadata): string[] {
  const refs = [asset.evidenceRef, 'source asset manifest']
  if (asset.licenseStatus === 'approved') refs.push('license/provenance receipt')
  if (asset.qualityGate === 'preview-ready') refs.push('viewport performance trace')
  return refs
}

export function buildViewportImportedObject({
  existingCount,
  file,
  importedAt,
  index,
}: {
  existingCount: number
  file: ViewportAssetImportFile
  importedAt: string
  index: number
}): ViewportSceneObject | null {
  const format = getViewportAssetImportFormat(file.fileName)
  if (!format) return null

  const baseName = file.fileName.replace(/\.[^.]+$/, '').trim() || `Imported Asset ${index + 1}`
  const slot = existingCount + index
  const position: [number, number, number] = [
    ((slot % 3) - 1) * 1.6,
    0.65 + Math.floor(slot / 3) * 0.18,
    -1.2 - Math.floor(slot / 3) * 0.9,
  ]

  const usdSupport = resolveUsdBrowserFormatSupport(format)
  const defaultViewerStatus =
    file.viewerStatus ??
    (usdSupport
      ? // USDZ is PARTIAL: live only when a real object URL is attached for USDZLoader.
        usdSupport.shipStatus === 'PARTIAL' && file.meshUrl
          ? 'live'
          : 'held'
      : file.meshUrl
        ? 'live'
        : 'placeholder')

  return {
    id: `asset-${importedAt}-${index}-${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: baseName,
    type: 'mesh',
    geometry: FORMAT_GEOMETRY[format],
    color: 'rgb(56, 189, 248)',
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    meshUrl: file.meshUrl,
    asset: {
      fileName: file.fileName,
      format,
      sizeBytes: file.sizeBytes,
      source: 'drag-drop',
      importedAt,
      licenseStatus: 'needs-review',
      qualityGate:
        file.meshUrl && PREVIEW_READY_FORMATS.has(format) && defaultViewerStatus === 'live'
          ? 'preview-ready'
          : 'raw-intake',
      evidenceRef: buildViewportAssetEvidenceRef(file.fileName, importedAt),
      hierarchyPreserved:
        file.hierarchyPreserved ??
        Boolean(file.meshUrl && defaultViewerStatus === 'live' && format !== 'usd' && format !== 'usda'),
      ...(typeof file.boneCount === 'number' ? { boneCount: file.boneCount } : {}),
      ...(typeof file.meshCount === 'number' ? { meshCount: file.meshCount } : {}),
      ...(typeof file.animationCount === 'number' ? { animationCount: file.animationCount } : {}),
      viewerStatus: defaultViewerStatus,
    },
  }
}

/**
 * Build scene objects from real File drops — creates object URLs and probes
 * GLTF hierarchy (bones/meshes/clips) without flattening the scene graph.
 */
export async function buildViewportImportedObjectsFromFiles({
  existingCount,
  files,
  importedAt = new Date().toISOString(),
}: {
  existingCount: number
  files: readonly File[]
  importedAt?: string
}): Promise<ViewportSceneObject[]> {
  const imported: ViewportSceneObject[] = []
  for (const file of files) {
    const format = getViewportAssetImportFormat(file.name)
    if (!format) continue

    if (format === 'usd' || format === 'usda') {
      // Fail-closed: no browser loader — intake only, never attach meshUrl or solid proxy.
      const object = buildViewportImportedObject({
        existingCount,
        file: {
          fileName: file.name,
          sizeBytes: file.size,
          viewerStatus: 'held',
          hierarchyPreserved: false,
        },
        importedAt,
        index: imported.length,
      })
      if (object) imported.push(object)
      continue
    }

    if (format === 'usdz') {
      const meshUrl = URL.createObjectURL(file)
      const object = buildViewportImportedObject({
        existingCount,
        file: {
          fileName: file.name,
          sizeBytes: file.size,
          meshUrl,
          hierarchyPreserved: true,
          viewerStatus: 'live',
        },
        importedAt,
        index: imported.length,
      })
      if (object) imported.push(object)
      continue
    }

    const meshUrl = URL.createObjectURL(file)
    let boneCount = 0
    let meshCount = 0
    let animationCount = 0
    let hierarchyPreserved = true

    if (format === 'glb' || format === 'gltf') {
      try {
        const stats = await probeGltfHierarchy(file)
        boneCount = stats.boneCount
        meshCount = stats.meshCount
        animationCount = stats.animationCount
        hierarchyPreserved = stats.hierarchyPreserved
      } catch {
        // Still attach meshUrl — runtime loader may succeed even if probe fails.
      }
    }

    const object = buildViewportImportedObject({
      existingCount,
      file: {
        fileName: file.name,
        sizeBytes: file.size,
        meshUrl,
        hierarchyPreserved,
        boneCount,
        meshCount,
        animationCount,
        viewerStatus: 'live',
      },
      importedAt,
      index: imported.length,
    })
    if (object) imported.push(object)
  }
  return imported
}

async function probeGltfHierarchy(file: File): Promise<{
  boneCount: number
  meshCount: number
  animationCount: number
  hierarchyPreserved: boolean
}> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const loader = new GLTFLoader()
  const buffer = await file.arrayBuffer()
  const gltf = await new Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>((resolve, reject) => {
    loader.parse(buffer, '', resolve, reject)
  })

  let boneCount = 0
  let meshCount = 0
  gltf.scene.traverse((child) => {
    const mesh = child as import('three').Mesh
    if ((mesh as import('three').Mesh).isMesh) meshCount += 1
    const skinned = child as import('three').SkinnedMesh
    if (skinned.isSkinnedMesh && skinned.skeleton) {
      boneCount = Math.max(boneCount, skinned.skeleton.bones.length)
    }
  })

  return {
    boneCount,
    meshCount,
    animationCount: gltf.animations?.length ?? 0,
    // Probe never flattens — hierarchy is preserved for viewport primitive load.
    hierarchyPreserved: true,
  }
}

export function buildViewportImportedObjects({
  existingCount,
  files,
  importedAt = new Date().toISOString(),
}: {
  existingCount: number
  files: readonly ViewportAssetImportFile[]
  importedAt?: string
}): ViewportSceneObject[] {
  const imported: ViewportSceneObject[] = []
  for (const file of files) {
    const object = buildViewportImportedObject({
      existingCount,
      file,
      importedAt,
      index: imported.length,
    })
    if (object) imported.push(object)
  }
  return imported
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function pickQualityTier(value: unknown): GameAssetQualityTier | undefined {
  return typeof value === 'string' && VIEWPORT_ASSET_QUALITY_TIERS.includes(value as GameAssetQualityTier)
    ? (value as GameAssetQualityTier)
    : undefined
}

export function buildViewportAssetImportBatch(
  objects: readonly ViewportAssetImportBatchObject[],
  options: {
    projectId?: string | null
    importedAt?: string
    id?: string
  } = {},
): ViewportAssetImportBatch {
  const importedAt = options.importedAt ?? new Date().toISOString()
  const assets = objects
    .filter((object): object is ViewportAssetImportBatchObject & { asset: ViewportAssetImportMetadata } => Boolean(object.asset))
    .map((object) => ({
      objectId: object.id,
      objectName: object.name,
      metadata: object.asset,
    }))

  return {
    id: options.id ?? `viewport-asset-import-${importedAt}`,
    projectId: options.projectId,
    importedAt,
    source: 'viewport-drop',
    assets,
    evidenceRefs: unique([
      `viewport:asset-import:${options.id ?? importedAt}`,
      ...assets.map((asset) => asset.metadata.evidenceRef),
    ]),
  }
}

export function coerceViewportAssetImportMetadata(input: unknown): ViewportAssetImportMetadata | null {
  if (!isRecord(input)) return null
  const fileName = pickString(input.fileName, '')
  const format = pickEnum(input.format, VIEWPORT_ASSET_IMPORT_EXTENSIONS, 'glb')
  const sizeBytes = Math.max(0, pickNumber(input.sizeBytes, 0))
  const importedAt = pickString(input.importedAt, new Date().toISOString())
  const evidenceRef = pickString(input.evidenceRef, buildViewportAssetEvidenceRef(fileName || 'asset', importedAt))
  if (!fileName) return null
  const qualityTier = pickQualityTier(input.qualityTier)
  return {
    fileName,
    format,
    sizeBytes,
    source: 'drag-drop',
    importedAt,
    licenseStatus: pickEnum(input.licenseStatus, ['needs-review', 'approved', 'blocked'] as const, 'needs-review'),
    qualityGate: pickEnum(input.qualityGate, ['raw-intake', 'preview-ready'] as const, 'raw-intake'),
    ...(qualityTier ? { qualityTier } : {}),
    evidenceRef,
    ...(typeof input.hierarchyPreserved === 'boolean' ? { hierarchyPreserved: input.hierarchyPreserved } : {}),
    ...(typeof input.boneCount === 'number' ? { boneCount: input.boneCount } : {}),
    ...(typeof input.meshCount === 'number' ? { meshCount: input.meshCount } : {}),
    ...(typeof input.animationCount === 'number' ? { animationCount: input.animationCount } : {}),
    ...(typeof input.viewerStatus === 'string'
      ? { viewerStatus: pickEnum(input.viewerStatus, ['live', 'placeholder', 'held'] as const, 'placeholder') }
      : {}),
  }
}

export function coerceViewportAssetImportBatch(input: unknown): ViewportAssetImportBatch | null {
  const candidate = isRecord(input) && isRecord(input.batch) ? input.batch : input
  if (!isRecord(candidate)) return null
  const assetsInput = Array.isArray(candidate.assets) ? candidate.assets : []
  const importedAt = pickString(candidate.importedAt, new Date().toISOString())
  const assets = assetsInput
    .map((asset): ViewportAssetImportRecord | null => {
      if (!isRecord(asset)) return null
      const metadata = coerceViewportAssetImportMetadata(asset.metadata)
      if (!metadata) return null
      return {
        objectId: pickString(asset.objectId, `asset-${metadata.evidenceRef}`),
        objectName: pickString(asset.objectName, metadata.fileName.replace(/\.[^.]+$/, '') || metadata.fileName),
        metadata,
      }
    })
    .filter((asset): asset is ViewportAssetImportRecord => Boolean(asset))

  if (assets.length === 0) return null
  return {
    id: pickString(candidate.id, `viewport-asset-import-${importedAt}`),
    projectId: typeof candidate.projectId === 'string' ? candidate.projectId : null,
    importedAt,
    source: 'viewport-drop',
    assets,
    evidenceRefs: unique([
      ...(Array.isArray(candidate.evidenceRefs) ? candidate.evidenceRefs.filter((item): item is string => typeof item === 'string') : []),
      ...assets.map((asset) => asset.metadata.evidenceRef),
    ]),
  }
}
