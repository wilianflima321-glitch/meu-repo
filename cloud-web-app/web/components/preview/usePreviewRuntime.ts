'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { type PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types';
import {
  derivePreviewRecommendedAction,
  extractPreviewSandboxId,
  INITIAL_PREVIEW_RUNTIME,
  type PreviewRuntimePayload,
  resolvePreviewStrategy,
} from '@/components/preview/previewRuntimeState';
import { usePreviewRuntimeHealthMonitor } from '@/components/preview/usePreviewRuntimeHealthMonitor';
import { usePreviewRuntimeHmrBridge } from '@/components/preview/usePreviewRuntimeHmrBridge';
import { requestPreviewHotUpdate } from '@/lib/preview/runtime-manager';
import {
  forcePreviewIframeReload,
  PREVIEW_APPLY_SUCCESS_EVENT,
  publishPreviewHotUpdateResult,
  type PreviewApplySuccessDetail,
} from '@/lib/preview/preview-hot-update';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('usePreviewRuntime');

function isPreviewRuntimePayload(value: unknown): value is PreviewRuntimePayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPayloadText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function usePreviewRuntime(projectId?: string, autoProvision = false) {
  const [runtime, setRuntime] = useState<PreviewRuntimeInfo>(INITIAL_PREVIEW_RUNTIME);
  const sandboxIdRef = useRef<string | null>(null);
  const hmrConnectedRef = useRef(false);
  const { clearHealthPolling, startHealthPolling } = usePreviewRuntimeHealthMonitor(setRuntime);
  const { clearHmrBridge, connectHMR } = usePreviewRuntimeHmrBridge(setRuntime);

  useEffect(() => {
    hmrConnectedRef.current = runtime.hmrConnected;
  }, [runtime.hmrConnected]);

  useEffect(() => {
    sandboxIdRef.current = runtime.sandboxId;
  }, [runtime.sandboxId]);

  const teardownSession = useCallback(async (sandboxId: string | null) => {
    if (!sandboxId) return;
    try {
      await fetch('/api/preview/runtime-teardown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxSessionId: sandboxId, sandboxId }),
      });
    } catch {
      // Best-effort teardown — surface stays fail-closed without claiming remote runtime.
    }
  }, []);

  const extractRuntimeContext = useCallback((payload: PreviewRuntimePayload) => {
    const metadata = payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : null;
    const provider =
      typeof payload?.provider === 'string'
        ? payload.provider
        : typeof metadata?.provider === 'string'
          ? metadata.provider
          : null;
    const setupEnv = Array.isArray(metadata?.setupEnv)
      ? metadata.setupEnv.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const guidance =
      typeof payload?.message === 'string' && payload.message.trim().length > 0
        ? payload.message
        : typeof payload?.error === 'string' && payload.error.trim().length > 0
          ? payload.error
          : null;

    return {
      provider,
      setupEnv,
      guidance,
      recommendedAction: derivePreviewRecommendedAction(payload),
    };
  }, []);

  const provision = useCallback(async () => {
    setRuntime((prev) => ({
      ...prev,
      state: 'provisioning',
      provider: null,
      error: null,
      guidance: null,
      recommendedAction: null,
      setupEnv: [],
      failureCount: 0,
      lastHealthCheckAt: null,
      hmrConnected: false,
      hmrState: 'idle',
    }));

    try {
      const res = await fetch('/api/preview/runtime-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId || 'default' }),
      });

      if (!res.ok) {
        const rawData = await res.json().catch(() => ({}));
        const data = isPreviewRuntimePayload(rawData) ? rawData : {};
        throw new Error(getPayloadText(data.error) || getPayloadText(data.message) || `Provisioning failed (${res.status})`);
      }

      const rawData = await res.json();
      const data = isPreviewRuntimePayload(rawData) ? rawData : {};
      const runtimeContext = extractRuntimeContext(data);

      if (typeof data.runtimeUrl === 'string' && data.runtimeUrl.length > 0) {
        const runtimeUrl = data.runtimeUrl;
        const resolvedStrategy = resolvePreviewStrategy(data);
        const sandboxId = extractPreviewSandboxId(data);
        sandboxIdRef.current = sandboxId;
        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: resolvedStrategy,
          runtimeUrl,
          sandboxId,
          provider: runtimeContext.provider,
          startedAt: Date.now(),
          error: null,
          guidance: runtimeContext.guidance,
          recommendedAction: runtimeContext.recommendedAction,
          setupEnv: runtimeContext.setupEnv,
        }));

        startHealthPolling(runtimeUrl);
      } else if (
        data.discoveryResult &&
        typeof data.discoveryResult.preferredRuntimeUrl === 'string' &&
        data.discoveryResult.preferredRuntimeUrl.length > 0
      ) {
        const preferredRuntimeUrl = data.discoveryResult.preferredRuntimeUrl;
        const firstCandidate = data.discoveryResult.candidates?.[0];
        const latencyMs = typeof firstCandidate?.latencyMs === 'number' ? firstCandidate.latencyMs : null;

        setRuntime((prev) => ({
          ...prev,
          state: 'warming',
          strategy: 'iframe',
          runtimeUrl: preferredRuntimeUrl,
          startedAt: Date.now(),
          latencyMs,
          error: null,
          provider: runtimeContext.provider,
          guidance: runtimeContext.guidance,
          recommendedAction: runtimeContext.recommendedAction,
          setupEnv: runtimeContext.setupEnv,
        }));
        startHealthPolling(preferredRuntimeUrl);
      } else {
        setRuntime((prev) => ({
          ...prev,
          state: 'failed',
          provider: runtimeContext.provider,
          error:
            runtimeContext.guidance ||
            'No preview runtime available. Start a local development server or configure E2B.',
          guidance: runtimeContext.guidance,
          recommendedAction:
            runtimeContext.recommendedAction ||
            'Configure a valid provider or keep using local preview before continuing.',
          setupEnv: runtimeContext.setupEnv,
        }));
      }
    } catch (err) {
      setRuntime((prev) => ({
        ...prev,
        state: 'failed',
        error: err instanceof Error ? err.message : 'Failed to provision preview.',
        guidance: err instanceof Error ? err.message : 'Failed to provision preview.',
        recommendedAction:
          'Review preview provider configuration or keep using local preview while the remote runtime is not responding.',
      }));
    }
  }, [extractRuntimeContext, projectId, startHealthPolling]);

  const switchToInline = useCallback(() => {
    clearHealthPolling();
    clearHmrBridge();
    const activeSandboxId = sandboxIdRef.current;
    sandboxIdRef.current = null;
    void teardownSession(activeSandboxId);
    setRuntime((prev) => ({
      ...prev,
      state: 'degraded',
      strategy: 'inline',
      runtimeUrl: null,
      sandboxId: null,
      provider: prev.provider,
      hmrConnected: false,
      hmrState: 'idle',
      error: prev.error,
      guidance: prev.guidance,
      recommendedAction:
        prev.recommendedAction || 'Continue in local preview while the remote runtime stabilizes.',
      setupEnv: prev.setupEnv,
    }));
  }, [clearHealthPolling, clearHmrBridge, teardownSession]);

  useEffect(() => {
    if (autoProvision && runtime.state === 'idle') {
      void provision();
    }
  }, [autoProvision, runtime.state, provision]);

  useEffect(() => {
    if (runtime.state === 'healthy' && runtime.runtimeUrl) {
      connectHMR(runtime.runtimeUrl);
    }
  }, [runtime.state, runtime.runtimeUrl, connectHMR]);

  /**
   * L.8 — after governed apply success, sync into the live session and refresh honestly.
   * Fail-closed when no sandboxId; never claim HMR unless the server returns hmr:true.
   */
  useEffect(() => {
    const onApplySuccess = (event: Event) => {
      const detail = (event as CustomEvent<PreviewApplySuccessDetail>).detail;
      const paths = Array.isArray(detail?.paths) ? detail.paths.filter(Boolean) : [];
      if (paths.length === 0) return;

      const sandboxId = sandboxIdRef.current;
      void (async () => {
        setRuntime((prev) => ({
          ...prev,
          state: sandboxId ? 'syncing' : prev.state,
          guidance: sandboxId
            ? 'Syncing applied files into the live preview session...'
            : 'Apply succeeded, but no live preview session — provision preview to enable hot-update.',
        }));

        const preferHmr = Boolean(detail?.preferHmr);
        const finalResult = await requestPreviewHotUpdate({
          projectId: detail?.projectId ?? projectId ?? null,
          sandboxId,
          paths,
          clientHmrConnected: preferHmr ? hmrConnectedRef.current : false,
          preferHmr,
        });

        publishPreviewHotUpdateResult(finalResult);

        if (!finalResult.ok) {
          log.warn('preview_hot_update_denied', {
            message: finalResult.message,
            sandboxId,
            paths: paths.length,
          });
          setRuntime((prev) => ({
            ...prev,
            state: prev.runtimeUrl ? 'degraded' : prev.state,
            guidance:
              finalResult.message ||
              'Preview hot-update denied — no live session or sync failed (fail-closed).',
            recommendedAction: sandboxId
              ? 'Retry apply sync or reprovision preview.'
              : 'Provision a preview session before expecting multi-file hot refresh.',
          }));
          return;
        }

        setRuntime((prev) => ({
          ...prev,
          state: finalResult.hmr ? 'healthy' : 'syncing',
          filesInSync: prev.filesInSync + finalResult.filesSynced,
          lastSyncAt: Date.now(),
          guidance: finalResult.message || null,
          error: null,
          // Honesty: only mark HMR connected when server claimed hmr — reload path keeps prior bridge state.
          hmrConnected: finalResult.hmr ? true : prev.hmrConnected,
        }));

        if (finalResult.reload) {
          forcePreviewIframeReload();
          window.setTimeout(() => {
            setRuntime((prev) => ({
              ...prev,
              state: prev.runtimeUrl ? 'healthy' : prev.state,
            }));
          }, 900);
        }

        log.info('preview_hot_update', {
          hmr: finalResult.hmr,
          reload: finalResult.reload,
          mode: finalResult.mode,
          filesSynced: finalResult.filesSynced,
          reusedSession: finalResult.reusedSession,
        });
      })();
    };

    window.addEventListener(PREVIEW_APPLY_SUCCESS_EVENT, onApplySuccess as EventListener);
    return () => {
      window.removeEventListener(PREVIEW_APPLY_SUCCESS_EVENT, onApplySuccess as EventListener);
    };
  }, [projectId]);

  useEffect(() => {
    const onPageHide = () => {
      const activeSandboxId = sandboxIdRef.current;
      if (!activeSandboxId) return;
      // keepalive survives tab close; auth cookie/header may still apply for same-origin.
      void fetch('/api/preview/runtime-teardown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxSessionId: activeSandboxId, sandboxId: activeSandboxId }),
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      clearHmrBridge();
      clearHealthPolling();
    };
  }, [clearHealthPolling, clearHmrBridge]);

  return { runtime, provision, switchToInline, teardownSession };
}
