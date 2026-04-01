'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createHMRBridge, type HMRBridge } from '@/lib/preview/hmr-bridge';

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
  idle: 'Preview aguardando inicializacao',
  provisioning: 'Iniciando sandbox...',
  warming: 'Aquecendo runtime...',
  syncing: 'Sincronizando arquivos...',
  healthy: 'Preview ativo',
  degraded: 'Preview em fallback',
  failed: 'Preview indisponivel',
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

// ============================================================================
// SKELETON & UI PRIMITIVES
// ============================================================================

function PreviewSkeleton() {
  return (
    <div className="flex items-center justify-center h-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--aethel-info)] border-t-transparent" />
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
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] backdrop-blur-sm border-b border-[var(--aethel-border-secondary)]/50 text-xs">
      <div className={`w-2 h-2 rounded-full ${LIFECYCLE_COLORS[state]}`} />
      <span className="text-[var(--aethel-text-secondary)]">{LIFECYCLE_LABELS[state]}</span>
      {strategy && (
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
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
        <h3 className="text-sm font-medium text-[var(--aethel-text-primary)] mb-1">Preview indisponivel</h3>
        <p className="text-xs text-[var(--aethel-text-tertiary)] max-w-xs">
          {error || 'Nao foi possivel conectar o preview ao runtime atual.'}
        </p>
        {strategy && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            estrategia {STRATEGY_LABELS[strategy]}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="rounded-md bg-[var(--aethel-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-primary)] transition-colors hover:brightness-110"
        >
          Tentar novamente
        </button>
        {onFallback && (
          <button
            onClick={onFallback}
            className="px-3 py-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] text-[var(--aethel-text-secondary)] rounded-md transition-colors"
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
          error: 'Nenhum runtime de preview disponivel. Inicie um servidor local ou configure o sandbox gerenciado.',
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

export type CanonicalPreviewSurfaceProps = CanonicalLiveProps | CanonicalRuntimeProps | CanonicalSceneProps;

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
    return <NexusCanvasV2 renderMode={props.renderMode ?? 'draft'} />;
  }

  return <RuntimePreview {...props} />;
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
              className="rounded-md bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
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
      </div>
    </div>
  );
}
