'use client';

import { useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  File,
  ImageIcon,
  Mic,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  Zap,
} from 'lucide-react';
import type { Message } from '../ide/AIChatPanelPro.types';
import { ThinkingDisplay, ToolCallDisplay } from '../ide/AIChatPanelChrome';
import { useEditorApplyBridge } from '../ide/EditorApplyBridgeContext';
import { formatTime } from './chat-utils';

export interface MessageBubbleProps {
  message: Message;
  onCopy: (content: string) => void;
  onRegenerate: () => void;
  onRate: (rating: 'up' | 'down') => void;
}

/**
 * Single chat message bubble — renders markdown/code blocks, tool calls,
 * thinking panels, plus editor-bridge apply/diff actions.
 * Extracted from AIChatPanelPro.tsx to respect component budget.
 */
export function MessageBubble({ message, onCopy, onRegenerate, onRate }: MessageBubbleProps) {
  const editorBridge = useEditorApplyBridge();
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)\n([\s\S]*)```/);
        if (match) {
          const [, language = 'text', code] = match;
          return (
            <div
              key={i}
              className="my-3 overflow-hidden rounded-lg border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.88))]"
            >
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-3 py-1.5">
                <span className="text-xs text-[var(--aethel-text-tertiary)]">{language}</span>
                <button
                  type="button"
                  aria-label="Copy code block"
                  onClick={() => onCopy(code)}
                  className="rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-sm">
                <code className="text-[var(--aethel-text-secondary)]">{code}</code>
              </pre>
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-tertiary)]">
                <button
                  type="button"
                  disabled={!editorBridge?.activeFilePath}
                  className={`rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                    editorBridge?.activeFilePath
                      ? 'cursor-pointer text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_55%,transparent)]'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  title={
                    editorBridge
                      ? editorBridge.activeFilePath
                        ? 'Substitui a seleção ou insere no cursor'
                        : 'Abra um arquivo no editor'
                      : 'Disponível no workbench (/ide)'
                  }
                  onClick={() => {
                    if (!editorBridge?.activeFilePath) return;
                    const r = editorBridge.applySnippetToEditor(code);
                    if (!r.ok) window.alert(r.message);
                  }}
                >
                  Aplicar no editor
                </button>
                <button
                  type="button"
                  disabled={!editorBridge?.activeFilePath}
                  className={`rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                    editorBridge?.activeFilePath
                      ? 'cursor-pointer text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_55%,transparent)]'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  title={
                    editorBridge
                      ? editorBridge.activeFilePath
                        ? 'Abre o painel lateral com prévia (antes/depois)'
                        : 'Abra um arquivo no editor'
                      : 'Disponível no workbench (/ide)'
                  }
                  onClick={() => {
                    if (!editorBridge?.activeFilePath) return;
                    const r = editorBridge.stageDiffForActiveFile(code);
                    if (!r.ok) window.alert(r.message);
                  }}
                >
                  Abrir diff
                </button>
                <button
                  type="button"
                  disabled={!editorBridge}
                  className={`rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                    editorBridge
                      ? 'cursor-pointer text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_55%,transparent)]'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  title={editorBridge ? 'Cria arquivo via API e abre no editor' : 'Disponível no workbench (/ide)'}
                  onClick={() => {
                    if (!editorBridge) return;
                    void editorBridge.createFileFromSnippet(code).then((r) => {
                      if (!r.ok) window.alert(r.message);
                    });
                  }}
                >
                  Criar arquivo
                </button>
                <button
                  type="button"
                  disabled={!editorBridge?.activeFilePath}
                  className={`rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                    editorBridge?.activeFilePath
                      ? 'cursor-pointer text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_55%,transparent)]'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  title={
                    editorBridge
                      ? editorBridge.activeFilePath
                        ? 'Insere no cursor sem substituir seleção'
                        : 'Abra um arquivo no editor'
                      : 'Disponível no workbench (/ide)'
                  }
                  onClick={() => {
                    if (!editorBridge?.activeFilePath) return;
                    const r = editorBridge.insertSnippetAtCursor(code);
                    if (!r.ok) window.alert(r.message);
                  }}
                >
                  Inserir seleção
                </button>
                <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
                  {editorBridge ? 'Ponte editor ativa' : 'Workbench: /ide'}
                </span>
              </div>
            </div>
          );
        }
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.split('\n').map((line, j) => (
            <span key={j}>
              {line.startsWith('- ') ? (
                <span className="relative block pl-4 before:absolute before:left-0 before:text-[var(--aethel-text-quaternary)] before:content-['-']">
                  {line.slice(2)}
                </span>
              ) : line.startsWith('**') && line.endsWith('**') ? (
                <strong>{line.slice(2, -2)}</strong>
              ) : (
                line
              )}
              {j < part.split('\n').length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-[var(--aethel-primary)]' : 'bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)]'}
      `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[var(--aethel-text-primary)]" />
        ) : (
          <Bot className="w-4 h-4 text-[var(--aethel-text-primary)]" />
        )}
      </div>
      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {/* Voice indicator */}
        {message.isVoice && (
          <div className="flex items-center gap-1 mb-1 text-xs text-[var(--aethel-info-light)]">
            <Mic className="w-3 h-3" />
            Mensagem de voz
          </div>
        )}
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_48%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]"
              >
                {att.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <File className="w-3 h-3" />}
                {att.name}
              </div>
            ))}
          </div>
        )}
        {/* Thinking display */}
        {message.thinking && (
          <ThinkingDisplay
            thinking={message.thinking}
            isExpanded={showThinking}
            onToggle={() => setShowThinking(!showThinking)}
          />
        )}
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2">
            {message.toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
        <div
          className={`
          inline-block max-w-full text-left px-4 py-2.5 rounded-2xl
          ${
            isUser
              ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] rounded-tr-sm'
              : 'rounded-tl-sm bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_86%,transparent)] text-[var(--aethel-text-secondary)]'
          }
        `}
        >
          <div className="text-sm">{renderContent(message.content)}</div>
        </div>
        {/* Meta & Actions */}
        <div
          className={`mt-1 flex items-center gap-2 text-xs text-[var(--aethel-text-quaternary)] ${
            isUser ? 'justify-end' : ''
          }`}
        >
          {message.model && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {message.model}
            </span>
          )}
          {message.tokens && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {message.tokens} tokens
            </span>
          )}
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && (
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                aria-label="Copiar resposta"
                onClick={handleCopy}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                title="Copiar resposta"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--aethel-success)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                aria-label="Regenerar resposta"
                onClick={onRegenerate}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                title="Regenerar resposta"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Marcar resposta como útil"
                onClick={() => onRate('up')}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                title="Marcar resposta como útil"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Marcar resposta como insuficiente"
                onClick={() => onRate('down')}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                title="Marcar resposta como insuficiente"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
