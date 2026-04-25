'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

import { MagicWandChat } from '@/components/preview/MagicWandChat';
import {
  PreviewFailedState,
  PreviewSkeleton,
  PreviewSkeletonCard,
  LifecycleIndicator,
} from '@/components/preview/PreviewLifecycleChrome';
import { useMagicWand } from '@/components/preview/useMagicWand';
import { usePreviewRuntime } from '@/components/preview/usePreviewRuntime';
import {
  type CanonicalRuntimeProps,
  type PreviewLifecycleState,
} from '@/components/preview/previewRuntime.types';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('RuntimePreviewSurface');

const PreviewPanel = dynamic(() => import('@/components/ide/PreviewPanel'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

export default function RuntimePreviewSurface(props: CanonicalRuntimeProps) {
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
  const { magicWandState, openMagicWand, closeMagicWand, handleSendMessage } = useMagicWand(
    (message, context) => {
      log.info('Magic Wand message:', message, context);
    },
  );

  const effectiveUrl = externalRuntimeUrl || runtime.runtimeUrl;
  const effectiveStrategy =
    runtime.strategy === 'none' && externalRuntimeUrl ? 'iframe' : runtime.strategy;
  const useInline = forceInlineFallback || effectiveStrategy === 'inline' || !effectiveUrl;

  const effectiveState: PreviewLifecycleState = useMemo(() => {
    if (externalRuntimeUrl) return 'degraded';
    if (forceInlineFallback || effectiveStrategy === 'inline') return 'degraded';
    return runtime.state;
  }, [externalRuntimeUrl, forceInlineFallback, runtime.state, effectiveStrategy]);

  if (effectiveState === 'failed') {
    return (
      <div className="flex h-full flex-col">
        {showLifecycleBar && (
          <LifecycleIndicator
            state="failed"
            latencyMs={null}
            hmrConnected={false}
            strategy={effectiveStrategy}
            startedAt={runtime.startedAt}
            lastHealthCheckAt={runtime.lastHealthCheckAt}
            lastHealthyAt={runtime.lastHealthyAt}
            failureCount={runtime.failureCount}
          />
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
      <div className="flex h-full flex-col">
        {showLifecycleBar && (
          <LifecycleIndicator
            state="idle"
            latencyMs={null}
            hmrConnected={false}
            lastHealthCheckAt={runtime.lastHealthCheckAt}
            lastHealthyAt={runtime.lastHealthyAt}
            failureCount={runtime.failureCount}
          />
        )}
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--aethel-surface-primary)] px-6 text-center">
          <div className="max-w-md space-y-2">
            <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">
              Preview pronto para iniciar
            </h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {runtimeUnavailableReason ||
                'Inicie o runtime gerenciado ou use o fallback inline para continuar sem prometer um preview remoto ativo.'}
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
      <div className="flex h-full flex-col">
        {showLifecycleBar && (
          <LifecycleIndicator
            state={effectiveState}
            latencyMs={null}
            hmrConnected={false}
            strategy={effectiveStrategy}
            startedAt={runtime.startedAt}
            lastHealthCheckAt={runtime.lastHealthCheckAt}
            lastHealthyAt={runtime.lastHealthyAt}
            failureCount={runtime.failureCount}
          />
        )}
        <PreviewSkeletonCard
          badge={effectiveState === 'provisioning' ? 'managed runtime' : 'runtime warmup'}
          title={
            effectiveState === 'provisioning'
              ? 'Iniciando a lane de runtime...'
              : 'Aquecendo a superficie remota...'
          }
          detail={
            effectiveState === 'provisioning'
              ? 'Validando provider, sandbox e endpoint antes de prometer uma URL remota confiavel.'
              : runtime.error ||
                'Esperando a primeira resposta do runtime para liberar health, HMR e fallback com contexto.'
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {showLifecycleBar && (
        <LifecycleIndicator
          state={effectiveState}
          latencyMs={runtime.latencyMs}
          hmrConnected={runtime.hmrConnected}
          strategy={effectiveStrategy}
          filesInSync={runtime.filesInSync}
          lastSyncAt={runtime.lastSyncAt}
          startedAt={runtime.startedAt}
          lastHealthCheckAt={runtime.lastHealthCheckAt}
          lastHealthyAt={runtime.lastHealthyAt}
          failureCount={runtime.failureCount}
        />
      )}
      <div className="relative flex-1">
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
          <div className="absolute right-1 top-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-warning)]">
            Desatualizado
          </div>
        )}
        <button
          type="button"
          onClick={(event) => openMagicWand(event)}
          className="absolute bottom-4 right-4 rounded-full bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] p-3 shadow-lg transition hover:scale-105 hover:brightness-110"
          title="Magic Wand - Clique em um elemento para editar com IA"
          aria-label="Magic Wand"
        >
          <svg
            className="h-5 w-5 text-[var(--aethel-text-primary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </button>
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
