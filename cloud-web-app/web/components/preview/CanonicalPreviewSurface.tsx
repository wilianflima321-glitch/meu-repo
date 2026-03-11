'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

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
  idle: 'Waiting for preview',
  provisioning: 'Starting sandbox...',
  warming: 'Warming up runtime...',
  syncing: 'Syncing project files...',
  healthy: 'Preview running',
  degraded: 'Preview degraded',
  failed: 'Preview failed',
  offline: 'Preview offline',
};

const LIFECYCLE_COLORS: Record<PreviewLifecycleState, string> = {
  idle: 'bg-slate-600',
  provisioning: 'bg-amber-500 animate-pulse',
  warming: 'bg-amber-400 animate-pulse',
  syncing: 'bg-blue-500 animate-pulse',
  healthy: 'bg-emerald-500',
  degraded: 'bg-orange-500',
  failed: 'bg-red-500',
  offline: 'bg-slate-500',
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
    <div className="flex items-center justify-center h-full bg-slate-950 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading preview...</p>
      </div>
    </div>
  );
}

function LifecycleIndicator({
  state,
  latencyMs,
  hmrConnected,
}: {
  state: PreviewLifecycleState;
  latencyMs: number | null;
  hmrConnected: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 text-xs">
      <div className={`w-2 h-2 rounded-full ${LIFECYCLE_COLORS[state]}`} />
      <span className="text-slate-300">{LIFECYCLE_LABELS[state]}</span>
      {latencyMs !== null && state === 'healthy' && (
        <span className="text-slate-500">{latencyMs}ms</span>
      )}
      {hmrConnected && (
        <span className="ml-auto flex items-center gap-1 text-emerald-400">
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
}: {
  error: string | null;
  onRetry: () => void;
  onFallback?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-slate-300 gap-4 p-6">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-slate-200 mb-1">Preview Failed</h3>
        <p className="text-xs text-slate-500 max-w-xs">{error || 'Could not connect to preview runtime'}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
        >
          Retry
        </button>
        {onFallback && (
          <button
            onClick={onFallback}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
          >
            Use Inline Preview
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

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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
        throw new Error(data.error || data.message || `Provision failed (${res.status})`);
      }

      const data = await res.json();

      if (data.runtimeUrl) {
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: data.strategy || 'e2b',
          runtimeUrl: data.runtimeUrl,
          sandboxId: data.sandboxId || null,
          startedAt: Date.now(),
        }));

        // Start health polling
        startHealthPolling(data.runtimeUrl);
      } else if (data.discoveryResult?.preferredRuntimeUrl) {
        setRuntime((prev) => ({
          ...prev,
          state: 'healthy',
          strategy: 'iframe',
          runtimeUrl: data.discoveryResult.preferredRuntimeUrl,
          startedAt: Date.now(),
          latencyMs: data.discoveryResult.candidates?.[0]?.latencyMs || null,
        }));
      } else {
        setRuntime((prev) => ({
          ...prev,
          state: 'failed',
          error: 'No preview runtime available. Start a local dev server or configure E2B.',
        }));
      }
    } catch (err) {
      setRuntime((prev) => ({
        ...prev,
        state: 'failed',
        error: err instanceof Error ? err.message : 'Unknown provision error',
      }));
    }
  }, [projectId]);

  const startHealthPolling = useCallback((url: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

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
    setTimeout(poll, 2000);
    pollRef.current = setInterval(poll, 15000);
  }, []);

  const connectHMR = useCallback((runtimeUrl: string) => {
    if (wsRef.current) wsRef.current.close();

    try {
      const wsUrl = runtimeUrl.replace(/^http/, 'ws') + '/_next/webpack-hmr';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setRuntime((prev) => ({ ...prev, hmrConnected: true }));
      };

      ws.onclose = () => {
        setRuntime((prev) => ({ ...prev, hmrConnected: false }));
      };

      ws.onerror = () => {
        setRuntime((prev) => ({ ...prev, hmrConnected: false }));
      };

      wsRef.current = ws;
    } catch {
      // WebSocket not available for this runtime
    }
  }, []);

  const switchToInline = useCallback(() => {
    setRuntime((prev) => ({
      ...prev,
      state: 'healthy',
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
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
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
 * idle → provisioning → warming → syncing → healthy / degraded / failed
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
  const useInline = forceInlineFallback || runtime.strategy === 'inline' || !effectiveUrl;

  // Track effective state
  const effectiveState: PreviewLifecycleState = useMemo(() => {
    if (externalRuntimeUrl) return 'healthy';
    if (forceInlineFallback) return 'healthy';
    return runtime.state;
  }, [externalRuntimeUrl, forceInlineFallback, runtime.state]);

  if (effectiveState === 'failed') {
    return (
      <div className="flex flex-col h-full">
        {showLifecycleBar && (
          <LifecycleIndicator state="failed" latencyMs={null} hmrConnected={false} />
        )}
        <PreviewFailedState
          error={runtime.error || runtimeUnavailableReason}
          onRetry={provision}
          onFallback={switchToInline}
        />
      </div>
    );
  }

  if (effectiveState === 'idle' || effectiveState === 'provisioning' || effectiveState === 'warming') {
    return (
      <div className="flex flex-col h-full">
        {showLifecycleBar && (
          <LifecycleIndicator state={effectiveState} latencyMs={null} hmrConnected={false} />
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
        {isStale && (
          <div className="absolute top-1 right-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full">
            Stale
          </div>
        )}
      </div>
    </div>
  );
}
