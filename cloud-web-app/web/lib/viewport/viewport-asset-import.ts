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
