'use client';

import type { ReactNode } from 'react';

import type {
  PreviewRuntimeHealthState,
  PreviewRuntimeReadinessResponse,
} from '@/lib/preview/runtime-manager';

type PreviewRuntimeTrustNoticeProps = {
  previewRuntimeUrl: string | null;
  runtimeHealth: PreviewRuntimeHealthState;
  runtimeReadiness: PreviewRuntimeReadinessResponse | null;
  runtimePrimaryActionLabel: string;
  runtimeStrategyLabel: string;
  runtimeDiscoveryMessage: string | null;
  forceInlinePreviewFallback: boolean;
  isSavingFile: boolean;
  density?: 'default' | 'compact';
  artifactLabel?: 'live' | 'proposal';
};

type NoticeTone = 'success' | 'info' | 'warning';

function NoticeChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: NoticeTone;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success)]'
      : tone === 'warning'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning)]'
        : 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]';

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function PreviewRuntimeTrustNotice({
  previewRuntimeUrl,
  runtimeHealth,
  runtimeReadiness,
  runtimePrimaryActionLabel,
  runtimeStrategyLabel,
  runtimeDiscoveryMessage,
  forceInlinePreviewFallback,
  isSavingFile,
  density = 'default',
  artifactLabel = 'live',
}: PreviewRuntimeTrustNoticeProps) {
  const firstBlocker = runtimeReadiness?.blockers?.[0] ?? null;
  const hasReachableRuntime = runtimeHealth.status === 'reachable';
  const shouldShowNotice =
    isSavingFile ||
    forceInlinePreviewFallback ||
    !previewRuntimeUrl ||
    runtimeHealth.status === 'checking' ||
    runtimeHealth.status === 'unhealthy' ||
    runtimeHealth.status === 'unreachable' ||
    runtimeHealth.status === 'invalid' ||
    runtimeReadiness?.status === 'partial';

  if (!shouldShowNotice) {
    return null;
  }

  const tone: NoticeTone =
    forceInlinePreviewFallback ||
    runtimeHealth.status === 'unhealthy' ||
    runtimeHealth.status === 'unreachable' ||
    runtimeHealth.status === 'invalid'
      ? 'warning'
      : hasReachableRuntime
        ? 'success'
        : 'info';

  const heading = isSavingFile
    ? 'Syncing the latest visual changes.'
    : forceInlinePreviewFallback || !previewRuntimeUrl
      ? 'Using inline preview until live checks are ready.'
      : runtimeHealth.status === 'checking'
        ? 'Checking the live preview again.'
        : runtimeHealth.status === 'unhealthy' || runtimeHealth.status === 'unreachable' || runtimeHealth.status === 'invalid'
          ? 'The live preview needs a fresh check.'
          : 'Preview can continue; one check is still pending.';

  const body =
    runtimeHealth.reason ||
    runtimeDiscoveryMessage ||
    firstBlocker ||
    (previewRuntimeUrl
      ? 'Use the next action to restore live preview without leaving the IDE.'
      : 'Set up live preview when you need device, network, or deploy checks outside inline preview.');
  const compactSummary = isSavingFile
    ? 'Syncing the latest visual changes.'
    : forceInlinePreviewFallback || !previewRuntimeUrl
      ? 'Local preview active.'
      : runtimeHealth.status === 'checking'
        ? 'Revalidating remote runtime.'
        : runtimeHealth.status === 'unhealthy' || runtimeHealth.status === 'unreachable' || runtimeHealth.status === 'invalid'
          ? 'Live preview needs attention.'
          : 'Live preview is reachable; one check is still pending.';
  const compactDetail =
    isSavingFile ||
    forceInlinePreviewFallback ||
    runtimeHealth.status === 'unhealthy' ||
    runtimeHealth.status === 'unreachable' ||
    runtimeHealth.status === 'invalid' ||
    runtimeReadiness?.status === 'partial'
      ? body
      : null;

  if (density === 'compact') {
    const compactPrimaryStatus = forceInlinePreviewFallback || !previewRuntimeUrl ? 'Local preview' : runtimeStrategyLabel;

    return (
      <div
        className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-2"
        data-preview-trust-notice="compact"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  tone === 'success'
                    ? 'bg-[var(--aethel-success)]'
                    : tone === 'warning'
                      ? 'bg-[var(--aethel-warning)]'
                      : 'bg-[var(--aethel-info)]'
                }`}
                aria-hidden="true"
              />
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                Preview status<span className="sr-only"> Preview trust</span>
              </span>
              <span
                className="truncate text-xs font-medium text-[var(--aethel-text-secondary)]"
                title={compactDetail ? `${heading} ${compactDetail}` : heading}
              >
                {compactSummary}
              </span>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_64%,transparent)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] sm:inline-flex">
            Next: {runtimePrimaryActionLabel}
          </span>
        </div>

        <details className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full px-0 py-1 font-medium text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]">
            Details<span className="sr-only"> Runtime evidence</span>
          </summary>
          <div className="mt-2 grid gap-2 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_62%,transparent)] p-3 sm:grid-cols-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Mode
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--aethel-text-secondary)]">{compactPrimaryStatus}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Health
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--aethel-text-secondary)]">
                {hasReachableRuntime ? 'reachable' : runtimeHealth.status}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Check
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--aethel-text-secondary)]">
                {runtimeReadiness?.status ?? 'checking'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Preview
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--aethel-text-secondary)]">{artifactLabel}</div>
            </div>
            <div className="sm:col-span-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Note
              </div>
              <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{compactDetail ?? body}</div>
            </div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_86%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NoticeChip tone={tone}>
              {forceInlinePreviewFallback || !previewRuntimeUrl ? 'Local preview' : runtimeStrategyLabel}
            </NoticeChip>
            <NoticeChip tone={hasReachableRuntime ? 'success' : tone}>
              {hasReachableRuntime ? 'Live preview reachable' : `Health ${runtimeHealth.status}`}
            </NoticeChip>
            {runtimeReadiness?.status ? (
              <NoticeChip tone={runtimeReadiness.status === 'ready' ? 'success' : tone}>
                Check {runtimeReadiness.status}
              </NoticeChip>
            ) : null}
            <NoticeChip tone={artifactLabel === 'proposal' ? 'info' : hasReachableRuntime ? 'success' : tone}>
              Preview {artifactLabel}
            </NoticeChip>
          </div>
          <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{heading}</div>
          <div className="mt-1 max-w-3xl text-xs leading-5 text-[var(--aethel-text-tertiary)]">{body}</div>
        </div>

        <div className="min-w-[180px] rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] px-3 py-2.5 text-[11px] text-[var(--aethel-text-secondary)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Next move
          </div>
          <div className="mt-1 font-medium text-[var(--aethel-text-primary)]">{runtimePrimaryActionLabel}</div>
          <div className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
            {runtimeReadiness?.instructions?.[0] || 'Keep checking this preview until it is trusted again.'}
          </div>
        </div>
      </div>
    </div>
  );
}
