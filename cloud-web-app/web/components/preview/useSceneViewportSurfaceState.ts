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
  buildViewportAssetImportBatch,
  buildViewportImportedObjects,
  VIEWPORT_ASSET_IMPORT_EXTENSIONS,
  formatViewportAssetSize,
} from '@/lib/viewport/viewport-asset-import';
import { useViewportAssetImportPersistence } from '@/hooks/useViewportAssetImportPersistence';

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

export function useSceneViewportSurfaceState(projectId?: string | null, renderMode: 'draft' | 'cinematic' = 'draft') {
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
  const [assetImportStatus, setAssetImportStatus] = useState(
    `Ready for ${VIEWPORT_ASSET_IMPORT_EXTENSIONS.map((extension) => extension.toUpperCase()).join(', ')} assets`
  );
  const assetImportPersistence = useViewportAssetImportPersistence(projectId);
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

  const handleObjectTransformChange = useCallback(
    (
      objectId: string,
      patch: Partial<Pick<ViewportSceneObject, 'position' | 'rotation' | 'scale'>>
    ) => {
      setObjects((current) =>
        current.map((object) =>
          object.id === objectId && !object.locked ? { ...object, ...patch } : object
        )
      );
    },
    []
  );

  const handleFacialMetricsChange = useCallback((blendShapeCount: number, expressionIntensity: number) => {
    setFacialBlendShapeCount(blendShapeCount);
    setFacialExpressionIntensity(expressionIntensity);
  }, []);

  const handleHairSignatureChange = useCallback((label: string, color: string | null, density: number) => {
    setHairPresetLabel(label);
    setHairHighlightColor(color);
    setHairVolumeIntensity(density);
  }, []);

  const handleImportViewportAssets = useCallback((files: File[]) => {
    const importedAt = new Date().toISOString();
    const importedObjects = buildViewportImportedObjects({
      existingCount: objects.length,
      files: files.map((file) => ({
        fileName: file.name,
        sizeBytes: file.size,
      })),
      importedAt,
    });

    if (importedObjects.length === 0) {
      setAssetImportStatus('No supported assets detected. Use GLTF, GLB, FBX, OBJ, USD or USDZ.');
      return;
    }

    setObjects([...objects, ...importedObjects]);
    setSelectedIds(importedObjects.map((object) => object.id));
    const totalBytes = importedObjects.reduce((sum, object) => sum + (object.asset?.sizeBytes ?? 0), 0);
    const batch = buildViewportAssetImportBatch(importedObjects, { projectId, importedAt });
    setAssetImportStatus(
      `${importedObjects.length} asset${importedObjects.length === 1 ? '' : 's'} staged - ${formatViewportAssetSize(totalBytes)} - license review required`
    );
    void assetImportPersistence.persistBatch(batch).then((result) => {
      if (result.ok) {
        setAssetImportStatus(`${importedObjects.length} asset${importedObjects.length === 1 ? '' : 's'} saved to Asset Graph - license review required`);
        return;
      }
      setAssetImportStatus(`${importedObjects.length} asset${importedObjects.length === 1 ? '' : 's'} staged locally - ${result.error}`);
    });
  }, [assetImportPersistence, objects, projectId]);

  const activeWorkflowLabel = getViewportWorkflowLabel(workflowTool);
  const { exportStatus, renderQuality, setRenderQuality, handleExportViewport } = useViewportExport({
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
    projectId,
    renderMode,
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
    assetImportStatus,
    vfxGlowIntensity,
    abilityAccent,
    activeWorkflowLabel,
    exportStatus,
    renderQuality,
    setRenderQuality,
    handleExportViewport,
    handleImportViewportAssets,
    handleVisualScriptChange,
    handleFacialMetricsChange,
    handleHairSignatureChange,
    handleObjectTransformChange,
  };
}
