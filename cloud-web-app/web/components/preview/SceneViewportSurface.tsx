'use client';

import { useState } from 'react';
import TimelineOverlay from '@/components/viewport/TimelineOverlay';
import {
  SceneViewportInspector,
  SceneViewportOutliner,
} from '@/components/viewport/AethelViewport3D';
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls';
import { SceneViewportStage } from './SceneViewportStage';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';
import { useSceneViewportSurfaceState } from './useSceneViewportSurfaceState';

export default function SceneViewportSurface({
  renderMode,
  projectId,
}: {
  renderMode: 'draft' | 'cinematic';
  projectId?: string | null;
}) {
  const viewportState = useSceneViewportSurfaceState(projectId, renderMode);
  const [gizmoConstraint, setGizmoConstraint] = useState<GizmoAxisPlaneConstraint>('free');
  const [gizmoPivotMode, setGizmoPivotMode] = useState<GizmoPivotMode>('median');
  const {
    objects,
    selectedIds,
    setSelectedIds,
    setObjects,
    selectedObject,
    transformMode,
    setTransformMode,
    transformSpace,
    setTransformSpace,
    snapEnabled,
    setSnapEnabled,
    isPlaying,
    creativeMode,
    setCreativeMode,
    timelineDuration,
    timelineTime,
    setTimelineTime,
    facialBlendShapeCount,
    hairPresetLabel,
    visualScript,
    activeWorkflowLabel,
    exportStatus,
    renderQuality,
    setRenderQuality,
    handleExportViewport,
    openWorkflowTool,
    handleTogglePlay,
  } = viewportState;

  return (
    <ViewportWorkbenchShell
      mode="viewport"
      title="Canonical Preview Surface"
      subtitle="Viewport soberano com outliner, inspector generactive e mini timeline para animacao e filme curto."
      left={
        <SceneViewportOutliner
          objects={objects}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onObjectsChange={setObjects}
        />
      }
      center={
        <SceneViewportStage
          {...viewportState}
          renderMode={renderMode}
          projectId={projectId}
          gizmoConstraint={gizmoConstraint}
          gizmoPivotMode={gizmoPivotMode}
          onGizmoConstraintChange={setGizmoConstraint}
          onGizmoPivotModeChange={setGizmoPivotMode}
        />
      }
      right={
        <SceneViewportInspector
          selectedObject={selectedObject}
          selectedIds={selectedIds}
          transformMode={transformMode}
          transformSpace={transformSpace}
          gizmoConstraint={gizmoConstraint}
          gizmoPivotMode={gizmoPivotMode}
          snapEnabled={snapEnabled}
          isPlaying={isPlaying}
          facialBlendShapeCount={facialBlendShapeCount}
          hairPresetLabel={hairPresetLabel}
          visualScriptNodeCount={visualScript.nodes.length}
          visualScriptEdgeCount={visualScript.edges.length}
          activeWorkflowLabel={activeWorkflowLabel}
          onOpenFacialEditor={() => openWorkflowTool('facial')}
          onOpenHairEditor={() => openWorkflowTool('hair')}
          onOpenVisualScript={() => openWorkflowTool('visual-script')}
          onOpenVfxGraph={() => openWorkflowTool('vfx')}
          onOpenAbilityEditor={() => openWorkflowTool('ability')}
          onTransformModeChange={setTransformMode}
          onTransformSpaceChange={setTransformSpace}
          onGizmoConstraintChange={setGizmoConstraint}
          onGizmoPivotModeChange={setGizmoPivotMode}
          onSnapEnabledChange={setSnapEnabled}
          onTogglePlayTest={handleTogglePlay}
        />
      }
      bottom={
        <TimelineOverlay
          mode={creativeMode}
          duration={timelineDuration}
          currentTime={timelineTime}
          isPlaying={isPlaying}
          activeWorkflowLabel={activeWorkflowLabel}
          selectedObjectName={selectedObject?.name ?? null}
          statusLabel={exportStatus}
          renderQuality={renderQuality}
          onModeChange={setCreativeMode}
          onRenderQualityChange={setRenderQuality}
          onTimeChange={setTimelineTime}
          onTogglePlay={handleTogglePlay}
          onExport={handleExportViewport}
        />
      }
    />
  );
}
