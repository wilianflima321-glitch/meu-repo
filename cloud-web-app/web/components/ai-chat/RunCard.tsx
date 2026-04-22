'use client';

import { Sparkles, StopCircle, Zap } from 'lucide-react';

export interface RunCardProps {
  status: 'idle' | 'running' | 'completed' | 'failed';
  duration: number;
  cost: number;
  model: string;
  onInterrupt: () => void;
}

/**
 * Visual state-card for AI run operations (idle/running/completed/failed).
 * Extracted from AIChatPanelPro.tsx.
 */
export function RunCard({ status, duration, cost, model, onInterrupt }: RunCardProps) {
  const statusConfig = {
    idle: {
      label: 'Aguardando',
      color: 'text-[var(--aethel-text-quaternary)]',
      bgColor: 'bg-[var(--aethel-surface-tertiary)]',
    },
    running: {
      label: 'Executando',
      color: 'text-[var(--aethel-info-light)]',
      bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
    },
    completed: {
      label: 'Concluído',
      color: 'text-[var(--aethel-success-light)]',
      bgColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
    },
    failed: {
      label: 'Falhou',
      color: 'text-[var(--aethel-error-light)]',
      bgColor: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
    },
  } as const;

  const config = statusConfig[status];

  if (status === 'idle') return null;

  return (
    <div className={`mx-4 mb-3 rounded-lg border border-[var(--aethel-border-secondary)] ${config.bgColor} p-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'running'
                ? 'bg-[var(--aethel-info)] animate-pulse'
                : status === 'completed'
                ? 'bg-[var(--aethel-success)]'
                : 'bg-[var(--aethel-error)]'
            }`}
          />
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          {model && <span className="text-xs text-[var(--aethel-text-tertiary)]">{model}</span>}
        </div>
        {status === 'running' && onInterrupt && (
          <button
            type="button"
            onClick={onInterrupt}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[10px] font-medium text-[var(--aethel-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_22%,transparent)]"
            aria-label="Interromper operação"
          >
            <StopCircle className="w-3 h-3" />
            Interromper
          </button>
        )}
      </div>
      {(duration !== undefined || cost !== undefined) && (
        <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--aethel-text-tertiary)]">
          {duration !== undefined && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {duration.toFixed(2)}s
            </span>
          )}
          {cost !== undefined && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              ${cost.toFixed(4)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default RunCard;
