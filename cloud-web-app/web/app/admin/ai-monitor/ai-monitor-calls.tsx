import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronRight, Copy, Eye, EyeOff } from 'lucide-react';
import type { AICall } from './types';

const CALL_STATUS_CLASS_NAMES: Record<AICall['status'], string> = {
  success: 'text-[var(--aethel-success)]',
  error: 'text-[var(--aethel-error)]',
  timeout: 'text-[var(--aethel-warning)]',
};

function getModelBadgeClass(modelId: string): string {
  const value = modelId || '';

  if (value.includes('gpt-5.4-pro') || value.includes('gpt-5-pro')) {
    return 'bg-[var(--aethel-warning)]/20 text-[var(--aethel-warning)]';
  }
  if (value.includes('gpt-5.4') || value.includes('gpt-5')) {
    return 'bg-[var(--aethel-primary)]/20 text-[var(--aethel-primary-light)]';
  }
  if (value.includes('codex')) {
    return 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info)]';
  }
  if (value.includes('claude')) {
    return 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]';
  }
  if (value.includes('gemini')) {
    return 'bg-[color-mix(in_srgb,var(--aethel-primary-dark)_20%,transparent)] text-[var(--aethel-primary-light)]';
  }
  if (value.includes('o3') || value.includes('o4')) {
    return 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]';
  }

  return 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]';
}

interface AICallRowProps {
  call: AICall;
  expanded: boolean;
  onToggle: () => void;
}

function AICallRow({ call, expanded, onToggle }: AICallRowProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="border-b border-[var(--aethel-border-primary)] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-3 text-left hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]"
        aria-expanded={expanded}
        aria-label={`Expandir detalhes da chamada ${call.id}`}
      >
        <span className="text-[var(--aethel-text-tertiary)]" aria-hidden="true">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${CALL_STATUS_CLASS_NAMES[call.status]}`}
          aria-label={`status-${call.status}`}
        />

        <span className="w-20 text-xs text-[var(--aethel-text-tertiary)]">
          {new Date(call.timestamp).toLocaleTimeString()}
        </span>

        <span className={`rounded px-2 py-0.5 text-xs ${getModelBadgeClass(call.model)}`}>{call.model}</span>

        <span className="flex-1 truncate text-sm text-[var(--aethel-text-secondary)]">{call.userEmail}</span>

        <span className="w-24 text-right text-xs text-[var(--aethel-text-tertiary)]">
          {call.inputTokens + call.outputTokens} tokens
        </span>
        <span className="w-20 text-right text-xs text-[var(--aethel-text-tertiary)]">{call.latencyMs}ms</span>

        <span
          className={`w-16 text-right font-mono text-xs ${
            call.cost > 0.01 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-text-tertiary)]'
          }`}
        >
          ${call.cost.toFixed(4)}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-10 pb-4">
          <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-tertiary)]">
            <span>User: {call.userId}</span>
            <span>Operation: {call.operation}</span>
            {call.projectId && <span>Project: {call.projectId}</span>}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--aethel-text-secondary)]">
                Prompt ({call.inputTokens} tokens)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowPrompt((previousValue) => !previousValue);
                  }}
                  className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                  aria-label={showPrompt ? 'Ocultar prompt' : 'Mostrar prompt'}
                >
                  {showPrompt ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigator.clipboard.writeText(call.prompt);
                  }}
                  className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                  aria-label="Copiar prompt"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <pre
              className={`max-h-40 overflow-auto rounded bg-[var(--aethel-surface-primary)] p-2 text-xs ${
                showPrompt
                  ? 'text-[var(--aethel-text-secondary)]'
                  : 'select-none text-[var(--aethel-text-tertiary)] blur-sm'
              }`}
            >
              {call.prompt.slice(0, 500)}
              {call.prompt.length > 500 && '...'}
            </pre>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--aethel-text-secondary)]">
                Response ({call.outputTokens} tokens)
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void navigator.clipboard.writeText(call.response);
                }}
                className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                aria-label="Copiar resposta"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <pre className="max-h-40 overflow-auto rounded bg-[var(--aethel-surface-primary)] p-2 text-xs text-[var(--aethel-text-secondary)]">
              {call.response.slice(0, 500)}
              {call.response.length > 500 && '...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface RecentCallsSectionProps {
  calls: AICall[];
  expandedId: string | null;
  onToggleExpanded: (callId: string) => void;
}

export function RecentCallsSection({ calls, expandedId, onToggleExpanded }: RecentCallsSectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">Chamadas recentes de IA</h3>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">{calls.length} chamadas</span>
      </div>

      <div className="flex items-center gap-4 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] px-4 py-2 text-xs font-medium text-[var(--aethel-text-tertiary)]">
        <span className="w-8"></span>
        <span className="w-4"></span>
        <span className="w-20">Hora</span>
        <span className="w-32">Modelo</span>
        <span className="flex-1">Usuario</span>
        <span className="w-24 text-right">Tokens</span>
        <span className="w-20 text-right">Latencia</span>
        <span className="w-16 text-right">Cost</span>
      </div>

      <div className="max-h-[500px] overflow-auto">
        {calls.map((call) => (
          <AICallRow
            key={call.id}
            call={call}
            expanded={expandedId === call.id}
            onToggle={() => onToggleExpanded(call.id)}
          />
        ))}

        {calls.length === 0 && (
          <div className="p-8 text-center text-[var(--aethel-text-tertiary)]">
            <Brain className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>Nenhuma chamada de IA no periodo selecionado</p>
          </div>
        )}
      </div>
    </div>
  );
}
