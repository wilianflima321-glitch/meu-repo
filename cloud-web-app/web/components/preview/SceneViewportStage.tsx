'use client';

import { AethelViewport3D } from '@/components/viewport/AethelViewport3D';
import { useGizmoTransformPersistence } from '@/hooks/useGizmoTransformPersistence';
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls';

import SceneViewportWorkflowDrawer from './SceneViewportWorkflowDrawer';
import type { useSceneViewportSurfaceState } from './useSceneViewportSurfaceState';

type SceneViewportStageProps = Pick<
  ReturnType<typeof useSceneViewportSurfaceState>,
  | 'objects'
  | 'selectedIds'
  | 'transformMode'
  | 'transformSpace'
  | 'snapEnabled'
  | 'creativeMode'
  | 'isPlaying'
  | 'timelineTime'
  | 'timelineDuration'
  | 'vfxGlowIntensity'
  | 'abilityAccent'
  | 'facialExpressionIntensity'
  | 'hairHighlightColor'
  | 'hairVolumeIntensity'
  | 'handleTogglePlay'
  | 'setObjects'
  | 'setSelectedIds'
  | 'setTransformMode'
  | 'setTransformSpace'
  | 'setSnapEnabled'
  | 'workflowTool'
  | 'selectedObject'
  | 'visualScript'
  | 'closeWorkflowTool'
  | 'setSelectedAbility'
  | 'handleFacialMetricsChange'
  | 'handleHairSignatureChange'
  | 'setVfxGraph'
  | 'handleVisualScriptChange'
  | 'assetImportStatus'
  | 'handleImportViewportAssets'
> & {
  renderMode: 'draft' | 'cinematic';
  projectId?: string | null;
  gizmoConstraint: GizmoAxisPlaneConstraint;
  gizmoPivotMode: GizmoPivotMode;
  onGizmoConstraintChange: (constraint: GizmoAxisPlaneConstraint) => void;
  onGizmoPivotModeChange: (pivotMode: GizmoPivotMode) => void;
};

export function SceneViewportStage({
  objects,
  selectedIds,
  transformMode,
  transformSpace,
  snapEnabled,
  creativeMode,
  isPlaying,
  timelineTime,
  timelineDuration,
  vfxGlowIntensity,
  abilityAccent,
  facialExpressionIntensity,
  hairHighlightColor,
  hairVolumeIntensity,
  handleTogglePlay,
  setObjects,
  setSelectedIds,
  setTransformMode,
  setTransformSpace,
  setSnapEnabled,
  workflowTool,
  selectedObject,
  visualScript,
  closeWorkflowTool,
  setSelectedAbility,
  handleFacialMetricsChange,
  handleHairSignatureChange,
  setVfxGraph,
  handleVisualScriptChange,
  assetImportStatus,
  handleImportViewportAssets,
  renderMode,
  projectId,
  gizmoConstraint,
  gizmoPivotMode,
  onGizmoConstraintChange,
  onGizmoPivotModeChange,
}: SceneViewportStageProps) {
  const gizmoPersistence = useGizmoTransformPersistence(projectId);

  return (
    <div className="relative h-full">
      <AethelViewport3D
        objects={objects}
        selectedIds={selectedIds}
        transformMode={transformMode}
        transformSpace={transformSpace}
        snapEnabled={snapEnabled}
        creativeMode={creativeMode}
        renderMode={renderMode}
        isPlaying={isPlaying}
        currentTime={timelineTime}
        duration={timelineDuration}
        vfxGlowIntensity={vfxGlowIntensity}
        abilityAccentColor={abilityAccent.color}
        abilityLabel={abilityAccent.label}
        facialExpressionIntensity={facialExpressionIntensity}
        hairHighlightColor={hairHighlightColor}
        hairVolumeIntensity={hairVolumeIntensity}
        onTogglePlayTest={handleTogglePlay}
        onObjectsChange={setObjects}
        onSelectionChange={setSelectedIds}
        onTransformModeChange={setTransformMode}
        onTransformSpaceChange={setTransformSpace}
        onSnapEnabledChange={setSnapEnabled}
        onAIAction={() => undefined}
        onGizmoTransformOperation={(operation) => {
          void gizmoPersistence.persistOperation(operation)
        }}
        gizmoConstraint={gizmoConstraint}
        gizmoPivotMode={gizmoPivotMode}
        onGizmoConstraintChange={onGizmoConstraintChange}
        onGizmoPivotModeChange={onGizmoPivotModeChange}
        gizmoMemoryStatus={gizmoPersistence.status}
        gizmoMemoryLabel={gizmoPersistence.lastOperationLabel}
        gizmoMemoryError={gizmoPersistence.lastError}
        gizmoMemoryCanPersist={gizmoPersistence.canPersist}
        assetImportStatus={assetImportStatus}
        onImportAssets={handleImportViewportAssets}
      />
      {workflowTool ? (
        <SceneViewportWorkflowDrawer
          workflowTool={workflowTool}
          selectedObjectId={selectedObject?.id}
          visualScript={visualScript}
          onClose={closeWorkflowTool}
          onAbilityChange={setSelectedAbility}
          onFacialMetricsChange={handleFacialMetricsChange}
          onHairSignatureChange={handleHairSignatureChange}
          onVfxGraphChange={setVfxGraph}
          onVisualScriptChange={handleVisualScriptChange}
        />
      ) : null}
    </div>
  );
}
