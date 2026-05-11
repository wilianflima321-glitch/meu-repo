import type { ViewportSceneObject } from '@/components/viewport/AethelViewport3D'

export type ViewportAssetImportFormat = 'glb' | 'gltf' | 'fbx' | 'obj' | 'usd' | 'usdz'
export type ViewportAssetLicenseStatus = 'needs-review' | 'approved' | 'blocked'

export type ViewportAssetImportMetadata = {
  fileName: string
  format: ViewportAssetImportFormat
  sizeBytes: number
  source: 'drag-drop'
  importedAt: string
  licenseStatus: ViewportAssetLicenseStatus
  qualityGate: 'raw-intake' | 'preview-ready'
  evidenceRef: string
}

export type ViewportAssetImportFile = {
  fileName: string
  sizeBytes: number
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
  'usdz',
]

const FORMAT_GEOMETRY: Record<ViewportAssetImportFormat, NonNullable<ViewportSceneObject['geometry']>> = {
  glb: 'box',
  gltf: 'box',
  fbx: 'capsule',
  obj: 'cylinder',
  usd: 'sphere',
  usdz: 'sphere',
}

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
    asset: {
      fileName: file.fileName,
      format,
      sizeBytes: file.sizeBytes,
      source: 'drag-drop',
      importedAt,
      licenseStatus: 'needs-review',
      qualityGate: 'raw-intake',
      evidenceRef: buildViewportAssetEvidenceRef(file.fileName, importedAt),
    },
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
  return {
    fileName,
    format,
    sizeBytes,
    source: 'drag-drop',
    importedAt,
    licenseStatus: pickEnum(input.licenseStatus, ['needs-review', 'approved', 'blocked'] as const, 'needs-review'),
    qualityGate: pickEnum(input.qualityGate, ['raw-intake', 'preview-ready'] as const, 'raw-intake'),
    evidenceRef,
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
