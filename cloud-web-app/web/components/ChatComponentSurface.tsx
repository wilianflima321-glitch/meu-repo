import React from 'react';
import type { CopilotWorkflowSummary } from '@/lib/api';
import { OPENROUTER_MODEL_OPTIONS } from '@/lib/ai/openrouter-models';
import type { Message } from './ChatComponent.helpers';

type ChatComponentSurfaceProps = {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  activeWorkflowId: string | null;
  workflows: CopilotWorkflowSummary[];
  workflowsLoading: boolean;
  connectBusy: boolean;
  connectFromWorkflowId: string;
  setConnectFromWorkflowId: (value: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  createWorkflow: () => void | Promise<void>;
  switchWorkflow: (workflowId: string) => void | Promise<void>;
  renameWorkflow: () => void | Promise<void>;
  archiveWorkflow: () => void | Promise<void>;
  copyHistoryFromWorkflow: () => void | Promise<void>;
  importContextFromWorkflow: () => void | Promise<void>;
  mergeFromWorkflow: () => void | Promise<void>;
  handleKeyPress: (event: React.KeyboardEvent) => void;
  handleStreamMessage: () => void | Promise<void>;
  handleSendMessage: () => void | Promise<void>;
};

export function ChatComponentSurface({
  messages,
  input,
  setInput,
  isLoading,
  isStreaming,
  streamingContent,
  selectedModel,
  setSelectedModel,
  activeWorkflowId,
  workflows,
  workflowsLoading,
  connectBusy,
  connectFromWorkflowId,
  setConnectFromWorkflowId,
  messagesEndRef,
  createWorkflow,
  switchWorkflow,
  renameWorkflow,
  archiveWorkflow,
  copyHistoryFromWorkflow,
  importContextFromWorkflow,
  mergeFromWorkflow,
  handleKeyPress,
  handleStreamMessage,
  handleSendMessage,
}: ChatComponentSurfaceProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--aethel-border-primary)] flex items-center justify-between">
        <h1 className="text-xl font-bold">Aethel Chat</h1>
        <div className="flex items-center gap-2">
          <select
            value={activeWorkflowId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__new__') {
                void createWorkflow();
                return;
              }
              if (v) void switchWorkflow(v);
            }}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm"
            disabled={isLoading || isStreaming || workflowsLoading || connectBusy}
            title="Trabalho (workflow)"
          >
            {(workflows?.length ? workflows : []).map((wf) => (
              <option key={String(wf.id)} value={String(wf.id)}>
                {wf.title || 'Workflow'}
              </option>
            ))}
            <option value="__new__">+ Novo trabalho</option>
          </select>

          <button type="button" aria-label="Renomear workflow atual"
            onClick={() => void renameWorkflow()}
            disabled={!activeWorkflowId || isLoading || isStreaming}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50"
          >
            Renomear
          </button>
          <button type="button" aria-label="Arquivar workflow atual"
            onClick={() => void archiveWorkflow()}
            disabled={!activeWorkflowId || isLoading || isStreaming}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50"
          >
            Arquivar
          </button>

          <select
            value={connectFromWorkflowId}
            onChange={(e) => setConnectFromWorkflowId(e.target.value)}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm"
            disabled={isLoading || isStreaming || workflowsLoading || connectBusy}
            title="Conectar trabalhos: escolha uma origem"
          >
            <option value="">Conectar…</option>
            {workflows
              .filter((w) => String(w.id) !== String(activeWorkflowId))
              .map((wf) => (
                <option key={String(wf.id)} value={String(wf.id)}>
                  {wf.title || 'Workflow'}
                </option>
              ))}
          </select>

          <button type="button" aria-label="Copiar historico do workflow selecionado"
            onClick={() => void copyHistoryFromWorkflow()}
            disabled={!activeWorkflowId || !connectFromWorkflowId || isLoading || isStreaming || connectBusy}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50"
            title="Copia o history do trabalho selecionado para o trabalho atual (clona a thread)"
          >
            {connectBusy ? 'Processando…' : 'Copiar history'}
          </button>

          <button type="button" aria-label="Import contexto do workflow selecionado"
            onClick={() => void importContextFromWorkflow()}
            disabled={!activeWorkflowId || !connectFromWorkflowId || isLoading || isStreaming || connectBusy}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50"
            title="Importa contexto (livePreview/editor/openFiles) do trabalho selecionado"
          >
            {connectBusy ? 'Processando…' : 'Import contexto'}
          </button>

          <button type="button" aria-label="Mesclar workflow selecionado ao workflow atual"
            onClick={() => void mergeFromWorkflow()}
            disabled={!activeWorkflowId || !connectFromWorkflowId || isLoading || isStreaming || connectBusy}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm hover:bg-[var(--aethel-surface-secondary)] disabled:opacity-50"
            title="Mescla history + contexto do trabalho selecionado e arquiva o trabalho de origem"
          >
            {connectBusy ? 'Processando…' : 'Mesclar'}
          </button>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-3 py-1 text-sm"
            disabled={isLoading || isStreaming}
            title="Modelo"
          >
            {OPENROUTER_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={`openrouter:${option.value}`}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)]'
                  : msg.role === 'error'
                  ? 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-text-primary)]'
                  : msg.role === 'system'
                  ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)] italic'
                  : 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
              <p className="whitespace-pre-wrap">{streamingContent}</p>
              <span className="text-xs opacity-70 mt-1 block animate-pulse">
                Transmitindo...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--aethel-border-primary)]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            aria-label="Digite sua mensagem para o chat"
            className="flex-1 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded px-4 py-2 text-[var(--aethel-text-primary)] resize-none focus:outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]"
            rows={2}
            disabled={isLoading || isStreaming}
          />
          <div className="flex flex-col gap-2">
            <button type="button" aria-label="Transmitir resposta em streaming"
              onClick={handleStreamMessage}
              disabled={isLoading || isStreaming || !input.trim()}
              className="bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] disabled:bg-[var(--aethel-surface-secondary)] disabled:cursor-not-allowed px-4 py-2 rounded font-semibold transition-colors"
            >
              {isStreaming ? 'Pausar' : 'Transmitir'}
            </button>
            <button type="button" aria-label="Send mensagem ao chat"
              onClick={handleSendMessage}
              disabled={isLoading || isStreaming || !input.trim()}
              className="bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] disabled:bg-[var(--aethel-surface-secondary)] disabled:cursor-not-allowed px-4 py-2 rounded font-semibold transition-colors"
            >
              {isLoading ? 'Enviando...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}
