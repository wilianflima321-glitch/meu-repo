'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createHMRBridge, type HMRBridge } from '@/lib/preview/hmr-bridge';
import { MagicWandChat } from './MagicWandChat';
import { useMagicWand } from './useMagicWand';
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell';
import { Outliner3D } from '@/components/ide/Outliner3D';
import { PropertiesPanel3D } from '@/components/ide/PropertiesPanel3D';
import { Timeline3D } from '@/components/ide/Timeline3D';
import {
  AethelViewport3D,
  SceneViewportInspector,
  SceneViewportOutliner,
  viewportSeedObjects,
  type ViewportSceneObject,
  type ViewportTransformMode,
  type ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type PreviewLifecycleState =
  | 'idle'
  | 'provisioning'
  | 'warming'
  | 'syncing'
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'offline';

export type PreviewStrategy = 'e2b' | 'webcontainer' | 'iframe' | 'inline' | 'none';

export interface PreviewRuntimeInfo {
  state: PreviewLifecycleState;
  strategy: PreviewStrategy;
  runtimeUrl: string | null;
  sandboxId: string | null;
  startedAt: number | null;
  latencyMs: number | null;
  error: string | null;
  hmrConnected: boolean;
  filesInSync: number;
  lastSyncAt: number | null;
}

const LIFECYCLE_LABELS: Record<PreviewLifecycleState, string> = {
  idle: 'Aguardando preview',
  provisioning: 'Iniciando sandbox...',
  warming: 'Aquecendo runtime...',
  syncing: 'Sincronizando arquivos do projeto...',
  healthy: 'Preview em execucao',
  degraded: 'Preview degradado',
  failed: 'Falha no preview',
  offline: 'Preview offline',
};

const STRATEGY_LABELS: Record<PreviewStrategy, string> = {
  e2b: 'sandbox gerenciado',
  webcontainer: 'webcontainer',
  iframe: 'runtime externo',
  inline: 'fallback inline',
  none: 'sem runtime',
};

const LIFECYCLE_COLORS: Record<PreviewLifecycleState, string> = {
  idle: 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]',
  provisioning: 'bg-[var(--aethel-warning)] animate-pulse',
  warming: 'bg-[var(--aethel-warning-light)] animate-pulse',
  syncing: 'bg-[var(--aethel-primary)] animate-pulse',
  healthy: 'bg-[var(--aethel-success)]',
  degraded: 'bg-[var(--aethel-warning)]',
  failed: 'bg-[var(--aethel-error)]',
  offline: 'bg-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)]',
};

