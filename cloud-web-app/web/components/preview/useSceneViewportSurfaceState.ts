'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type { VisualScript } from '@/components/visual-scripting/VisualScriptEditor';
import type { GameplayAbilitySpec } from '@/lib/gameplay-ability-system';
import {
  viewportSeedObjects,
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
} from './sceneViewportDerivations';
import { getViewportWorkflowLabel, type ViewportWorkflowTool } from './SceneViewportWorkflowDrawer';
import { useSceneViewportPlayback } from './useSceneViewportPlayback';
import { useViewportExport } from './useViewportExport';

export function useSceneViewportSurfaceState() {
  const [objects, setObjects] = useState<ViewportSceneObject[]>(viewportSeedObjects);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    [viewportSeedObjects[0]?.id].filter(Boolean) as string[]
  );
  const [transformMode, setTransformMode] = useState<ViewportTransformMode>('translate');
  const [transformSpace, setTransformSpace] = useState<ViewportTransformSpace>('world');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [workflowTool, setWorkflowTool] = useState<ViewportWorkflowTool | null>(null);
  const [facialBlendShapeCount, setFacialBlendShapeCount] = useState(0);
  const [facialExpressionIntensity, setFacialExpressionIntensity] = useState(0);
  const [hairPresetLabel, setHairPresetLabel] = useState('wavy');
  const [hairHighlightColor, setHairHighlightColor] = useState<string | null>('#6b3d22');
  const [hairVolumeIntensity, setHairVolumeIntensity] = useState(0.42);
  const [visualScript, setVisualScript] = useState<VisualScript>(INITIAL_VIEWPORT_VISUAL_SCRIPT);
  const [vfxGraph, setVfxGraph] = useState<VFXGraph | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<GameplayAbilitySpec | null>(null);
  const visualScriptAnchorRef = useRef<ViewportSceneObject | null>(
    cloneViewportObject(viewportSeedObjects[0])
  );
  const playback = useSceneViewportPlayback();

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedIds[0]) ?? null,
    [objects, selectedIds]
  );
  const vfxGlowIntensity = useMemo(() => deriveVfxGlowIntensity(vfxGraph), [vfxGraph]);
  const abilityAccent = useMemo(() => deriveAbilityAccent(selectedAbility), [selectedAbility]);

  const openWorkflowTool = useCallback(
    (tool: ViewportWorkflowTool) => {
      setWorkflowTool(tool);
      if (tool === 'visual-script' && selectedObject) {
        visualScriptAnchorRef.current = cloneViewportObject(selectedObject);
      }
    },
    [selectedObject]
  );

  const closeWorkflowTool = useCallback(() => {
    setWorkflowTool(null);
  }, []);

  const handleVisualScriptChange = useCallback((script: VisualScript) => {
    setVisualScript(script);

    const anchor = visualScriptAnchorRef.current;
    if (!anchor) return;

    const patch = deriveVisualScriptPreviewPatch(script, anchor);
    setObjects((current) =>
      current.map((object) => (object.id === anchor.id ? { ...object, ...patch } : object))
    );
  }, []);

  const handleFacialMetricsChange = useCallback((blendShapeCount: number, expressionIntensity: number) => {
    setFacialBlendShapeCount(blendShapeCount);
    setFacialExpressionIntensity(expressionIntensity);
  }, []);

  const handleHairSignatureChange = useCallback((label: string, color: string | null, density: number) => {
    setHairPresetLabel(label);
    setHairHighlightColor(color);
    setHairVolumeIntensity(density);
  }, []);

  const activeWorkflowLabel = getViewportWorkflowLabel(workflowTool);
  const { exportStatus, handleExportViewport } = useViewportExport({
    activeWorkflowLabel,
    creativeMode: playback.creativeMode,
    facialBlendShapeCount,
    facialExpressionIntensity,
    hairHighlightColor,
    hairPresetLabel,
    hairVolumeIntensity,
    isPlaying: playback.isPlaying,
    objects,
    selectedAbilityName: selectedAbility?.name ?? null,
    selectedObject: selectedObject
      ? { id: selectedObject.id, name: selectedObject.name }
      : null,
    timelineDuration: playback.timelineDuration,
    timelineTime: playback.timelineTime,
    vfxGraph,
    visualScriptEdgeCount: visualScript.edges.length,
    visualScriptNodeCount: visualScript.nodes.length,
  });

  return {
    ...playback,
    objects,
    setObjects,
    selectedIds,
    setSelectedIds,
    transformMode,
    setTransformMode,
    transformSpace,
    setTransformSpace,
    snapEnabled,
    setSnapEnabled,
    workflowTool,
    openWorkflowTool,
    closeWorkflowTool,
    facialBlendShapeCount,
    facialExpressionIntensity,
    hairPresetLabel,
    hairHighlightColor,
    hairVolumeIntensity,
    visualScript,
    vfxGraph,
    setVfxGraph,
    selectedAbility,
    setSelectedAbility,
    selectedObject,
    vfxGlowIntensity,
    abilityAccent,
    activeWorkflowLabel,
    exportStatus,
    handleExportViewport,
    handleVisualScriptChange,
    handleFacialMetricsChange,
    handleHairSignatureChange,
  };
}
