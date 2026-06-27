import type { ViewportAssetImportMetadata } from '@/lib/viewport/viewport-asset-import'
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls'
import type { GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import type { GizmoTransformPersistenceStatus } from '@/lib/viewport/gizmo-transform-persistence'
import type { RuntimeModeId } from '@/lib/runtime/runtime-mode-view-model'

export type ViewportTransformMode = 'translate' | 'rotate' | 'scale'
export type ViewportTransformSpace = 'world' | 'local'
export type ViewportCreativeMode = 'game' | 'film'
export type ViewportRenderTarget = RuntimeModeId

export type ViewportSceneObject = {
  id: string
  name: string
  type: 'mesh' | 'light' | 'camera' | 'generated-mesh'
  geometry?: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane'
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  locked?: boolean
  visible?: boolean
  asset?: ViewportAssetImportMetadata
  meshUrl?: string
  generationMetadata?: {
    prompt: string;
    model: string;
    qualityScore?: number;
  }
}

export type AethelViewport3DProps = {
  objects: ViewportSceneObject[]
  selectedIds: string[]
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  snapEnabled: boolean
  creativeMode: ViewportCreativeMode
  renderMode?: 'draft' | 'cinematic'
  isPlaying: boolean
  currentTime: number
  duration: number
  vfxGlowIntensity?: number
  abilityAccentColor?: string | null
  abilityLabel?: string | null
  facialExpressionIntensity?: number
  hairHighlightColor?: string | null
  hairVolumeIntensity?: number
  onTogglePlayTest: () => void
  onObjectsChange: (objects: ViewportSceneObject[]) => void
  onSelectionChange: (ids: string[]) => void
  onTransformModeChange: (mode: ViewportTransformMode) => void
  onTransformSpaceChange: (space: ViewportTransformSpace) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onAIAction?: (action: string) => void
  onGizmoTransformOperation?: (operation: GizmoTransformOperation) => void
  gizmoConstraint?: GizmoAxisPlaneConstraint
  gizmoPivotMode?: GizmoPivotMode
  onGizmoConstraintChange?: (constraint: GizmoAxisPlaneConstraint) => void
  onGizmoPivotModeChange?: (pivotMode: GizmoPivotMode) => void
  gizmoMemoryStatus?: GizmoTransformPersistenceStatus
  gizmoMemoryLabel?: string | null
  gizmoMemoryError?: string | null
  gizmoMemoryCanPersist?: boolean
  assetImportStatus?: string
  onImportAssets?: (files: File[]) => void
}

export const viewportSeedObjects: ViewportSceneObject[] = [
  {
    id: 'airlock-shell',
    name: 'Airlock Shell',
    type: 'mesh',
    geometry: 'box',
    color: 'rgb(125, 211, 252)',
    position: [0, 0.55, 0],
    rotation: [0, 0.35, 0],
    scale: [1.8, 1.1, 1.2],
    visible: true,
  },
  {
    id: 'camera-rig',
    name: 'Camera Rig',
    type: 'camera',
    color: 'rgb(167, 139, 250)',
    position: [2.2, 1.5, 2.4],
    rotation: [-0.35, 0.72, 0],
    scale: [1, 1, 1],
    visible: true,
  },
  {
    id: 'key-light',
    name: 'Key Light',
    type: 'light',
    color: 'rgb(251, 191, 36)',
    position: [1.6, 2.2, 1.8],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
  },
]
