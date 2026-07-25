'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import dynamic from 'next/dynamic'
import {
  ViewportAICommandPanel,
  ViewportAssetDropOverlay,
  ViewportGizmoMemoryChip,
  ViewportTopToolbar,
} from '@/components/viewport/ViewportChrome'
import { type ViewportCameraPreset } from '@/components/viewport/viewport-camera-presets'
import { ViewportRuntimeDepthStatus } from '@/components/viewport/ViewportRuntimeDepthStatus'
import {
  ViewportFidelityControl,
  useViewportActivityBridge,
  useViewportFidelityState,
} from '@/components/viewport/ViewportFidelityControl'
import {
  viewportSeedObjects,
  type AethelViewport3DProps,
  type ViewportRenderTarget,
  type ViewportSceneObject,
} from '@/components/viewport/viewport-model'
import { buildGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import { buildGizmoTransformPersistenceChip } from '@/lib/viewport/gizmo-transform-persistence'
import {
  buildGizmoEliteControlState,
  buildGizmoInspectorSummary,
  type GizmoAxisPlaneConstraint,
  type GizmoPivotMode,
} from '@/lib/viewport/gizmo-elite-controls'
import { isEditableViewportKeyboardTarget } from '@/lib/viewport/viewport-keyboard-targets'
import { parseAiViewportCommand } from '@/components/viewport/viewportAiCommand'
import { probeWebGpuAdapterAcquisition } from '@/lib/production/render-path-honesty'
import { buildRuntimeModeViewModels, findRuntimeModeById } from '@aethel/runtime/runtime-mode-view-model'

const PixelStreamView = dynamic(() => import('@/components/streaming/pixel-stream-view'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
      Preparing cloud stream...
    </div>
  ),
})

const ViewportScene = dynamic(() => import('@/components/viewport/ViewportSceneCanvas').then((mod) => mod.ViewportScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
      Preparing viewport...
    </div>
  ),
})

export type {
  AethelViewport3DProps,
  ViewportCreativeMode,
  ViewportPBRTextureMaps,
  ViewportRenderStats,
  ViewportRenderTarget,
  ViewportSceneObject,
  ViewportTransformMode,
  ViewportTransformSpace,
} from '@/components/viewport/viewport-model'
export { viewportSeedObjects }

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
  assetImportStatus = 'Drop GLTF, GLB, FBX, OBJ, USD, or USDZ',
  onImportAssets,
  onRaycastReady,
  terrainProjectId = null,
}: AethelViewport3DProps) {
  const [aiCommand, setAiCommand] = useState('move this object 2 up')
  const [assetDragActive, setAssetDragActive] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<ViewportCameraPreset>('perspective')
  const [localGizmoConstraint, setLocalGizmoConstraint] = useState<GizmoAxisPlaneConstraint>('free')
  const [localGizmoPivotMode, setLocalGizmoPivotMode] = useState<GizmoPivotMode>('median')
  const [webGpuAvailable, setWebGpuAvailable] = useState(false)
  const [webGpuAdapterAcquired, setWebGpuAdapterAcquired] = useState<boolean | null>(null)
  const [renderTarget, setRenderTarget] = useState<ViewportRenderTarget>('browser')
  const [focusSelectionNonce, setFocusSelectionNonce] = useState(0)
  const pixelStreamUrl = process.env.NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL
  const runtimeModes = useMemo(() => buildRuntimeModeViewModels({ pixelStreamUrl }), [pixelStreamUrl])
  const currentRuntimeMode = findRuntimeModeById(runtimeModes, renderTarget)
  // Block 3A.1 — do not call useRenderPipeline without a canvas (was placebo deferred/forwardPlus).
  // Live path is R3F WebGL2; fidelity knobs drive real shadow/post settings.
  const { fidelity, setFidelity, params: fidelityParams, capabilityScore, renderTier } =
    useViewportFidelityState(webGpuAvailable)
  const { rootRef, frameloop, active: viewportActive, codeProfile } = useViewportActivityBridge()
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
  const frameSelection = useCallback(() => {
    if (!selectedObject) return; setCameraPreset('perspective'); setFocusSelectionNonce((value) => value + 1)
  }, [selectedObject])
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
    let cancelled = false
    setWebGpuAvailable(typeof navigator !== 'undefined' && 'gpu' in navigator)
    // CW3 — API-exists ≠ adapter ≠ present; chrome label uses acquisition when known.
    void probeWebGpuAdapterAcquisition().then((probe) => {
      if (!cancelled) {
        setWebGpuAvailable(probe.apiAvailable)
        setWebGpuAdapterAcquired(probe.adapterAcquired)
      }
    })
    return () => {
      cancelled = true
    }
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
      if (event.code === 'KeyF') {
        event.preventDefault()
        frameSelection()
        return
      }
      if (event.code === 'Escape') {
        event.preventDefault()
        onSelectionChange([])
      }
    }

    window.addEventListener('keydown', handleViewportHotkeys)
    return () => window.removeEventListener('keydown', handleViewportHotkeys)
  }, [commitGizmoConstraint, commitGizmoPivotMode, frameSelection, gizmoConstraint, gizmoPivotMode, onSelectionChange, onTransformModeChange])

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-0 w-full overflow-hidden"
      data-canonical-viewport3d="true"
      data-aethel-viewport3d="canonical"
      data-viewport-render-target={renderTarget}
      data-viewport-frameloop={frameloop}
      data-workspace-code-profile={codeProfile ? 'true' : 'false'}
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
        onFrameSelection={frameSelection}
      />

      <ViewportGizmoMemoryChip chip={gizmoMemoryChip} />

      <ViewportRuntimeDepthStatus
        pipelineType={fidelityParams.pipelineLabel}
        quality={fidelityParams.resolvedLevel}
        webGpuAvailable={webGpuAvailable}
        webGpuAdapterAcquired={webGpuAdapterAcquired}
        finalRenderSafe={false}
        currentRuntimeMode={currentRuntimeMode}
        runtimeModes={runtimeModes}
        renderTarget={renderTarget}
        onRenderTargetChange={setRenderTarget}
      />

      <ViewportFidelityControl
        value={fidelity}
        onChange={setFidelity}
        resolvedLabel={
          fidelity === 'auto'
            ? `Auto → ${fidelityParams.resolvedLevel}`
            : fidelityParams.resolvedLevel
        }
        paused={!viewportActive}
        capabilityScore={capabilityScore}
        renderTier={renderTier}
      />

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

      {renderTarget === 'cloud' && pixelStreamUrl ? (
        <PixelStreamView
          serverUrl={pixelStreamUrl}
          showStats
          showControls
          className="h-full w-full"
        />
      ) : renderTarget === 'cloud' ? (
        <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] p-6 text-center">
          <div className="max-w-md rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] p-5">
            <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Cloud Stream is not configured yet</p>
            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {currentRuntimeMode.fallbackReason ?? 'Cloud Stream requires a governed Pixel Streaming signaling URL before it becomes selectable.'}
            </p>
            <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">{currentRuntimeMode.costNote}</p>
          </div>
        </div>
      ) : (
        <ViewportScene
          objects={objects.length > 0 ? objects : viewportSeedObjects}
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
          focusTarget={selectedObject?.position ?? null}
          focusNonce={focusSelectionNonce}
          onRaycastReady={onRaycastReady}
          fidelity={fidelityParams}
          frameloop={frameloop}
          terrainProjectId={terrainProjectId}
        />
      )}
    </div>
  )
}
