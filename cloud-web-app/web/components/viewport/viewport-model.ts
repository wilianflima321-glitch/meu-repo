import type { ViewportAssetImportMetadata } from '@/lib/viewport/viewport-asset-import'
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls'
import type { GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import type { GizmoTransformPersistenceStatus } from '@/lib/viewport/gizmo-transform-persistence'
import type { RuntimeModeId } from '@aethel/runtime/runtime-mode-view-model'

export type ViewportTransformMode = 'translate' | 'rotate' | 'scale'
export type ViewportTransformSpace = 'world' | 'local'
export type ViewportCreativeMode = 'game' | 'film'
export type ViewportRenderTarget = RuntimeModeId

/**
 * Auxiliary PBR maps derived from a single dropped albedo/base-color image
 * (data URLs). Generated procedurally on-device (Sobel-filter normals,
 * luminance-derived roughness/height) — see `lib/viewport/procedural-pbr.ts`.
 * There is no wired AI image-to-image provider in this codebase for
 * albedo -> Normal/Roughness/Displacement, so this is deterministic image
 * processing, not a generative-model call.
 */
export type ViewportPBRTextureMaps = {
  albedo: string
  normal: string
  roughness: string
  displacement: string
  sourceFileName: string
}

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
  textureMaps?: ViewportPBRTextureMaps
  /**
   * Source path of the last texture/material asset dropped onto this object
   * from the File Explorer (FASE 3.4 — Drag-and-Drop 3D Absolute). Applying
   * the real bitmap as a `THREE.Texture` requires this codebase's asset byte-
   * serving endpoint, which is out of scope here; today this field drives an
   * immediate, real, deterministic color swap (see
   * `deriveColorFromAssetPath` in `SceneViewportStage.tsx`) plus inspector
   * provenance, and is the wiring point for a true texture load later.
   */
  appliedAssetPath?: string
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
  /** Onda A.1 — project that owns durable heightfield for live terrain mesh */
  terrainProjectId?: string | null
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
  /**
   * Registers a synchronous raycast resolver from inside the R3F canvas
   * (FASE 3.4 — Drag-and-Drop 3D Absolute). Called once the scene mounts
   * (and again if it remounts); the host stores the function and calls it
   * with client (viewport-relative) coordinates to find which object, if
   * any, is under the cursor at drop time.
   */
  onRaycastReady?: (resolve: (clientX: number, clientY: number) => string | null) => void
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
