'use client';

import { useCallback, useState } from 'react';
import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type {
  ViewportCreativeMode,
  ViewportSceneObject,
} from '@/components/viewport/AethelViewport3D';

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
};

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
}: UseViewportExportParams) {
  const [exportStatus, setExportStatus] = useState('Viewport ready');

  const handleExportViewport = useCallback(() => {
    const payload = {
      mode: creativeMode,
      exportedAt: new Date().toISOString(),
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

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aethel-${creativeMode}-viewport-export.json`;
    link.click();
    URL.revokeObjectURL(url);

    setExportStatus(creativeMode === 'film' ? 'Film export downloaded' : 'Game clip manifest downloaded');
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
    handleExportViewport,
  };
}
