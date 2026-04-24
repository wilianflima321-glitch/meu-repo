'use client';

import {
  LIFECYCLE_COLORS,
  LIFECYCLE_LABELS,
  STRATEGY_LABELS,
  type PreviewLifecycleState,
  type PreviewStrategy,
} from '@/components/preview/previewRuntime.types';

export function PreviewSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--aethel-primary)] border-t-transparent"
          aria-hidden="true"
        />
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

export function LifecycleIndicator({
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
  const showHmrWarning = state === 'healthy' && strategy && strategy !== 'inline' && !hmrConnected;

  return (
    <div className="flex items-center gap-2 border-b border-[var(--aethel-border-secondary)]/50 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] px-3 py-1.5 text-xs backdrop-blur-sm">
      <div className={`h-2 w-2 rounded-full ${LIFECYCLE_COLORS[state]}`} />
      <span className="text-[var(--aethel-text-secondary)]">{LIFECYCLE_LABELS[state]}</span>
      {strategy && (
        <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
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
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 1zm0 10a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 11z" />
            <path d="M4.5 4a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1-.708.708l-1.5-1.5A.5.5 0 0 1 4.5 4zm7 0a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708-.708l1.5-1.5A.5.5 0 0 1 11.5 4z" />
          </svg>
          HMR
        </span>
      )}
      {showHmrWarning && (
        <span className="ml-auto flex items-center gap-1 text-[var(--aethel-warning)]">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a.75.75 0 0 1 .66.39l6 11A.75.75 0 0 1 14 13H2a.75.75 0 0 1-.66-1.11l6-11A.75.75 0 0 1 8 1zm0 3.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-.75-.75zm0 7.5a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z" />
          </svg>
          HMR indisponivel
        </span>
      )}
    </div>
  );
}

export function PreviewFailedState({
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
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-secondary)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--aethel-error)]/10">
        <svg
          className="h-6 w-6 text-[var(--aethel-error)]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="mb-1 text-sm font-medium text-[var(--aethel-text-primary)]">Falha no preview</h3>
        <p className="max-w-xs text-xs text-[var(--aethel-text-tertiary)]">
          {error || 'Nao foi possivel conectar ao runtime de preview.'}
        </p>
        {strategy && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            estrategia {STRATEGY_LABELS[strategy]}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          aria-label="Tentar novamente a inicializacao do preview"
          className="rounded-md bg-[var(--aethel-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-primary)] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
        >
          Tentar novamente
        </button>
        {onFallback && (
          <button
            type="button"
            onClick={onFallback}
            aria-label="Usar o preview inline como fallback"
            className="rounded-md bg-[var(--aethel-surface-quaternary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            Usar preview inline
          </button>
        )}
      </div>
    </div>
  );
}
