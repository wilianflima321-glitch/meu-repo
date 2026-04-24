'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { type CanonicalRuntimeProps } from '@/components/preview/previewRuntime.types';
import { PreviewSkeleton } from '@/components/preview/PreviewLifecycleChrome';
import RuntimePreviewSurface from '@/components/preview/RuntimePreviewSurface';
import {
  cloneViewportObject,
  deriveAbilityAccent,
  deriveFacialExpressionIntensity,
  deriveHairPreviewSignature,
  deriveVfxGlowIntensity,
  deriveVisualScriptPreviewPatch,
  INITIAL_VIEWPORT_VISUAL_SCRIPT,
} from '@/components/preview/sceneViewportDerivations';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';
import { Outliner3D } from '@/components/ide/Outliner3D';
import { PropertiesPanel3D } from '@/components/ide/PropertiesPanel3D';
import { Timeline3D } from '@/components/ide/Timeline3D';
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
import TimelineOverlay from '@/components/viewport/TimelineOverlay';
import type { VisualScript } from '@/components/visual-scripting/VisualScriptEditor';
import type { VFXGraph } from '@/components/editors/VFXGraphEditor';
import type { GameplayAbilitySpec } from '@/lib/gameplay-ability-system';


// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

// Dynamic imports
const LivePreview = dynamic(() => import('@/components/LivePreview'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

const NexusCanvasV2 = dynamic(
  () => import('@/components/nexus/NexusCanvasV2').then((mod) => mod.NexusCanvasV2),
  { ssr: false }
);

const FacialAnimationEditor = dynamic(
  () => import('@/components/character/FacialAnimationEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const HairFurEditor = dynamic(
  () => import('@/components/character/HairFurEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const VisualScriptEditor = dynamic(
  () => import('@/components/visual-scripting/VisualScriptEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const VFXGraphEditor = dynamic(
  () => import('@/components/editors/VFXGraphEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

const AbilityEditor = dynamic(
  () => import('@/components/engine/AbilityEditor'),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

// ============================================================================
// CANONICAL SURFACE PROPS
// ============================================================================

type Point3 = { x: number; y: number; z: number };
type ViewportWorkflowTool = 'facial' | 'hair' | 'visual-script' | 'vfx' | 'ability';

type CanonicalLiveProps = {
  variant: 'live';
  suggestions: string[];
  onMagicWandSelect: (position: Point3) => void;
  onSendSuggestion: (suggestion: string) => void | Promise<void>;
  isGenerating: boolean;
};

type CanonicalSceneProps = {
  variant: 'scene';
  renderMode?: 'draft' | 'cinematic';
};

type CanonicalCanvasProps = {
  variant: 'canvas';
  renderMode?: 'draft' | 'cinematic';
};

export type CanonicalPreviewSurfaceProps =
  | CanonicalLiveProps
  | CanonicalRuntimeProps
  | CanonicalSceneProps
  | CanonicalCanvasProps;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Canonical preview authority for product-facing surfaces.
 *
 * Supports three variants:
 * - 'live': 3D live preview with AI suggestions
 * - 'runtime': Code preview with E2B/WebContainer/iframe/inline fallback
 * - 'scene': 3D scene preview (Nexus Canvas)
 *
 * Runtime variant includes full lifecycle management:
 * idle -> provisioning -> warming -> syncing -> healthy / degraded / failed
 *
 * @see docs/master/DUPLICATIONS_AND_CONFLICTS.md (C-07)
 */
export default function CanonicalPreviewSurface(props: CanonicalPreviewSurfaceProps) {
  if (props.variant === 'live') {
    return (
      <LivePreview
        onMagicWandSelect={props.onMagicWandSelect}
        suggestions={props.suggestions}
        onSendSuggestion={props.onSendSuggestion}
        isGenerating={props.isGenerating}
      />
    );
  }

  if (props.variant === 'scene') {
    return <SceneViewportSurface renderMode={props.renderMode ?? 'draft'} />;
  }

  if (props.variant === 'canvas') {
    return <CanvasViewportSurface renderMode={props.renderMode ?? 'draft'} />;
  }

  return <RuntimePreviewSurface {...props} />;
}

function SceneViewportSurface({ renderMode }: { renderMode: 'draft' | 'cinematic' }) {
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
  const [exportStatus, setExportStatus] = useState('Viewport ready');
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

  const activeWorkflowLabel =
    workflowTool === 'visual-script'
      ? 'Visual Script'
      : workflowTool === 'vfx'
        ? 'VFX Graph'
        : workflowTool === 'ability'
          ? 'Ability'
          : workflowTool === 'facial'
            ? 'Facial'
            : workflowTool === 'hair'
              ? 'Hair'
              : 'Nenhum';

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
        visualScriptNodes: visualScript.nodes.length,
        visualScriptEdges: visualScript.edges.length,
        vfxNodes: vfxGraph?.nodes.length ?? 0,
        vfxConnections: vfxGraph?.connections.length ?? 0,
        selectedAbility: selectedAbility?.name ?? null,
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
    selectedAbility?.name,
    selectedObject?.id,
    selectedObject?.name,
    timelineDuration,
    timelineTime,
    vfxGraph,
    visualScript.edges.length,
    visualScript.nodes.length,
  ]);

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
            <div className="absolute inset-0 z-30 bg-[rgba(4,8,16,0.82)] backdrop-blur-sm">
              <div className="flex h-full flex-col overflow-hidden border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]">
                <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Viewport Workflow</p>
                    <h3 className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">
                      {workflowTool === 'facial'
                        ? 'Facial Animation Editor'
                        : workflowTool === 'hair'
                          ? 'Hair & Fur Editor'
                          : workflowTool === 'visual-script'
                            ? 'Visual Script Editor'
                            : workflowTool === 'vfx'
                              ? 'VFX Graph Editor'
                              : 'Ability Editor'}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">
                      {workflowTool === 'visual-script'
                        ? 'Os nos Move, Rotate e Add Force refletem no objeto selecionado em tempo real.'
                        : workflowTool === 'vfx'
                          ? 'Emitter, module e renderer agora alimentam glow e leitura cinematica no objeto ativo.'
                          : workflowTool === 'ability'
                            ? 'Abilities e preview agora podem colorir e orientar o play test do objeto ativo.'
                            : 'Ferramenta contextual de personagem conectada ao mesmo objeto 3D.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWorkflowTool(null)}
                    aria-label="Fechar ferramenta contextual do viewport"
                    className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    Fechar
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {workflowTool === 'facial' ? (
                    <FacialAnimationEditor
                      characterId={selectedObject?.id ?? 'viewport-character'}
                      onBlendShapeUpdate={(blendShapes) => {
                        const activeCount = Object.values(blendShapes).filter((value) => value > 0.01).length;
                        setFacialBlendShapeCount(activeCount);
                        setFacialExpressionIntensity(deriveFacialExpressionIntensity(blendShapes));
                      }}
                    />
                  ) : workflowTool === 'hair' ? (
                    <HairFurEditor
                      characterId={selectedObject?.id ?? 'viewport-character'}
                      onHairUpdate={(hairData) => {
                        const signature = deriveHairPreviewSignature(hairData);
                        setHairPresetLabel(signature.label);
                        setHairHighlightColor(signature.color);
                        setHairVolumeIntensity(signature.density);
                      }}
                    />
                  ) : workflowTool === 'visual-script' ? (
                    <VisualScriptEditor script={visualScript} onChange={handleVisualScriptChange} />
                  ) : workflowTool === 'vfx' ? (
                    <VFXGraphEditor onGraphChange={setVfxGraph} />
                  ) : (
                    <AbilityEditor entityId={selectedObject?.id ?? 'viewport-entity'} onAbilityChange={setSelectedAbility} />
                  )}
                </div>
              </div>
            </div>
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

function CanvasViewportSurface({ renderMode }: { renderMode: 'draft' | 'cinematic' }) {
  return (
    <ViewportWorkbenchShell
      mode="canvas"
      title="Aethel Canvas Mode"
      subtitle={`Canvas conectado ao projeto para explorar variantes, research visual e composicao ${renderMode}.`}
      left={<Outliner3D />}
      center={<NexusCanvasV2 renderMode={renderMode} />}
      right={<PropertiesPanel3D />}
      bottom={<Timeline3D duration={8} />}
    />
  );
}
