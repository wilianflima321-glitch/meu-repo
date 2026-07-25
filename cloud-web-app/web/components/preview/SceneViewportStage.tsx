'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AethelViewport3D } from '@/components/viewport/AethelViewport3D';
import { AETHEL_ASSET_DRAG_MIME } from '@aethel/ide-ui/FileExplorerTree';
import { useGizmoTransformPersistence } from '@/hooks/useGizmoTransformPersistence';
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls';
import { useViewportStore } from '@/lib/viewport/useViewportStore';
import { FlyCameraHUD } from '@/components/viewport/FlyCameraHUD';
import { ViewportContextMenu } from '@/components/viewport/ViewportContextMenu';
import { ViewportDropGhost } from '@/components/viewport/ViewportDropGhost';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';

import SceneViewportWorkflowDrawer from './SceneViewportWorkflowDrawer';
import { RendererHonestyBadge } from './RendererHonestyBadge';
import { ConsolidationTruthBadge } from './ConsolidationTruthBadge';
import { TerrainHeightfieldBrushPanel } from './TerrainHeightfieldBrushPanel';
import { MultiplayerHonestyBadge } from '@/components/multiplayer/MultiplayerHonestyBadge';
import { KernelRustFoundationHonestyBadge } from '@/components/kernel/KernelRustFoundationHonestyBadge';
import type { useSceneViewportSurfaceState } from './useSceneViewportSurfaceState';

/**
 * Deterministic, instantly-visible material stand-in for a dropped texture
 * (FASE 3.4). Real bitmap texture loading needs this codebase's asset byte-
 * serving endpoint (not present here) — hashing the path into a stable HSL
 * color gives an honest, real, immediate visual change per unique asset
 * (same texture always maps to the same color) rather than faking a texture
 * load. See `appliedAssetPath` on `ViewportSceneObject` for the follow-up hook.
 */
