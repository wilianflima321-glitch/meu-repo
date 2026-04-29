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
    ? 'Sincronizando as ultimas mudancas com a superficie visual.'
    : forceInlinePreviewFallback || !previewRuntimeUrl
      ? 'Preview operando no fallback inline ate o runtime ficar confiavel.'
      : runtimeHealth.status === 'checking'
        ? 'Revalidando o runtime remoto antes de chamar esta lane de confiavel.'
        : runtimeHealth.status === 'unhealthy' || runtimeHealth.status === 'unreachable' || runtimeHealth.status === 'invalid'
          ? 'O runtime remoto perdeu confianca e precisa de uma nova validacao.'
          : 'Existe sinal suficiente para seguir, mas a readiness ainda nao esta completa.';

  const body =
    runtimeHealth.reason ||
    runtimeDiscoveryMessage ||
    firstBlocker ||
    (previewRuntimeUrl
      ? 'Use a proxima acao recomendada para restaurar parity de runtime sem sair da IDE.'
      : 'Descubra ou provisione um runtime quando precisar validar device, rede ou deploy fora do inline.');

  if (density === 'compact') {
    return (
      <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_94%,transparent))] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <NoticeChip tone={tone}>
            {forceInlinePreviewFallback || !previewRuntimeUrl ? 'Inline fallback' : runtimeStrategyLabel}
          </NoticeChip>
          <NoticeChip tone={hasReachableRuntime ? 'success' : tone}>
            {hasReachableRuntime ? 'Runtime reachable' : `Health ${runtimeHealth.status}`}
          </NoticeChip>
          {runtimeReadiness?.status ? (
            <NoticeChip tone={runtimeReadiness.status === 'ready' ? 'success' : tone}>
              Readiness {runtimeReadiness.status}
            </NoticeChip>
          ) : null}
          <span className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
            Next move: {runtimePrimaryActionLabel}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
          <span className="font-medium text-[var(--aethel-text-secondary)]">{heading}</span>
          <span>{body}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_86%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NoticeChip tone={tone}>
              {forceInlinePreviewFallback || !previewRuntimeUrl ? 'Inline fallback' : runtimeStrategyLabel}
            </NoticeChip>
            <NoticeChip tone={hasReachableRuntime ? 'success' : tone}>
              {hasReachableRuntime ? 'Runtime reachable' : `Health ${runtimeHealth.status}`}
            </NoticeChip>
            {runtimeReadiness?.status ? (
              <NoticeChip tone={runtimeReadiness.status === 'ready' ? 'success' : tone}>
                Readiness {runtimeReadiness.status}
              </NoticeChip>
            ) : null}
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
            {runtimeReadiness?.instructions?.[0] || 'Mantenha a validacao na mesma lane ate o runtime voltar a um estado confiavel.'}
          </div>
        </div>
      </div>
    </div>
  );
}
