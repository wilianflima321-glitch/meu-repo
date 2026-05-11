'use client';

import TimelineOverlay from '@/components/viewport/TimelineOverlay';
import {
  SceneViewportInspector,
  SceneViewportOutliner,
} from '@/components/viewport/AethelViewport3D';
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
  const viewportState = useSceneViewportSurfaceState(projectId);
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
    handleExportViewport,
    openWorkflowTool,
    handleTogglePlay,
  } = viewportState;

  return (
    <ViewportWorkbenchShell
      mode="viewport"
      title="Canonical Preview Surface"
      subtitle="Viewport soberano com outliner, inspector generativo e mini timeline para animacao e filme curto."
      left={
        <SceneViewportOutliner
          objects={objects}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onObjectsChange={setObjects}
        />
      }
      center={
        <SceneViewportStage {...viewportState} renderMode={renderMode} projectId={projectId} />
      }
      right={
        <SceneViewportInspector
          selectedObject={selectedObject}
          transformMode={transformMode}
          transformSpace={transformSpace}
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
          onModeChange={setCreativeMode}
          onTimeChange={setTimelineTime}
          onTogglePlay={handleTogglePlay}
          onExport={handleExportViewport}
        />
      }
    />
  );
}