function deriveColorFromAssetPath(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = (hash * 31 + path.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 68%, 58%)`;
}

type SceneViewportStageProps = Pick<
  ReturnType<typeof useSceneViewportSurfaceState>,
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
  const {
    objects,
    selectedIds,
    transformMode,
    transformSpace,
    snapEnabled,
    setObjects,
    setSelectedIds,
    setTransformMode,
    setTransformSpace,
    setSnapEnabled,
  } = useViewportStore();

  // ── Fly-camera HUD ─────────────────────────────────────
  const [isFlyCameraActive, setIsFlyCameraActive] = useState(false);
  const [flySpeed, setFlySpeed] = useState(1);
  const rightMouseDown = useRef(false);
  const wasdActive = useRef(false);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => { if (e.button === 2) rightMouseDown.current = true; };
    const onMouseUp   = (e: MouseEvent) => {
      if (e.button === 2) {
        rightMouseDown.current = false;
        if (!wasdActive.current) setIsFlyCameraActive(false);
      }
    };
    const onKeyDown   = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(e.key.toLowerCase()) && rightMouseDown.current) {
        wasdActive.current = true;
        setIsFlyCameraActive(true);
      }
    };
    const onKeyUp     = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(e.key.toLowerCase())) {
        wasdActive.current = false;
        if (!rightMouseDown.current) setIsFlyCameraActive(false);
      }
    };
    const onWheel     = (e: WheelEvent) => {
      if (rightMouseDown.current) {
        setFlySpeed((prev) => Math.max(0.1, Math.min(10, prev - e.deltaY * 0.001)));
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('keydown',   onKeyDown);
    window.addEventListener('keyup',     onKeyUp);
    window.addEventListener('wheel',     onWheel, { passive: true });
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('keydown',   onKeyDown);
      window.removeEventListener('keyup',     onKeyUp);
      window.removeEventListener('wheel',     onWheel);
    };
  }, []);

  // ── Context menu ────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({
    isOpen: false, x: 0, y: 0,
  });
  const handleViewportContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu((m) => ({ ...m, isOpen: false })), []);
  const handleContextMenuAction = useCallback((id: string) => {
    closeContextMenu();
    if (id === 'delete' && selectedIds.length > 0) {
      setObjects((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
    }
    if (id === 'duplicate' && selectedIds.length > 0) {
      setObjects((prev) => {
        const copies = prev
          .filter((o) => selectedIds.includes(o.id))
          .map((o) => ({ ...o, id: `${o.id}-copy-${Date.now()}`, position: [o.position[0] + 1, o.position[1], o.position[2]] as [number, number, number] }));
        return [...prev, ...copies];
      });
    }
  }, [closeContextMenu, selectedIds, setObjects]);

  // ── Drop ghost — wired to HTML5 drag events from asset browser ──────────
  const [dropGhost, setDropGhost] = useState<{ active: boolean; x: number; y: number; label: string }>({
    active: false, x: 0, y: 0, label: '',
  });

  // FASE 3.4 — Drag-and-Drop 3D Absolute: registered by the R3F canvas
  // (`AssetDropRaycastBridge` inside `ViewportSceneCanvas.runtime.tsx`) so
  // this DOM-level drop handler can ask "what mesh is under the cursor?".
  const resolveObjectAtClientPositionRef = useRef<((clientX: number, clientY: number) => string | null) | null>(null);
  const handleRaycastReady = useCallback((resolve: (clientX: number, clientY: number) => string | null) => {
    resolveObjectAtClientPositionRef.current = resolve;
  }, []);

  const parseAssetDragPayload = useCallback((e: React.DragEvent): { path: string; name: string; kind: 'texture' | 'material' } | null => {
    if (!e.dataTransfer.types.includes(AETHEL_ASSET_DRAG_MIME)) return null;
    try {
      const raw = e.dataTransfer.getData(AETHEL_ASSET_DRAG_MIME);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.path === 'string' && (parsed.kind === 'texture' || parsed.kind === 'material')) {
        return parsed;
      }
    } catch {
      // Not a structured asset payload — caller falls back to the plain-text path.
    }
    return null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const structuredAsset = parseAssetDragPayload(e);
    const assetName = structuredAsset?.name
      ?? (e.dataTransfer.types.includes('text/aethel-asset')
        ? (e.dataTransfer.getData('text/aethel-asset') || 'Asset')
        : e.dataTransfer.types.includes('text/plain')
        ? (e.dataTransfer.getData('text/plain') || 'Asset')
        : null);
    if (!assetName) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropGhost({ active: true, x: e.clientX, y: e.clientY, label: structuredAsset ? `Apply ${structuredAsset.name}` : assetName });
  }, [parseAssetDragPayload]);

  const handleDragLeave = useCallback(() => {
    setDropGhost((g) => ({ ...g, active: false }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropGhost({ active: false, x: 0, y: 0, label: '' });

    const structuredAsset = parseAssetDragPayload(e);
    if (structuredAsset) {
      const targetObjectId = resolveObjectAtClientPositionRef.current?.(e.clientX, e.clientY) ?? null;
      if (targetObjectId) {
        setObjects((prev) => prev.map((object) => (
          object.id === targetObjectId
            ? { ...object, color: deriveColorFromAssetPath(structuredAsset.path), appliedAssetPath: structuredAsset.path }
            : object
        )));
        return;
      }
      // Texture/material dropped over empty space — nothing to apply it to; no-op rather than spawning a stray mesh.
      return;
    }

    const assetName = e.dataTransfer.getData('text/aethel-asset') || e.dataTransfer.getData('text/plain') || 'Dropped Asset';
    if (!assetName) return;
    // Spawn a placeholder object at centre of viewport
    setObjects((prev) => [
      ...prev,
      {
        id: `imported-${Date.now()}`,
        name: assetName,
        type: 'mesh' as const,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        visible: true,
        locked: false,
        color: resolveCssVarColor('--aethel-info', 'rgb(56, 189, 248)'),
      },
    ]);
  }, [parseAssetDragPayload, setObjects]);

  return (
    <div
      className="relative h-full"
      onContextMenu={handleViewportContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
        onRaycastReady={handleRaycastReady}
        terrainProjectId={projectId}
      />

      {/* Focus 2A/C4 — honesty chrome; Focus 2B/C3 — durable terrain brush; Block 2B.3 MP honesty; letter dp kernel foundation */}
      <RendererHonestyBadge projectId={projectId} />
      <ConsolidationTruthBadge projectId={projectId} />
      <MultiplayerHonestyBadge projectId={projectId} />
      <KernelRustFoundationHonestyBadge />
      <TerrainHeightfieldBrushPanel projectId={projectId} />

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

      {/* Fly-camera HUD */}
      <FlyCameraHUD isActive={isFlyCameraActive} speed={flySpeed} />

      {/* Viewport right-click context menu */}
      <ViewportContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        objectName={selectedObject?.name}
        onClose={closeContextMenu}
        onAction={handleContextMenuAction}
      />

      {/* Asset drop ghost — follows cursor while dragging */}
      <ViewportDropGhost
        active={dropGhost.active}
        cursorX={dropGhost.x}
        cursorY={dropGhost.y}
        label={dropGhost.label}
      />
    </div>
  );
}
