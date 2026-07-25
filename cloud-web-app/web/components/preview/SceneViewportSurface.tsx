'use client';

import { useState } from 'react';
import { Boxes, Film, SlidersHorizontal, Terminal as TerminalIcon } from 'lucide-react';
import TimelineOverlay from '@/components/viewport/TimelineOverlay';
import {
  SceneViewportInspector,
  SceneViewportOutliner,
} from '@/components/viewport/AethelViewport3D';
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls';
import { SceneViewportStage } from './SceneViewportStage';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';
import { useSceneViewportSurfaceState } from './useSceneViewportSurfaceState';
import { DockPanel } from '../../../packages/ide-ui/docking';
import { ConsoleIntegration } from '../../../packages/ide-ui/ConsoleIntegration';

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
    handleObjectTransformChange,
    handleObjectTextureMapsChange,
  } = viewportState;

  return (
    <ViewportWorkbenchShell
      mode="viewport"
      title="Viewport 3D"
      subtitle="Select, inspect, playtest, and review scene assets with evidence."
      left={
        <DockPanel id="outliner" title="Outliner" icon={Boxes} defaultRegion="leftBar">
          <SceneViewportOutliner
            objects={objects}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onObjectsChange={setObjects}
          />
        </DockPanel>
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
        <DockPanel id="properties" title="Properties" icon={SlidersHorizontal} defaultRegion="rightBar">
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
            onObjectTransformChange={handleObjectTransformChange}
            onObjectTextureMapsChange={handleObjectTextureMapsChange}
          />
        </DockPanel>
      }
      bottom={
        <>
          <DockPanel id="timeline" title="Timeline" icon={Film} defaultRegion="bottomBar">
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
          </DockPanel>
          <DockPanel id="console" title="Console" icon={TerminalIcon} defaultRegion="bottomBar">
            <ConsoleIntegration />
          </DockPanel>
        </>
      }
    />
  );
}
