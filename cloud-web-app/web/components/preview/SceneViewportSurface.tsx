'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { VisualScript } from '@/components/visual-scripting/VisualScriptEditor';
import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type { GameplayAbilitySpec } from '@/lib/gameplay-ability-system';
import TimelineOverlay from '@/components/viewport/TimelineOverlay';
import {
  AethelViewport3D,
  SceneViewportInspector,
  SceneViewportOutliner,
  viewportSeedObjects,
  type ViewportCreativeMode,
  type ViewportSceneObject,
  type ViewportTransformMode,
  type ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D';
import {
  cloneViewportObject,
  deriveAbilityAccent,
  deriveVfxGlowIntensity,
  deriveVisualScriptPreviewPatch,
  INITIAL_VIEWPORT_VISUAL_SCRIPT,
} from '@/components/preview/sceneViewportDerivations';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';
import SceneViewportWorkflowDrawer, {
  getViewportWorkflowLabel,
  type ViewportWorkflowTool,
} from './SceneViewportWorkflowDrawer';
import { useViewportExport } from './useViewportExport';

export default function SceneViewportSurface({ renderMode }: { renderMode: 'draft' | 'cinematic' }) {
  const [objects, setObjects] = useState<ViewportSceneObject[]>(viewportSeedObjects);
  const [selectedIds, setSelectedIds] = useState<string[]>([viewportSeedObjects[0]?.id].filter(Boolean) as string[]);
  const [transformMode, setTransformMode] = useState<ViewportTransformMode>('translate');
  const [transformSpace, setTransformSpace] = useState<ViewportTransformSpace>('world');
  const [creativeMode, setCreativeMode] = useState<ViewportCreativeMode>('game');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [workflowTool, setWorkflowTool] = useState<ViewportWorkflowTool | null>(null);
  const [facialBlendShapeCount, setFacialBlendShapeCount] = useState(0);
  const [facialExpressionIntensity, setFacialExpressionIntensity] = useState(0);
  const [hairPresetLabel, setHairPresetLabel] = useState('wavy');
  const [hairHighlightColor, setHairHighlightColor] = useState<string | null>('#6b3d22');
  const [hairVolumeIntensity, setHairVolumeIntensity] = useState(0.42);
  const [visualScript, setVisualScript] = useState<VisualScript>(INITIAL_VIEWPORT_VISUAL_SCRIPT);
  const [timelineTime, setTimelineTime] = useState(0);
  const [timelineDuration] = useState(12);
  const [vfxGraph, setVfxGraph] = useState<VFXGraph | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<GameplayAbilitySpec | null>(null);
  const visualScriptAnchorRef = useRef<ViewportSceneObject | null>(cloneViewportObject(viewportSeedObjects[0]));
  const selectedObject = objects.find((object) => object.id === selectedIds[0]) ?? null;
  const vfxGlowIntensity = useMemo(() => deriveVfxGlowIntensity(vfxGraph), [vfxGraph]);
  const abilityAccent = useMemo(() => deriveAbilityAccent(selectedAbility), [selectedAbility]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimelineTime((current) => {
        const next = Number((current + 0.1).toFixed(2));
        if (next >= timelineDuration) {
          return creativeMode === 'film' ? timelineDuration : 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [creativeMode, isPlaying, timelineDuration]);

  useEffect(() => {
    if (creativeMode === 'film' && timelineTime >= timelineDuration) {
      setIsPlaying(false);
    }
  }, [creativeMode, timelineDuration, timelineTime]);

  const openWorkflowTool = useCallback((tool: ViewportWorkflowTool) => {
    setWorkflowTool(tool);
    if (tool === 'visual-script' && selectedObject) {
      visualScriptAnchorRef.current = cloneViewportObject(selectedObject);
    }
  }, [selectedObject]);

  const handleTogglePlay = useCallback(() => {
    if (timelineTime >= timelineDuration && !isPlaying) {
      setTimelineTime(0);
    }
    setIsPlaying((current) => !current);
  }, [isPlaying, timelineDuration, timelineTime]);

  const handleVisualScriptChange = useCallback((script: VisualScript) => {
    setVisualScript(script);

    const anchor = visualScriptAnchorRef.current;
    if (!anchor) return;

    const patch = deriveVisualScriptPreviewPatch(script, anchor);
    setObjects((current) =>
      current.map((object) =>
        object.id === anchor.id
          ? { ...object, ...patch }
          : object
      )
    );
  }, []);

  const activeWorkflowLabel = getViewportWorkflowLabel(workflowTool);
  const { exportStatus, handleExportViewport } = useViewportExport({
    activeWorkflowLabel,
    creativeMode,
    facialBlendShapeCount,
    facialExpressionIntensity,
    hairHighlightColor,
    hairPresetLabel,
    hairVolumeIntensity,
    isPlaying,
    objects,
    selectedAbilityName: selectedAbility?.name ?? null,
    selectedObject: selectedObject
      ? { id: selectedObject.id, name: selectedObject.name }
      : null,
    timelineDuration,
    timelineTime,
    vfxGraph,
    visualScriptEdgeCount: visualScript.edges.length,
    visualScriptNodeCount: visualScript.nodes.length,
  });

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
          />
          {workflowTool && (
            <SceneViewportWorkflowDrawer
              workflowTool={workflowTool}
              selectedObjectId={selectedObject?.id}
              visualScript={visualScript}
              onClose={() => setWorkflowTool(null)}
              onAbilityChange={setSelectedAbility}
              onFacialMetricsChange={(blendShapeCount, expressionIntensity) => {
                setFacialBlendShapeCount(blendShapeCount);
                setFacialExpressionIntensity(expressionIntensity);
              }}
              onHairSignatureChange={(label, color, density) => {
                setHairPresetLabel(label);
                setHairHighlightColor(color);
                setHairVolumeIntensity(density);
              }}
              onVfxGraphChange={setVfxGraph}
              onVisualScriptChange={handleVisualScriptChange}
            />
          )}
        </div>
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
