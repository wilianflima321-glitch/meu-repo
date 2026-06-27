'use client'

import type { Attachment, ChatThread, ToolCall } from './AIChatPanelPro.types'
import { X, History, Zap, CheckCircle2, AlertTriangle, Loader2, Circle, ChevronDown } from 'lucide-react'

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
          className="ml-1 rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          aria-label="Remove attachment"
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
          History
        </div>
        <div className="flex items-center gap-1">
          {onCreateThread && (
            <button
              type="button"
              onClick={onCreateThread}
              className="rounded px-2 py-1 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              New
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              aria-label="Close history"
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
                  className="text-[11px] text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  Archive
                </button>
              )}
              {onDeleteThread && (
                <button
                  type="button"
                  onClick={() => onDeleteThread(thread.id)}
                  className="text-[11px] text-[var(--aethel-error)] transition-colors hover:text-[var(--aethel-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  Delete
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
      ? 'Listening'
      : status === 'thinking'
        ? 'Thinking'
        : status === 'speaking'
          ? 'Speaking'
          : 'Ready'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--aethel-border-secondary)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.86))] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-[var(--aethel-info-light)]" />
        <span>Live mode: {label}</span>
      </div>
      {onEnd && (
        <button
          type="button"
          onClick={onEnd}
          className="rounded border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
        >
          End
        </button>
      )}
    </div>
  )
}

type ThinkingDisplayProps = {
  thinking: string
  isExpanded: boolean
  onToggle: () => void
  steps?: Array<{
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    duration?: number
  }>
}

export function ThinkingDisplay({ thinking, isExpanded, onToggle, steps }: ThinkingDisplayProps) {
  const parsedSteps = steps || parseThinkingSteps(thinking)
  const completedCount = parsedSteps.filter(s => s.status === 'completed').length
  const hasActive = parsedSteps.some(s => s.status === 'in_progress')

  return (
    <div className="relative mb-2 overflow-hidden rounded-xl text-left text-xs aethel-neon-topline-cyan"
      style={{
        background: 'rgba(8,12,22,0.90)',
        border: '1px solid rgba(34,211,238,.18)',
        boxShadow: 'inset 0 0 24px rgba(34,211,238,.04), 0 4px 16px rgba(0,0,0,.40)',
      }}
    >
      {/* Header toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-inset"
      >
        <div className="flex items-center gap-2">
          {hasActive ? (
            <span className="aethel-beacon flex h-2 w-2 text-cyan-400 flex-shrink-0">
              <span className="block h-2 w-2 rounded-full bg-cyan-400" />
            </span>
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
          )}
          <span className="font-semibold text-[var(--aethel-text-primary)] tracking-tight">Reasoning trace</span>
          <span className="aethel-tag-reflection">
            {completedCount}/{parsedSteps.length} steps
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--aethel-text-quaternary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Steps Timeline */}
      <div className="px-3 pb-2 space-y-0.5">
        {parsedSteps.slice(0, isExpanded ? undefined : 3).map((step) => {
          const isActive = step.status === 'in_progress'
          const isDone   = step.status === 'completed'
          const isFailed = step.status === 'failed'

          return (
            <div
              key={step.id}
              className={`flex items-start gap-2.5 py-1 rounded-r-md transition-colors ${
                isActive ? 'aethel-step-active' : isDone ? 'aethel-step-done' : 'aethel-step-pending'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isActive ? (
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                ) : isDone ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                ) : isFailed ? (
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                ) : (
                  <Circle className="h-3 w-3 text-[var(--aethel-text-quaternary)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] leading-tight ${
                    isActive ? 'text-cyan-300 font-medium'
                    : isDone ? 'text-[var(--aethel-text-primary)]'
                    : isFailed ? 'text-red-300'
                    : 'text-[var(--aethel-text-quaternary)]'
                  }`}>
                    {step.title}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isDone && (
                      <span className="aethel-tag-reflection">✓ done</span>
                    )}
                    {step.duration != null && (
                      <span className="text-[9px] font-mono text-[var(--aethel-text-quaternary)]">{step.duration}ms</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {!isExpanded && parsedSteps.length > 3 && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] text-[var(--aethel-text-quaternary)] hover:text-cyan-400 transition-colors py-0.5"
          >
            +{parsedSteps.length - 3} more steps…
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mx-3 mb-3 mt-1 pt-2 border-t border-[var(--aethel-border-secondary)]">
          <div className="text-[11px] text-[var(--aethel-text-tertiary)] whitespace-pre-wrap font-mono leading-relaxed">
            {thinking}
          </div>
        </div>
      )}
    </div>
  )
}

function parseThinkingSteps(thinking: string): Array<{
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  duration?: number
}> {
  // Parse thinking text into steps
  const lines = thinking.split('\n').filter(line => line.trim())
  return lines.map((line, index) => ({
    id: `step-${index}`,
    title: line.replace(/^[-*]\s*/, '').trim(),
    status: index === lines.length - 1 ? 'in_progress' : 'completed',
  }))
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
      ? 'Done'
      : toolCall.status === 'failed'
        ? 'Failed'
        : 'Running'
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
        <Icon className={`h-3.5 w-3.5 ${toolCall.status === 'failed' ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-text-tertiary)]'}`} />
        <span className="font-medium">{toolCall.name}</span>
        <span className="text-[11px] text-[var(--aethel-text-quaternary)]">{statusLabel}</span>
        {durationLabel && (
          <span className="text-[11px] text-[var(--aethel-text-quaternary)]">- {durationLabel}</span>
        )}
      </div>
      {(argsSummary || toolCall.result) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-[var(--aethel-text-quaternary)]">Tool details</summary>
          {argsSummary && (
            <div className="mt-1 text-[11px] text-[var(--aethel-text-quaternary)]">params: {argsSummary}</div>
          )}
          {toolCall.result && <div className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">{toolCall.result}</div>}
        </details>
      )}
    </div>
  )
}
