'use client';

import { useCallback, useState } from 'react';
import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type {
  ViewportCreativeMode,
  ViewportSceneObject,
} from '@/components/viewport/AethelViewport3D';
import { useViewportRenderJobPersistence } from '@/hooks/useViewportRenderJobPersistence';
import {
  buildViewportRenderJobContract,
  type ViewportRenderQuality,
  type ViewportRenderSurfaceMode,
} from '@/lib/viewport/viewport-render-contract';

type UseViewportExportParams = {
  activeWorkflowLabel: string;
  creativeMode: ViewportCreativeMode;
  facialBlendShapeCount: number;
  facialExpressionIntensity: number;
  hairHighlightColor: string | null;
  hairPresetLabel: string;
  hairVolumeIntensity: number;
  isPlaying: boolean;
  objects: ViewportSceneObject[];
  selectedAbilityName: string | null;
  selectedObject: {
    id: string;
    name: string;
  } | null;
  timelineDuration: number;
  timelineTime: number;
  vfxGraph: VFXGraph | null;
  visualScriptEdgeCount: number;
  visualScriptNodeCount: number;
  projectId?: string | null;
  renderMode: ViewportRenderSurfaceMode;
};

function downloadViewportManifest(payload: unknown, mode: ViewportCreativeMode) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aethel-${mode}-viewport-render-contract.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function useViewportExport({
  activeWorkflowLabel,
  creativeMode,
  facialBlendShapeCount,
  facialExpressionIntensity,
  hairHighlightColor,
  hairPresetLabel,
  hairVolumeIntensity,
  isPlaying,
  objects,
  selectedAbilityName,
  selectedObject,
  timelineDuration,
  timelineTime,
  vfxGraph,
  visualScriptEdgeCount,
  visualScriptNodeCount,
  projectId,
  renderMode,
}: UseViewportExportParams) {
  const [exportStatus, setExportStatus] = useState('Viewport ready');
  const [renderQuality, setRenderQuality] = useState<ViewportRenderQuality>('draft');
  const renderPersistence = useViewportRenderJobPersistence(projectId);

  const handleExportViewport = useCallback(async () => {
    const assetFormats = objects.reduce<string[]>((formats, object) => {
      if (object.asset) formats.push(object.asset.format);
      return formats;
    }, []);
    const assetCount = objects.filter((object) => object.asset).length;
    const contract = buildViewportRenderJobContract({
      projectId,
      mode: creativeMode,
      renderMode,
      quality: renderQuality,
      selectedObjectId: selectedObject?.id ?? null,
      selectedObjectName: selectedObject?.name ?? null,
      timeline: {
        currentTime: timelineTime,
        duration: timelineDuration,
        isPlaying,
      },
      scene: {
        objectCount: objects.length,
        assetCount,
        selectedObjectId: selectedObject?.id ?? null,
        selectedObjectName: selectedObject?.name ?? null,
        assetFormats,
        visualScriptNodes: visualScriptNodeCount,
        visualScriptEdges: visualScriptEdgeCount,
        vfxNodes: vfxGraph?.nodes.length ?? 0,
        vfxConnections: vfxGraph?.connections.length ?? 0,
      },
    });
    const payload = {
      mode: creativeMode,
      exportedAt: new Date().toISOString(),
      renderContract: contract,
      selectedObjectId: selectedObject?.id ?? null,
      selectedObjectName: selectedObject?.name ?? null,
      timeline: {
        currentTime: timelineTime,
        duration: timelineDuration,
        isPlaying,
      },
      workflow: {
        active: activeWorkflowLabel,
        visualScriptNodes: visualScriptNodeCount,
        visualScriptEdges: visualScriptEdgeCount,
        vfxNodes: vfxGraph?.nodes.length ?? 0,
        vfxConnections: vfxGraph?.connections.length ?? 0,
        selectedAbility: selectedAbilityName,
      },
      character: {
        facialBlendShapeCount,
        facialExpressionIntensity,
        hairPresetLabel,
        hairHighlightColor,
        hairVolumeIntensity,
      },
      objects,
    };

    setExportStatus(`${contract.profile.label} contract staged`);
    const result = await renderPersistence.persistContract(contract, { enqueue: true });
    downloadViewportManifest(payload, creativeMode);

    if (result.ok) {
      if (result.queued) {
        setExportStatus(`${contract.profile.label} queued - evidence required`);
        return;
      }
      setExportStatus(`${contract.profile.label} saved - ${result.message ?? 'queue not started'}`);
      return;
    }

    setExportStatus(`${contract.profile.label} downloaded locally - ${result.error}`);
  }, [
    activeWorkflowLabel,
    creativeMode,
    facialBlendShapeCount,
    facialExpressionIntensity,
    hairHighlightColor,
    hairPresetLabel,
    hairVolumeIntensity,
    isPlaying,
    objects,
    projectId,
    renderMode,
    renderPersistence,
    renderQuality,
    selectedAbilityName,
    selectedObject,
    timelineDuration,
    timelineTime,
    vfxGraph,
    visualScriptEdgeCount,
    visualScriptNodeCount,
  ]);

  return {
    exportStatus,
    renderQuality,
    setRenderQuality,
    handleExportViewport,
  };
}
