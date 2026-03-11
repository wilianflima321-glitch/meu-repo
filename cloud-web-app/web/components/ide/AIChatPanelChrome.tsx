'use client'

import type { Attachment, ChatThread, ToolCall } from './AIChatPanelPro.types'
import { X, History, Zap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

type AttachmentPreviewProps = {
  attachment: Attachment
  onRemove?: () => void
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2 py-1 text-xs text-slate-300">
      <span className="truncate">{attachment.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950/60">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <History className="h-4 w-4" />
          Historico
        </div>
        <div className="flex items-center gap-1">
          {onCreateThread && (
            <button
              type="button"
              onClick={onCreateThread}
              className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Novo
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                : 'border-slate-800 bg-slate-900/40 text-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectThread(thread.id)}
              className="w-full text-left"
            >
              <div className="truncate font-medium">{thread.title}</div>
              <div className="mt-1 truncate text-[11px] text-slate-400">{thread.lastMessage}</div>
            </button>
            <div className="mt-2 flex items-center gap-2">
              {onArchiveThread && (
                <button
                  type="button"
                  onClick={() => onArchiveThread(thread.id)}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Arquivar
                </button>
              )}
              {onDeleteThread && (
                <button
                  type="button"
                  onClick={() => onDeleteThread(thread.id)}
                  className="text-[11px] text-red-400 hover:text-red-300"
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
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-cyan-400" />
        <span>Live mode: {label}</span>
      </div>
      {onEnd && (
        <button
          type="button"
          onClick={onEnd}
          className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
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
      className="mb-2 w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-300"
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
        <span>Raciocinio {isExpanded ? 'expandido' : 'resumido'}</span>
      </div>
      {isExpanded && <div className="mt-2 text-[11px] text-slate-400">{thinking}</div>}
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
  return (
    <div className="mb-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${toolCall.status === 'failed' ? 'text-red-400' : 'text-slate-400'}`} />
        <span className="font-medium">{toolCall.name}</span>
        <span className="text-[11px] text-slate-500">{toolCall.status}</span>
      </div>
      {toolCall.result && <div className="mt-2 text-[11px] text-slate-400">{toolCall.result}</div>}
    </div>
  )
}
