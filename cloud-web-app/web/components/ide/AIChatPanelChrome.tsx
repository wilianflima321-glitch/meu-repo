'use client'

import type { Attachment, ChatThread, ToolCall } from './AIChatPanelPro.types'
import { X, History, Zap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

type AttachmentPreviewProps = {
  attachment: Attachment
  onRemove?: () => void
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
      <span className="truncate">{attachment.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] hover:text-[var(--aethel-text-secondary)]"
          aria-label="Remover anexo"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

type ChatHistorySidebarProps = {
  threads: ChatThread[]
  activeThreadId?: string
  onSelectThread: (threadId: string) => void
  onCreateThread?: () => void
  onArchiveThread?: (threadId: string) => void
  onDeleteThread?: (threadId: string) => void
  onClose?: () => void
}

export function ChatHistorySidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onArchiveThread,
  onDeleteThread,
  onClose,
}: ChatHistorySidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-[var(--aethel-border-secondary)] bg-[linear-gradient(180deg,rgba(10,14,24,0.98),rgba(16,22,34,0.92))]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-secondary)] px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-[var(--aethel-text-secondary)]">
          <History className="h-4 w-4" />
          Historico
        </div>
        <div className="flex items-center gap-1">
          {onCreateThread && (
            <button
              type="button"
              onClick={onCreateThread}
              className="rounded px-2 py-1 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)]"
            >
              Novo
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] hover:text-[var(--aethel-text-secondary)]"
              aria-label="Fechar historico"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[calc(100vh-64px)] overflow-y-auto p-2">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`mb-2 rounded-lg border px-3 py-2 text-xs ${
              thread.id === activeThreadId
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectThread(thread.id)}
              className="w-full text-left"
            >
              <div className="truncate font-medium">{thread.title}</div>
              <div className="mt-1 truncate text-[11px] text-[var(--aethel-text-tertiary)]">{thread.lastMessage}</div>
            </button>
            <div className="mt-2 flex items-center gap-2">
              {onArchiveThread && (
                <button
                  type="button"
                  onClick={() => onArchiveThread(thread.id)}
                  className="text-[11px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
                >
                  Arquivar
                </button>
              )}
              {onDeleteThread && (
                <button
                  type="button"
                  onClick={() => onDeleteThread(thread.id)}
                  className="text-[11px] text-[var(--aethel-error)] hover:text-[var(--aethel-error)]"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

type LiveModeIndicatorProps = {
  status?: 'idle' | 'listening' | 'thinking' | 'speaking'
  onEnd?: () => void
}

export function LiveModeIndicator({ status = 'idle', onEnd }: LiveModeIndicatorProps) {
  const label =
    status === 'listening'
      ? 'Ouvindo'
      : status === 'thinking'
        ? 'Pensando'
        : status === 'speaking'
          ? 'Falando'
          : 'Pronto'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--aethel-border-secondary)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.86))] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-[var(--aethel-info-light)]" />
        <span>Modo live: {label}</span>
      </div>
      {onEnd && (
        <button
          type="button"
          onClick={onEnd}
          className="rounded border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)]"
        >
          Encerrar
        </button>
      )}
    </div>
  )
}

type ThinkingDisplayProps = {
  thinking: string
  isExpanded: boolean
  onToggle: () => void
}

export function ThinkingDisplay({ thinking, isExpanded, onToggle }: ThinkingDisplayProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="mb-2 w-full rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-3 py-2 text-left text-xs text-[var(--aethel-text-secondary)]"
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-[var(--aethel-text-tertiary)]" />
        <span>Raciocinio {isExpanded ? 'expandido' : 'resumido'}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-[var(--aethel-text-quaternary)]">
        <span>• Entendendo contexto</span>
        <span>• Lendo arquivos</span>
        <span>• Executando ferramentas</span>
        <span>• Montando resposta</span>
      </div>
      {isExpanded && <div className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">{thinking}</div>}
    </button>
  )
}

type ToolCallDisplayProps = {
  toolCall: ToolCall
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const icon =
    toolCall.status === 'completed'
      ? CheckCircle2
      : toolCall.status === 'failed'
        ? AlertTriangle
        : Loader2
  const Icon = icon
  const statusLabel =
    toolCall.status === 'completed'
      ? 'concluido'
      : toolCall.status === 'failed'
        ? 'falhou'
        : 'executando'
  const argsSummary = toolCall.args
    ? Object.entries(toolCall.args)
        .slice(0, 3)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(', ')
    : null
  const durationLabel =
    typeof toolCall.duration === 'number'
      ? toolCall.duration >= 1000
        ? `${(toolCall.duration / 1000).toFixed(1)}s`
        : `${Math.round(toolCall.duration)}ms`
      : null
  return (
    <div className="mb-2 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${toolCall.status === 'failed' ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-tertiary)]'}`} />
        <span className="font-medium">{toolCall.name}</span>
        <span className="text-[11px] text-[var(--aethel-text-quaternary)]">{statusLabel}</span>
        {durationLabel && (
          <span className="text-[11px] text-[var(--aethel-text-quaternary)]">• {durationLabel}</span>
        )}
      </div>
      {argsSummary && (
        <div className="mt-1 text-[11px] text-[var(--aethel-text-quaternary)]">params: {argsSummary}</div>
      )}
      {toolCall.result && <div className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">{toolCall.result}</div>}
    </div>
  )
}