// Dynamic imports
const LivePreview = dynamic(() => import('@/components/LivePreview'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

const PreviewPanel = dynamic(() => import('@/components/ide/PreviewPanel'), {
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

// ============================================================================
// SKELETON & UI PRIMITIVES
// ============================================================================

function PreviewSkeleton() {
  return (
    <div className="flex items-center justify-center h-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--aethel-primary)] border-t-transparent" aria-hidden="true" />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Carregando preview...</p>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            Conectando runtime, arquivos e superficie visual.
          </p>
        </div>
      </div>
    </div>
  );
}

function LifecycleIndicator({
  state,
  latencyMs,
  hmrConnected,
  strategy,
  filesInSync,
  lastSyncAt,
}: {
  state: PreviewLifecycleState;
  latencyMs: number | null;
  hmrConnected: boolean;
  strategy?: PreviewStrategy;
  filesInSync?: number;
  lastSyncAt?: number | null;
}) {
  const showHmrWarning = state === 'healthy' && strategy && strategy !== 'inline' && !hmrConnected;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] backdrop-blur-sm border-b border-[var(--aethel-border-secondary)]/50 text-xs">
      <div className={`w-2 h-2 rounded-full ${LIFECYCLE_COLORS[state]}`} />
      <span className="text-[var(--aethel-text-secondary)]">{LIFECYCLE_LABELS[state]}</span>
      {strategy && (
        <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
          {STRATEGY_LABELS[strategy]}
        </span>
      )}
      {latencyMs !== null && state === 'healthy' && (
        <span className="text-[var(--aethel-text-tertiary)]">{latencyMs}ms</span>
      )}
      {filesInSync !== undefined && filesInSync > 0 && (
        <span className="rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
          sincr {filesInSync}
        </span>
      )}
      {lastSyncAt ? (
        <span className="text-[var(--aethel-text-quaternary)]">
          atual. {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : null}
      {hmrConnected && (
        <span className="ml-auto flex items-center gap-1 text-[var(--aethel-success)]">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 1zm0 10a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 11z" />
            <path d="M4.5 4a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1-.708.708l-1.5-1.5A.5.5 0 0 1 4.5 4zm7 0a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708-.708l1.5-1.5A.5.5 0 0 1 11.5 4z" />
          </svg>
          HMR
        </span>
      )}
      {showHmrWarning && (
        <span className="ml-auto flex items-center gap-1 text-[var(--aethel-warning)]">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a.75.75 0 0 1 .66.39l6 11A.75.75 0 0 1 14 13H2a.75.75 0 0 1-.66-1.11l6-11A.75.75 0 0 1 8 1zm0 3.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-.75-.75zm0 7.5a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z" />
          </svg>
          HMR indisponivel
        </span>
      )}
    </div>
  );
}

function PreviewFailedState({
  error,
  onRetry,
  onFallback,
  strategy,
}: {
  error: string | null;
  onRetry: () => void;
  onFallback?: () => void;
  strategy?: PreviewStrategy;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] gap-4 p-6">
      <div className="w-12 h-12 rounded-full bg-[var(--aethel-error)]/10 flex items-center justify-center">
        <svg className="w-6 h-6 text-[var(--aethel-error)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-1">Falha no preview</h3>
        <p className="text-xs text-[var(--aethel-text-tertiary)] max-w-xs">
          {error || 'Nao foi possivel conectar ao runtime de preview.'}
        </p>
        {strategy && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            estrategia {STRATEGY_LABELS[strategy]}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          aria-label="Tentar novamente a inicializacao do preview"
          className="rounded-md bg-[var(--aethel-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-primary)] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
        >
          Tentar novamente
        </button>
        {onFallback && (
          <button
            type="button"
            onClick={onFallback}
            aria-label="Usar o preview inline como fallback"
            className="rounded-md bg-[var(--aethel-surface-quaternary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            Usar preview inline
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

function usePreviewRuntime(projectId?: string, autoProvision = false) {
  const [runtime, setRuntime] = useState<PreviewRuntimeInfo>({
    state: 'idle',
    strategy: 'none',
    runtimeUrl: null,
    sandboxId: null,
    startedAt: null,
    latencyMs: null,
    error: null,
    hmrConnected: false,
    filesInSync: 0,
    lastSyncAt: null,
  });

  const bridgeRef = useRef<HMRBridge | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const warmupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncResetRef = useRef<NodeJS.Timeout | null>(null);
  const hmrUnsubscribeRef = useRef<(() => void) | null>(null);

  const resolveStrategy = (payload: any): PreviewStrategy => {
    const provider = payload?.provider || payload?.metadata?.provider;
    const rawStrategy = payload?.strategy || payload?.metadata?.strategy;
    if (rawStrategy) {
      if (rawStrategy === 'browser-side') return 'webcontainer';
      if (rawStrategy === 'local') return 'iframe';
      if (rawStrategy === 'managed') return provider === 'e2b' ? 'e2b' : 'iframe';
      if (rawStrategy === 'inline') return 'inline';
    }
    const mode = payload?.metadata?.mode;
    if (mode === 'local_fallback') return 'iframe';
    if (provider === 'webcontainers') return 'webcontainer';
    if (provider === 'e2b') return 'e2b';
    if (mode === 'managed') return 'e2b';
    return 'iframe';
  };

  const startHealthPolling = useCallback((url: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (warmupTimeoutRef.current) clearTimeout(warmupTimeoutRef.current);

    const poll = async () => {
      try {
        const start = Date.now();
        const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(5000) });
        const latencyMs = Date.now() - start;

        setRuntime((prev) => ({
          ...prev,
          state: res.ok ? 'healthy' : 'degraded',
          latencyMs,
        }));
      } catch {
        setRuntime((prev) => {
          if (prev.state === 'warming') return prev; // still warming up
          return { ...prev, state: 'degraded', latencyMs: null };
        });
      }
    };

    // Initial check after short delay
    warmupTimeoutRef.current = setTimeout(poll, 2000);
    pollRef.current = setInterval(poll, 15000);
  }, []);

  const provision = useCallback(async () => {
    setRuntime((prev) => ({ ...prev, state: 'provisioning', error: null }));

    try {
      const res = await fetch('/api/preview/runtime-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId || 'default' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Falha ao provisionar (${res.status})`);
      }

      const data = await res.json();

      if (data.runtimeUrl) {
        const resolvedStrategy = resolveStrategy(data);
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: resolvedStrategy,
          runtimeUrl: data.runtimeUrl,
          sandboxId: data.sandboxId || null,
          startedAt: Date.now(),
        }));

        startHealthPolling(data.runtimeUrl);
      } else if (data.discoveryResult?.preferredRuntimeUrl) {
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: 'iframe',
          runtimeUrl: data.discoveryResult.preferredRuntimeUrl,
          startedAt: Date.now(),
          latencyMs: data.discoveryResult.candidates?.[0]?.latencyMs || null,
        }));
        startHealthPolling(data.discoveryResult.preferredRuntimeUrl);
      } else {
        setRuntime((prev) => ({
          ...prev,
          state: 'failed',
          error: 'Nenhum runtime de preview disponivel. Inicie um servidor local de desenvolvimento ou configure o E2B.',
        }));
      }
    } catch (err) {
      setRuntime((prev) => ({
        ...prev,
        state: 'failed',
        error: err instanceof Error ? err.message : 'Falha ao provisionar o preview.',
      }));
    }
  }, [projectId, startHealthPolling]);

  const connectHMR = useCallback((runtimeUrl: string) => {
    bridgeRef.current?.disconnect();
    hmrUnsubscribeRef.current?.();

    try {
      bridgeRef.current = createHMRBridge({
        runtimeUrl,
        hmrPathCandidates: ['/_next/webpack-hmr', '/__vite_hmr'],
        onConnectionChange: (connected) => {
          setRuntime((prev) => ({ ...prev, hmrConnected: connected }));
        },
        onUpdate: (message) => {
          if (message.type === 'full-reload' || message.type === 'update') {
            if (syncResetRef.current) clearTimeout(syncResetRef.current);
            const syncedAt = Date.now();
            setRuntime((prev) => ({
              ...prev,
              state: prev.strategy === 'inline' ? 'degraded' : 'syncing',
              filesInSync: prev.filesInSync + 1,
              lastSyncAt: syncedAt,
            }));
            syncResetRef.current = setTimeout(() => {
              setRuntime((prev) => ({
                ...prev,
                state: prev.strategy === 'inline' ? 'degraded' : 'healthy',
              }));
            }, 900);
          }
        },
        onError: () => {
          setRuntime((prev) => ({ ...prev, hmrConnected: false }));
        },
      });
      hmrUnsubscribeRef.current = bridgeRef.current.onStateChange((state) => {
        if (state === 'failed' || state === 'reconnecting') {
          setRuntime((prev) => {
            if (prev.strategy === 'inline') return prev;
            if (prev.state === 'degraded') return prev;
            return { ...prev, state: 'degraded' };
          });
        }
      });
    } catch {
      setRuntime((prev) => ({ ...prev, hmrConnected: false }));
    }
  }, []);

  const switchToInline = useCallback(() => {
    setRuntime((prev) => ({
      ...prev,
      state: 'degraded',
      strategy: 'inline',
      runtimeUrl: null,
      sandboxId: null,
      hmrConnected: false,
    }));
  }, []);

  useEffect(() => {
    if (autoProvision && runtime.state === 'idle') {
      provision();
    }
  }, [autoProvision, runtime.state, provision]);

  useEffect(() => {
    if (runtime.state === 'healthy' && runtime.runtimeUrl) {
      connectHMR(runtime.runtimeUrl);
    }
  }, [runtime.state, runtime.runtimeUrl, connectHMR]);

  useEffect(() => {
    return () => {
      bridgeRef.current?.disconnect();
      hmrUnsubscribeRef.current?.();
      if (pollRef.current) clearInterval(pollRef.current);
      if (warmupTimeoutRef.current) clearTimeout(warmupTimeoutRef.current);
      if (syncResetRef.current) clearTimeout(syncResetRef.current);
    };
  }, []);

  return { runtime, provision, switchToInline };
}

