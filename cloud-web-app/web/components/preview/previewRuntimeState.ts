'use client';

import type {
  PreviewRuntimeInfo,
  PreviewStrategy,
} from '@/components/preview/previewRuntime.types';

export const INITIAL_PREVIEW_RUNTIME: PreviewRuntimeInfo = {
  state: 'idle',
  strategy: 'none',
  runtimeUrl: null,
  sandboxId: null,
  startedAt: null,
  latencyMs: null,
  error: null,
  hmrConnected: false,
  hmrState: 'idle',
  filesInSync: 0,
  lastSyncAt: null,
  lastHealthCheckAt: null,
  lastHealthyAt: null,
  failureCount: 0,
};

export function resolvePreviewStrategy(payload: any): PreviewStrategy {
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
}
