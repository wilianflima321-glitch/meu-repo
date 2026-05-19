'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import {
  ViewportAICommandPanel,
  ViewportAssetDropOverlay,
  ViewportGizmoMemoryChip,
  ViewportTopToolbar,
} from '@/components/viewport/ViewportChrome'
import { ViewportScene } from '@/components/viewport/ViewportSceneCanvas'
import {
  type ViewportCameraPreset,
} from '@/components/viewport/ViewportCameraPresetApplier'
import { buildGizmoTransformOperation, type GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import {
  buildGizmoTransformPersistenceChip,
  type GizmoTransformPersistenceStatus,
} from '@/lib/viewport/gizmo-transform-persistence'
import {
  buildGizmoEliteControlState,
  buildGizmoInspectorSummary,
  type GizmoAxisPlaneConstraint,
  type GizmoPivotMode,
} from '@/lib/viewport/gizmo-elite-controls'
import {
  type ViewportAssetImportMetadata,
} from '@/lib/viewport/viewport-asset-import'
import { isEditableViewportKeyboardTarget } from '@/lib/viewport/viewport-keyboard-targets'
import { parseAiViewportCommand } from '@/components/viewport/viewportAiCommand'
import { useRenderPipeline } from '@/lib/hooks/useRenderPipeline'

export type ViewportTransformMode = 'translate' | 'rotate' | 'scale'
export type ViewportTransformSpace = 'world' | 'local'
export type ViewportCreativeMode = 'game' | 'film'

export type ViewportSceneObject = {
  id: string
  name: string
  type: 'mesh' | 'light' | 'camera'
  geometry?: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane'
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  locked?: boolean
  visible?: boolean
  asset?: ViewportAssetImportMetadata
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

const defaultObjects: ViewportSceneObject[] = [
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

export { SceneViewportOutliner } from '@/components/viewport/SceneViewportOutliner'
export { SceneViewportInspector } from '@/components/viewport/SceneViewportInspector'

export function AethelViewport3D({
  objects,
  selectedIds,
  transformMode,
  transformSpace,
  snapEnabled,
  creativeMode,
  renderMode = 'draft',
  isPlaying,
  currentTime,
  duration,
  vfxGlowIntensity = 0,
  abilityAccentColor,
  abilityLabel,
  facialExpressionIntensity = 0,
  hairHighlightColor,
  hairVolumeIntensity = 0,
  onTogglePlayTest,
  onObjectsChange,
  onSelectionChange,
  onTransformModeChange,
  onTransformSpaceChange,
  onSnapEnabledChange,
  onAIAction,
  onGizmoTransformOperation,
  gizmoConstraint: controlledGizmoConstraint,
  gizmoPivotMode: controlledGizmoPivotMode,
  onGizmoConstraintChange,
  onGizmoPivotModeChange,
  gizmoMemoryStatus = 'idle',
  gizmoMemoryLabel,
  gizmoMemoryError,
  gizmoMemoryCanPersist = false,
  assetImportStatus = 'Drop GLTF, GLB, FBX, OBJ, USD or USDZ assets',
  onImportAssets,
}: AethelViewport3DProps) {
  const [aiCommand, setAiCommand] = useState('move this object 2 up')
  const [assetDragActive, setAssetDragActive] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<ViewportCameraPreset>('perspective')
  const [localGizmoConstraint, setLocalGizmoConstraint] = useState<GizmoAxisPlaneConstraint>('free')
  const [localGizmoPivotMode, setLocalGizmoPivotMode] = useState<GizmoPivotMode>('median')
  const [webGpuAvailable, setWebGpuAvailable] = useState(false)
  const renderPipeline = useRenderPipeline({
    initialQuality: renderMode === 'cinematic' ? 'high' : 'medium',
    customPipeline: {
      type: renderMode === 'cinematic' ? 'deferred' : 'forwardPlus',
      hdr: true,
      shadowMapSize: renderMode === 'cinematic' ? 2048 : 1024,
    },
    dynamicQuality: {
      enabled: true,
      targetFPS: 60,
      minQuality: 'mobile',
      maxQuality: renderMode === 'cinematic' ? 'high' : 'medium',
      adaptationSpeed: 0.25,
      hysteresis: 8,
    },
  })
  const gizmoConstraint = controlledGizmoConstraint ?? localGizmoConstraint
  const gizmoPivotMode = controlledGizmoPivotMode ?? localGizmoPivotMode
  const commitGizmoConstraint = useCallback((constraint: GizmoAxisPlaneConstraint) => {
    setLocalGizmoConstraint(constraint)
    onGizmoConstraintChange?.(constraint)
  }, [onGizmoConstraintChange])
  const commitGizmoPivotMode = useCallback((pivotMode: GizmoPivotMode) => {
    setLocalGizmoPivotMode(pivotMode)
    onGizmoPivotModeChange?.(pivotMode)
  }, [onGizmoPivotModeChange])
  const selectedObject = objects.find((object) => object.id === selectedIds[0]) ?? null
  const topGizmoState = buildGizmoEliteControlState({
    mode: transformMode,
    space: transformSpace,
    pivotMode: gizmoPivotMode,
    constraint: gizmoConstraint,
    selectedObjectIds: selectedIds,
    activeObjectId: selectedObject?.id ?? null,
    lockedObjectIds: objects.filter((object) => selectedIds.includes(object.id) && object.locked).map((object) => object.id),
    source: 'user',
  })
  const topGizmoSummary = buildGizmoInspectorSummary(topGizmoState)
  const gizmoMemoryChip = buildGizmoTransformPersistenceChip({
    status: gizmoMemoryStatus,
    canPersist: gizmoMemoryCanPersist,
    lastOperationLabel: gizmoMemoryLabel,
    lastError: gizmoMemoryError,
  })

  const applyAiCommand = useCallback(() => {
    if (!selectedObject) return
    const patch = parseAiViewportCommand(aiCommand, selectedObject)
    if (!patch) return
    const afterObject: ViewportSceneObject = { ...selectedObject, ...patch }
    onGizmoTransformOperation?.(buildGizmoTransformOperation({
      objectsBefore: [selectedObject],
      objectsAfter: [afterObject],
      mode: Object.prototype.hasOwnProperty.call(patch, 'rotation') ? 'rotate' : Object.prototype.hasOwnProperty.call(patch, 'scale') ? 'scale' : 'translate',
      space: transformSpace,
      snapEnabled,
      source: 'agent',
      reason: aiCommand,
      evidenceRefs: ['viewport:ai-command'],
    }))
    onObjectsChange(objects.map((object) => (object.id === selectedObject.id ? afterObject : object)))
    onAIAction?.(aiCommand)
  }, [aiCommand, objects, onAIAction, onGizmoTransformOperation, onObjectsChange, selectedObject, snapEnabled, transformSpace])

  const handleAssetDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onImportAssets) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setAssetDragActive(true)
  }, [onImportAssets])

  const handleAssetDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setAssetDragActive(false)
  }, [])

  const handleAssetDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onImportAssets) return
    event.preventDefault()
    setAssetDragActive(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onImportAssets(files)
  }, [onImportAssets])

  useEffect(() => {
    setWebGpuAvailable(typeof navigator !== 'undefined' && 'gpu' in navigator)
  }, [])

  useEffect(() => {
    function handleViewportHotkeys(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableViewportKeyboardTarget(event.target)) return
      if (event.code === 'KeyW') {
        event.preventDefault()
        onTransformModeChange('translate')
        return
      }
      if (event.code === 'KeyE') {
        event.preventDefault()
        onTransformModeChange('rotate')
        return
      }
      if (event.code === 'KeyR') {
        event.preventDefault()
        onTransformModeChange('scale')
        return
      }
      if (event.code === 'KeyX') {
        event.preventDefault()
        commitGizmoConstraint(gizmoConstraint === 'x' ? 'free' : 'x')
        return
      }
      if (event.code === 'KeyY') {
        event.preventDefault()
        commitGizmoConstraint(gizmoConstraint === 'y' ? 'free' : 'y')
        return
      }
      if (event.code === 'KeyZ') {
        event.preventDefault()
        commitGizmoConstraint(gizmoConstraint === 'z' ? 'free' : 'z')
        return
      }
      if (event.code === 'KeyG') {
        event.preventDefault()
        commitGizmoPivotMode(gizmoPivotMode === 'median' ? 'active-object' : 'median')
        return
      }
      if (event.code === 'Escape') {
        event.preventDefault()
        onSelectionChange([])
      }
    }

    window.addEventListener('keydown', handleViewportHotkeys)
    return () => window.removeEventListener('keydown', handleViewportHotkeys)
  }, [commitGizmoConstraint, commitGizmoPivotMode, gizmoConstraint, gizmoPivotMode, onSelectionChange, onTransformModeChange])

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden"
      onDragOver={handleAssetDragOver}
      onDragLeave={handleAssetDragLeave}
      onDrop={handleAssetDrop}
    >
      <ViewportTopToolbar
        transformMode={transformMode}
        transformSpace={transformSpace}
        snapEnabled={snapEnabled}
        cameraPreset={cameraPreset}
        gizmoSummary={topGizmoSummary}
        onTransformModeChange={onTransformModeChange}
        onTransformSpaceChange={onTransformSpaceChange}
        onSnapEnabledChange={onSnapEnabledChange}
        onCameraPresetChange={setCameraPreset}
      />

      <ViewportGizmoMemoryChip chip={gizmoMemoryChip} />

      <div
        className="absolute bottom-4 left-4 z-20 max-w-[360px] rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[rgba(7,12,20,0.82)] px-3 py-2 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-md"
        role="status"
        aria-label="Viewport render depth status"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-primary-light)]">
            {renderPipeline.pipelineConfig.type}
          </span>
          <span className="text-[var(--aethel-text-secondary)]">
            {renderPipeline.quality.toUpperCase()} / {webGpuAvailable ? 'WebGPU ready' : 'WebGL2 fallback'}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-quaternary)]">
          Browser preview now declares the AAA pipeline target; Studio Local and Pixel Streaming can take over for heavy scenes.
        </p>
      </div>

      <ViewportAICommandPanel
        creativeMode={creativeMode}
        abilityLabel={abilityLabel}
        isPlaying={isPlaying}
        aiCommand={aiCommand}
        assetImportStatus={assetImportStatus}
        onAiCommandChange={setAiCommand}
        onApplyAiCommand={applyAiCommand}
        onTogglePlayTest={onTogglePlayTest}
      />

      <ViewportAssetDropOverlay active={assetDragActive} />

      <ViewportScene
        objects={objects.length > 0 ? objects : defaultObjects}
        selectedIds={selectedIds}
        transformMode={transformMode}
        transformSpace={transformSpace}
        gizmoConstraint={gizmoConstraint}
        gizmoPivotMode={gizmoPivotMode}
        snapEnabled={snapEnabled}
        creativeMode={creativeMode}
        renderMode={renderMode}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        vfxGlowIntensity={vfxGlowIntensity}
        abilityAccentColor={abilityAccentColor}
        facialExpressionIntensity={facialExpressionIntensity}
        hairHighlightColor={hairHighlightColor}
        hairVolumeIntensity={hairVolumeIntensity}
        onObjectsChange={onObjectsChange}
        onSelectionChange={onSelectionChange}
        onGizmoTransformOperation={onGizmoTransformOperation}
        cameraPreset={cameraPreset}
      />
    </div>
  )
}

export const viewportSeedObjects = defaultObjects
