'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { MagicWandChat } from '@/components/preview/MagicWandChat';
import { PreviewContextDock } from '@/components/preview/PreviewContextDock';
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

const PreviewPanel = dynamic(() => import('@aethel/ide-ui/PreviewPanel'), {
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
    runtimeInfoOverride,
    isStale,
    onRefresh,
    onProvisionRequest,
    onInlineFallbackRequest,
    autoProvision = false,
    showLifecycleBar = true,
  } = props;

  const { runtime: internalRuntime, provision, switchToInline } = usePreviewRuntime(projectId, autoProvision);
  const [inspectArmed, setInspectArmed] = useState(false);
  const { magicWandState, openMagicWand, openMagicWandAt, closeMagicWand, handleSendMessage } = useMagicWand(
    (message, context) => {
      const elementInfo = context.elementInfo ?? (context as { element?: typeof context.elementInfo }).element;
      window.dispatchEvent(
        new CustomEvent('aethel.preview.inspectRequest', {
          detail: {
            message,
            elementInfo,
            projectId,
            filePath,
            title,
            source: 'preview-inspector',
          },
        }),
      );
      log.info('Magic Wand message:', message, context);
    },
  );

  const runtime = runtimeInfoOverride ?? internalRuntime;
  const handleProvision = onProvisionRequest ?? provision;
  const handleSwitchToInline = onInlineFallbackRequest ?? switchToInline;

  const effectiveUrl = externalRuntimeUrl || runtime.runtimeUrl;
  const effectiveStrategy =
    runtime.strategy === 'none' && externalRuntimeUrl ? 'iframe' : runtime.strategy;
  const useInline = forceInlineFallback || effectiveStrategy === 'inline' || !effectiveUrl;

  const effectiveState: PreviewLifecycleState = useMemo(() => {
    if (runtimeInfoOverride) return runtime.state;
    if (externalRuntimeUrl) return 'degraded';
    if (forceInlineFallback || effectiveStrategy === 'inline') return 'degraded';
    return runtime.state;
  }, [externalRuntimeUrl, forceInlineFallback, runtime.state, effectiveStrategy, runtimeInfoOverride]);

  const runtimeGuidance = runtime.guidance ?? runtime.error ?? runtimeUnavailableReason ?? null;
  const runtimeAction = runtime.recommendedAction;
  const runtimeSetupEnv = runtime.setupEnv;
  const runtimeProviderLabel = runtime.provider;

  if (effectiveState === 'failed') {
    return (
      <div className="flex h-full flex-col">
        {showLifecycleBar && (
          <LifecycleIndicator
            state="failed"
            latencyMs={null}
            hmrConnected={false}
            hmrState={runtime.hmrState}
            strategy={effectiveStrategy}
            startedAt={runtime.startedAt}
            lastHealthCheckAt={runtime.lastHealthCheckAt}
            lastHealthyAt={runtime.lastHealthyAt}
            failureCount={runtime.failureCount}
          />
        )}
        <PreviewFailedState
          error={runtime.error ?? runtimeUnavailableReason ?? null}
          guidance={runtimeGuidance}
          recommendedAction={runtimeAction}
          setupEnv={runtimeSetupEnv}
          provider={runtimeProviderLabel}
          onRetry={handleProvision}
          onFallback={handleSwitchToInline}
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
            hmrState={runtime.hmrState}
            lastHealthCheckAt={runtime.lastHealthCheckAt}
            lastHealthyAt={runtime.lastHealthyAt}
            failureCount={runtime.failureCount}
          />
        )}
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--aethel-surface-primary)] px-6 text-center">
          <div className="max-w-md space-y-2">
            <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">
              Preview ready to start
            </h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {runtimeGuidance ||
                'Start the managed runtime or keep using local preview without claiming a remote preview is active.'}
            </p>
            {runtimeAction ? (
              <p className="mt-2 text-[11px] text-[var(--aethel-text-secondary)]">
                Next step: {runtimeAction}
              </p>
            ) : null}
            {runtimeSetupEnv.length > 0 ? (
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
                env: {runtimeSetupEnv.join(' · ')}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleProvision}
              className="rounded-md bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:brightness-110"
            >
              Start preview
            </button>
            <button
              type="button"
              onClick={handleSwitchToInline}
              className="rounded-md border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Use local preview
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
            hmrState={runtime.hmrState}
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
              ? 'Starting the runtime lane...'
              : 'Warming the remote preview...'
          }
          detail={
            effectiveState === 'provisioning'
              ? runtimeAction || 'Validating provider, sandbox, and endpoint before promising a trusted remote URL.'
              : runtimeGuidance ||
                'Waiting for the first runtime response before enabling health, HMR, and contextual fallback.'
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
          hmrState={runtime.hmrState}
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
          inspectArmed={inspectArmed}
          onRefresh={onRefresh}
          onInlineElementInspect={({ position, elementInfo }) => {
            setInspectArmed(false);
            openMagicWandAt(position, elementInfo);
          }}
        />
        {useInline && (
          <div className="absolute left-1 top-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-warning)]">
            Local preview
          </div>
        )}
        {isStale && (
          <div className="absolute right-1 top-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-warning)]">
            Out of sync
          </div>
        )}
        <PreviewContextDock
          isInline={useInline}
          isInspecting={inspectArmed}
          isStale={isStale}
          onInspect={(event) => {
            if (useInline) {
              event.preventDefault();
              event.stopPropagation();
              setInspectArmed(true);
              return;
            }
            openMagicWand(event);
          }}
          onRefresh={onRefresh}
        />
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
