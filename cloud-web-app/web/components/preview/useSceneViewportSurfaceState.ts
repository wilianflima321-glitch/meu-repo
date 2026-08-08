'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useViewportStore } from '@/lib/viewport/useViewportStore';
import { useAethelContext } from '@/contexts/AethelContextRegistry';

import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type { VisualScript } from '@aethel/visual-scripting/VisualScriptEditor';
import type { GameplayAbilitySpec } from '@aethel/gameplay-ability-system';
import {
  viewportSeedObjects,
  type ViewportSceneObject,
  type ViewportTransformMode,
  type ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D';
import {
  buildViewportAssetImportBatch,
  buildViewportImportedObjectsFromFiles,
  VIEWPORT_ASSET_IMPORT_EXTENSIONS,
  formatViewportAssetSize,
} from '@/lib/viewport/viewport-asset-import';
import {
  buildViewportPBRPlaneObject,
  generateProceduralPBRMaps,
  isPBRSourceImageFile,
  PBR_SOURCE_IMAGE_EXTENSIONS,
} from '@/lib/viewport/procedural-pbr';
import { useViewportAssetImportPersistence } from '@/hooks/useViewportAssetImportPersistence';

import {
  cloneViewportObject,
  deriveAbilityAccent,
  deriveVfxGlowIntensity,
  deriveVisualScriptPreviewPatch,
  INITIAL_VIEWPORT_VISUAL_SCRIPT,
} from './sceneViewportDerivations';
import { useVisualScriptCollaboration } from '@/lib/visual-script-collaboration';
import { getViewportWorkflowLabel, type ViewportWorkflowTool } from './SceneViewportWorkflowDrawer';
import { useSceneViewportPlayback } from './useSceneViewportPlayback';
import { useViewportExport } from './useViewportExport';

export function useSceneViewportSurfaceState(projectId?: string | null, renderMode: 'draft' | 'cinematic' = 'draft') {
  const {
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
  } = useViewportStore();
  const [workflowTool, setWorkflowTool] = useState<ViewportWorkflowTool | null>(null);
  const [facialBlendShapeCount, setFacialBlendShapeCount] = useState(0);
  const [facialExpressionIntensity, setFacialExpressionIntensity] = useState(0);
  const [hairPresetLabel, setHairPresetLabel] = useState('wavy');
  const [hairHighlightColor, setHairHighlightColor] = useState<string | null>('#6b3d22');
  const [hairVolumeIntensity, setHairVolumeIntensity] = useState(0.42);
  const [visualScript, setVisualScript] = useState<VisualScript>(INITIAL_VIEWPORT_VISUAL_SCRIPT);
  const visualScriptCollab = useVisualScriptCollaboration({
    documentId: projectId ? `${projectId}:viewport-script` : 'viewport-script',
  });
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
  const { setViewportSelection } = useAethelContext();

  // R1.4/R1.5: hydrate from IndexedDB-persisted CRDT state once it syncs, so
  // offline edits made in a previous session survive a reload instead of
  // being silently replaced by the static INITIAL_VIEWPORT_VISUAL_SCRIPT seed.
  useEffect(() => {
    if (!visualScriptCollab.isPersistenceSynced) return;
    const hydrated = visualScriptCollab.hydrate(INITIAL_VIEWPORT_VISUAL_SCRIPT);
    setVisualScript(hydrated);
  }, [visualScriptCollab]);

  useEffect(() => {
    return visualScriptCollab.subscribe((remoteScript) => {
      setVisualScript(remoteScript);
    });
  }, [visualScriptCollab]);

  useEffect(() => {
    if (!selectedObject) {
      setViewportSelection(null);
      return;
    }
    setViewportSelection({
      id: selectedObject.id,
      name: selectedObject.name,
      type: selectedObject.type,
      position: selectedObject.position,
    });
  }, [selectedObject, setViewportSelection]);

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
    visualScriptCollab.applyScript(script);

    const anchor = visualScriptAnchorRef.current;
    if (!anchor) return;

    const patch = deriveVisualScriptPreviewPatch(script, anchor);
    setObjects((current) =>
      current.map((object) => (object.id === anchor.id ? { ...object, ...patch } : object))
    );
  }, [setObjects, visualScriptCollab]);

  // handleObjectTransformChange agora está no store, mas mantemos compatibilidade caso algo precise
  const { handleObjectTransformChange, handleObjectTextureMapsChange } = useViewportStore();

  const handleFacialMetricsChange = useCallback((blendShapeCount: number, expressionIntensity: number) => {
    setFacialBlendShapeCount(blendShapeCount);
    setFacialExpressionIntensity(expressionIntensity);
  }, []);

  const handleHairSignatureChange = useCallback((label: string, color: string | null, density: number) => {
    setHairPresetLabel(label);
    setHairHighlightColor(color);
    setHairVolumeIntensity(density);
  }, []);

  const handleImportPBRImages = useCallback((imageFiles: File[]) => {
    if (imageFiles.length === 0) return;
    setAssetImportStatus(
      `Generating PBR maps (Normal, Roughness, Displacement) for ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}...`
    );
    const importedAt = new Date().toISOString();
    void Promise.all(
      imageFiles.map(async (file, index) => {
        const maps = await generateProceduralPBRMaps(file);
        return buildViewportPBRPlaneObject({
          file,
          maps,
          existingCount: objects.length,
          index,
          importedAt,
        });
      })
    ).then(
      (pbrObjects) => {
        setObjects((current) => [...current, ...pbrObjects]);
        setSelectedIds(pbrObjects.map((object) => object.id));
        setAssetImportStatus(
          `${pbrObjects.length} PBR material${pbrObjects.length === 1 ? '' : 's'} generated (albedo + normal + roughness + displacement) and applied to new plane${pbrObjects.length === 1 ? '' : 's'}.`
        );
      },
      () => {
        setAssetImportStatus('Failed to generate PBR maps from the dropped image(s).');
      }
    );
  }, [objects.length, setObjects, setSelectedIds]);

  const handleImportViewportAssets = useCallback((files: File[]) => {
    const imageFiles = files.filter((file) => isPBRSourceImageFile(file.name));
    const otherFiles = files.filter((file) => !isPBRSourceImageFile(file.name));

    if (imageFiles.length > 0) {
      handleImportPBRImages(imageFiles);
    }

    if (otherFiles.length === 0) {
      if (imageFiles.length === 0) {
        setAssetImportStatus(
          `No supported assets detected. Use GLTF, GLB, FBX, OBJ, USDZ (preview), or ${PBR_SOURCE_IMAGE_EXTENSIONS.map((ext) => ext.toUpperCase()).join('/')} for PBR materials. USDA/USD intake is HELD.`
        );
      }
      return;
    }

    const importedAt = new Date().toISOString();
    setAssetImportStatus(`Importing ${otherFiles.length} asset${otherFiles.length === 1 ? '' : 's'} (hierarchy-preserving)…`);

    void buildViewportImportedObjectsFromFiles({
      existingCount: objects.length,
      files: otherFiles,
      importedAt,
    }).then((importedObjects) => {
      if (importedObjects.length === 0) {
        setAssetImportStatus(
          `No supported assets detected. Use GLTF, GLB, FBX, OBJ, USDZ (preview), or ${PBR_SOURCE_IMAGE_EXTENSIONS.map((ext) => ext.toUpperCase()).join('/')} for PBR materials. USDA/USD intake is HELD.`
        );
        return;
      }

      setObjects([...objects, ...importedObjects]);
      setSelectedIds(importedObjects.map((object) => object.id));
      const totalBytes = importedObjects.reduce((sum, object) => sum + (object.asset?.sizeBytes ?? 0), 0);
      const liveCount = importedObjects.filter((o) => o.asset?.viewerStatus === 'live').length;
      const heldCount = importedObjects.filter((o) => o.asset?.viewerStatus === 'held').length;
      const usdzLive = importedObjects.filter((o) => o.asset?.format === 'usdz' && o.asset.viewerStatus === 'live').length;
      const batch = buildViewportAssetImportBatch(importedObjects, { projectId, importedAt });
      const heldNote = heldCount > 0 ? ` · ${heldCount} USDA/USD [HELD]` : '';
      const usdzNote = usdzLive > 0 ? ` · ${usdzLive} USDZ [PARTIAL preview]` : '';
      setAssetImportStatus(
        `${importedObjects.length} asset${importedObjects.length === 1 ? '' : 's'} staged (${liveCount} live hierarchy)${usdzNote}${heldNote} - ${formatViewportAssetSize(totalBytes)} - license review required`
      );
      void assetImportPersistence.persistBatch(batch).then((result) => {
        if (result.ok) {
          setAssetImportStatus(`${importedObjects.length} asset${importedObjects.length === 1 ? '' : 's'} saved to Asset Graph - license review required`);
          return;
        }
        setAssetImportStatus(`${importedObjects.length} asset${importedObjects.length === 1 ? '' : 's'} staged locally - ${result.error}`);
      });
    });
  }, [assetImportPersistence, handleImportPBRImages, objects, projectId, setObjects, setSelectedIds]);

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
    handleObjectTextureMapsChange,
  };
}
