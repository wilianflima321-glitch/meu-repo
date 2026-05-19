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
  message?: unknown;
  error?: unknown;
  metadata?: {
    provider?: unknown;
    strategy?: unknown;
    mode?: unknown;
    setupEnv?: unknown;
  } | null;
  discoveryResult?: {
    preferredRuntimeUrl?: unknown;
    candidates?: Array<{ latencyMs?: unknown }>;
  } | null;
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
    return 'Configure um provider gerenciado ou mantenha um dev server local active para review.';
  }
  if (errorCode === 'RUNTIME_PROVISION_BROWSER_SIDE_PROVIDER') {
    return 'Troque o provider para E2B ou endpoint gerenciado; WebContainers nao esta active nesta rota.';
  }
  if (errorCode === 'RUNTIME_PROVISION_UNHEALTHY') {
    return 'Verifique logs do runtime, aguarde o warmup terminar ou caia para o preview inline.';
  }
  if (errorCode === 'RUNTIME_PROVISION_INVALID_URL') {
    return 'Revise a URL retornada pelo provider antes de prometer review remoto para o time.';
  }
  if (strategy === 'local' || mode === 'local_fallback') {
    return 'Mantenha o servidor local active para que o preview continue compartilhavel nesta sessao.';
  }
  if (strategy === 'managed') {
    return 'Acompanhe health, HMR e fallback antes de compartilhar esta URL como review canonico.';
  }
  return null;
}