// ============================================================================
// CANONICAL SURFACE PROPS
// ============================================================================

type Point3 = { x: number; y: number; z: number };

type CanonicalLiveProps = {
  variant: 'live';
  suggestions: string[];
  onMagicWandSelect: (position: Point3) => void;
  onSendSuggestion: (suggestion: string) => void | Promise<void>;
  isGenerating: boolean;
};

type CanonicalRuntimeProps = {
  variant: 'runtime';
  title?: string;
  filePath?: string;
  content?: string;
  html?: string;
  projectId?: string;
  runtimeUrl?: string;
  forceInlineFallback?: boolean;
  runtimeUnavailableReason?: string;
  isStale?: boolean;
  onRefresh?: () => void;
  autoProvision?: boolean;
  showLifecycleBar?: boolean;
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

  return <RuntimePreview {...props} />;
}

function SceneViewportSurface({ renderMode }: { renderMode: 'draft' | 'cinematic' }) {
  const [objects, setObjects] = useState<ViewportSceneObject[]>(viewportSeedObjects);
  const [selectedIds, setSelectedIds] = useState<string[]>([viewportSeedObjects[0]?.id].filter(Boolean) as string[]);
  const [transformMode, setTransformMode] = useState<ViewportTransformMode>('translate');
  const [transformSpace, setTransformSpace] = useState<ViewportTransformSpace>('world');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [characterTool, setCharacterTool] = useState<'facial' | 'hair' | null>(null);
  const [facialBlendShapeCount, setFacialBlendShapeCount] = useState(0);
  const [hairPresetLabel, setHairPresetLabel] = useState('wavy');
  const selectedObject = objects.find((object) => object.id === selectedIds[0]) ?? null;

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
            renderMode={renderMode}
            isPlaying={isPlaying}
            onTogglePlayTest={() => setIsPlaying((current) => !current)}
            onObjectsChange={setObjects}
            onSelectionChange={setSelectedIds}
            onTransformModeChange={setTransformMode}
            onTransformSpaceChange={setTransformSpace}
            onSnapEnabledChange={setSnapEnabled}
            onAIAction={() => undefined}
          />
          {characterTool && (
            <div className="absolute inset-0 z-30 bg-[rgba(4,8,16,0.82)] backdrop-blur-sm">
              <div className="flex h-full flex-col overflow-hidden border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]">
                <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Character Workflow</p>
                    <h3 className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">
                      {characterTool === 'facial' ? 'Facial Animation Editor' : 'Hair & Fur Editor'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCharacterTool(null)}
                    aria-label="Fechar ferramenta contextual de personagem"
                    className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    Fechar
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {characterTool === 'facial' ? (
                    <FacialAnimationEditor
                      characterId={selectedObject?.id ?? 'viewport-character'}
                      onBlendShapeUpdate={(blendShapes) => {
                        const activeCount = Object.values(blendShapes).filter((value) => value > 0.01).length;
                        setFacialBlendShapeCount(activeCount);
                      }}
                    />
                  ) : (
                    <HairFurEditor
                      characterId={selectedObject?.id ?? 'viewport-character'}
                      onHairUpdate={(hairData) => {
                        setHairPresetLabel(hairData.preset);
                      }}
                    />
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
          onOpenFacialEditor={() => setCharacterTool('facial')}
          onOpenHairEditor={() => setCharacterTool('hair')}
          onTransformModeChange={setTransformMode}
          onTransformSpaceChange={setTransformSpace}
          onSnapEnabledChange={setSnapEnabled}
          onTogglePlayTest={() => setIsPlaying((current) => !current)}
        />
      }
      bottom={<Timeline3D duration={12} />}
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

function RuntimePreview(props: CanonicalRuntimeProps) {
  const {
    title,
    filePath,
    content,
    html,
    projectId,
    runtimeUrl: externalRuntimeUrl,
    forceInlineFallback,
    runtimeUnavailableReason,
    isStale,
    onRefresh,
    autoProvision = false,
    showLifecycleBar = true,
  } = props;

  const { runtime, provision, switchToInline } = usePreviewRuntime(projectId, autoProvision);
  const { magicWandState, openMagicWand, closeMagicWand, handleSendMessage } = useMagicWand((message, context) => {
    // Handle Magic Wand message - could be passed up to parent or sent to AI
    console.log('Magic Wand message:', message, context);
  });

  // Determine effective URL
  const effectiveUrl = externalRuntimeUrl || runtime.runtimeUrl;
  const effectiveStrategy = runtime.strategy === 'none' && externalRuntimeUrl ? 'iframe' : runtime.strategy;
  const useInline = forceInlineFallback || effectiveStrategy === 'inline' || !effectiveUrl;

  // Track effective state
  const effectiveState: PreviewLifecycleState = useMemo(() => {
    if (externalRuntimeUrl) return 'degraded';
    if (forceInlineFallback || effectiveStrategy === 'inline') return 'degraded';
    return runtime.state;
  }, [externalRuntimeUrl, forceInlineFallback, runtime.state, effectiveStrategy]);

  if (effectiveState === 'failed') {
    return (
      <div className="flex flex-col h-full">
        {showLifecycleBar && (
          <LifecycleIndicator state="failed" latencyMs={null} hmrConnected={false} strategy={effectiveStrategy} />
        )}
        <PreviewFailedState
          error={runtime.error ?? runtimeUnavailableReason ?? null}
          onRetry={provision}
          onFallback={switchToInline}
          strategy={effectiveStrategy}
        />
      </div>
    );
  }

  if (effectiveState === 'idle') {
    return (
      <div className="flex flex-col h-full">
        {showLifecycleBar && (
          <LifecycleIndicator state="idle" latencyMs={null} hmrConnected={false} />
        )}
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--aethel-surface-primary)] px-6 text-center">
          <div className="max-w-md space-y-2">
            <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">Preview pronto para iniciar</h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {runtimeUnavailableReason || 'Inicie o runtime gerenciado ou use o fallback inline para continuar sem prometer um preview remoto ativo.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={provision}
              className="rounded-md bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:brightness-110"
            >
              Iniciar preview
            </button>
            <button
              type="button"
              onClick={switchToInline}
              className="rounded-md border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Usar fallback inline
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveState === 'provisioning' || effectiveState === 'warming') {
    return (
      <div className="flex flex-col h-full">
        {showLifecycleBar && (
          <LifecycleIndicator state={effectiveState} latencyMs={null} hmrConnected={false} strategy={effectiveStrategy} />
        )}
        <PreviewSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showLifecycleBar && (
        <LifecycleIndicator
          state={effectiveState}
          latencyMs={runtime.latencyMs}
          hmrConnected={runtime.hmrConnected}
          strategy={effectiveStrategy}
          filesInSync={runtime.filesInSync}
          lastSyncAt={runtime.lastSyncAt}
        />
      )}
      <div className="flex-1 relative">
        <PreviewPanel
          title={title}
          filePath={filePath}
          content={content}
          html={html}
          projectId={projectId}
          runtimeUrl={effectiveUrl || undefined}
          forceInlineFallback={useInline}
          runtimeUnavailableReason={runtimeUnavailableReason}
          isStale={isStale}
          onRefresh={onRefresh}
        />
        {useInline && !externalRuntimeUrl && (
          <div className="absolute left-1 top-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-warning)]">
            Fallback inline
          </div>
        )}
        {isStale && (
          <div className="absolute top-1 right-1 px-2 py-0.5 bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)] text-[10px] rounded-full">
            Desatualizado
          </div>
        )}
        {/* Magic Wand Button */}
        <button
          type="button"
          onClick={(e) => openMagicWand(e)}
          className="absolute bottom-4 right-4 rounded-full bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] p-3 shadow-lg transition hover:brightness-110 hover:scale-105"
          title="Magic Wand - Clique em um elemento para editar com IA"
          aria-label="Magic Wand"
        >
          <svg className="w-5 h-5 text-[var(--aethel-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        {/* Magic Wand Chat */}
        {magicWandState.isOpen && (
          <MagicWandChat
            position={magicWandState.position}
            elementInfo={magicWandState.elementInfo}
            onClose={closeMagicWand}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
}
