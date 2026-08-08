'use client';

import type {
  PreviewRuntimeInfo,
  PreviewStrategy,
} from '@/components/preview/previewRuntime.types';

export interface PreviewRuntimePayload {
  provider?: unknown;
  strategy?: unknown;
  runtimeUrl?: unknown;
  sandboxId?: unknown;
  sandboxSessionId?: unknown;
  message?: unknown;
  error?: unknown;
  metadata?: {
    provider?: unknown;
    strategy?: unknown;
    mode?: unknown;
    setupEnv?: unknown;
    sandboxId?: unknown;
    sandboxSessionId?: unknown;
  } | null;
  discoveryResult?: {
    preferredRuntimeUrl?: unknown;
    candidates?: Array<{ latencyMs?: unknown }>;
  } | null;
}

/** Prefer explicit sandboxId, then session aliases from L.8 metadata. */
export function extractPreviewSandboxId(payload: PreviewRuntimePayload): string | null {
  const candidates = [
    payload.sandboxId,
    payload.sandboxSessionId,
    payload.metadata?.sandboxId,
    payload.metadata?.sandboxSessionId,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

export const INITIAL_PREVIEW_RUNTIME: PreviewRuntimeInfo = {
  state: 'idle',
  strategy: 'none',
  runtimeUrl: null,
  sandboxId: null,
  provider: null,
  startedAt: null,
  latencyMs: null,
  error: null,
  guidance: null,
  recommendedAction: null,
  setupEnv: [],
  hmrConnected: false,
  hmrState: 'idle',
  filesInSync: 0,
  lastSyncAt: null,
  lastHealthCheckAt: null,
  lastHealthyAt: null,
  failureCount: 0,
};

export function resolvePreviewStrategy(payload: PreviewRuntimePayload): PreviewStrategy {
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

export function derivePreviewRecommendedAction(payload: PreviewRuntimePayload): string | null {
  const errorCode = String(payload?.error || '').trim();
  const strategy = String(payload?.strategy || payload?.metadata?.strategy || '').trim();
  const mode = String(payload?.metadata?.mode || '').trim();

  if (errorCode === 'RUNTIME_PROVISION_BACKEND_NOT_CONFIGURED') {
    return 'Configure a managed provider or keep a local dev server active for review.';
  }
  if (errorCode === 'RUNTIME_PROVISION_BROWSER_SIDE_PROVIDER') {
    return 'Switch the provider to E2B or a managed endpoint; WebContainers is not active on this route.';
  }
  if (errorCode === 'RUNTIME_PROVISION_UNHEALTHY') {
    return 'Check runtime logs, wait for warmup to finish, or fall back to inline preview.';
  }
  if (errorCode === 'RUNTIME_PROVISION_INVALID_URL') {
    return 'Review the URL returned by the provider before promising remote review to the team.';
  }
  if (strategy === 'local' || mode === 'local_fallback') {
    return 'Keep the local server active so preview stays shareable in this session.';
  }
  if (strategy === 'managed') {
    return 'Watch health, HMR, and fallback before sharing this URL as canonical review.';
  }
  return null;
}
