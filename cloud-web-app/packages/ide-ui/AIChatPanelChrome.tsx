'use client'

import React, { useState, useMemo } from 'react'
import type { Attachment, ChatThread, ToolCall } from './AIChatPanelPro.types'
import { X, History, Zap, CheckCircle2, AlertTriangle, Loader2, Circle, ChevronDown, Search, MoreVertical, Archive, Trash2 } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads
    const q = searchQuery.toLowerCase()
    return threads.filter(t => t.title.toLowerCase().includes(q) || t.lastMessage.toLowerCase().includes(q))
  }, [threads, searchQuery])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] backdrop-blur-xl h-full">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-secondary)] px-4 py-3 bg-[color-mix(in_srgb,white_2%,transparent)]">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[var(--aethel-text-primary)]">
          <History className="h-4 w-4 text-[var(--aethel-primary)]" aria-hidden="true" />
          CHAT HISTORY
        </div>
        <div className="flex items-center gap-1">
          {onCreateThread && (
            <button
              type="button"
              onClick={onCreateThread}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--aethel-text-secondary)] transition-all hover:bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] hover:text-[var(--aethel-primary-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]"
            >
              <Zap className="h-3 w-3" /> New
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,white_10%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]"
              aria-label="Close history"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-[var(--aethel-border-secondary)] px-3 py-3 bg-[color-mix(in_srgb,black_20%,transparent)]">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--aethel-text-quaternary)] transition-colors group-focus-within:text-[var(--aethel-primary)]" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[color-mix(in_srgb,white_6%,transparent)] bg-[color-mix(in_srgb,white_3%,transparent)] py-1.5 pl-9 pr-3 text-xs text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] transition-all focus:border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] focus:bg-[color-mix(in_srgb,var(--aethel-primary)_5%,transparent)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3" onMouseLeave={() => setOpenMenuId(null)}>
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center text-xs text-[var(--aethel-text-quaternary)] gap-3">
            <Archive className="h-8 w-8 opacity-20" />
            No threads found.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredThreads.map((thread) => {
              const isActive = thread.id === activeThreadId
              const isMenuOpen = openMenuId === thread.id
              return (
                <div
                  key={thread.id}
                  onMouseLeave={() => isMenuOpen && setOpenMenuId(null)}
                  className={`group relative flex flex-col justify-center rounded-xl border px-3.5 py-3 text-xs transition-all duration-200 ${
                    isActive
                      ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] shadow-[0_0_15px_color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]'
                      : 'border-[color-mix(in_srgb,white_4%,transparent)] bg-[color-mix(in_srgb,white_2%,transparent)] hover:border-[color-mix(in_srgb,white_8%,transparent)] hover:bg-[color-mix(in_srgb,white_4%,transparent)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectThread(thread.id)}
                      className="flex-1 overflow-hidden text-left focus-visible:outline-none rounded-sm"
                    >
                      <div className={`truncate font-semibold tracking-wide ${isActive ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-primary)]'}`}>
                        {thread.title}
                      </div>
                      <div className="mt-1.5 truncate text-[11px] leading-relaxed text-[var(--aethel-text-tertiary)] group-hover:text-[var(--aethel-text-secondary)] transition-colors">
                        {thread.lastMessage}
                      </div>
                    </button>
                    
                    {(onArchiveThread || onDeleteThread) && (
                      <div className="relative shrink-0 -mr-1">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : thread.id)}
                          className={`rounded-md p-1.5 transition-colors ${isMenuOpen ? 'bg-[color-mix(in_srgb,white_10%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] opacity-0 group-hover:opacity-100 hover:bg-[color-mix(in_srgb,white_10%,transparent)] hover:text-[var(--aethel-text-secondary)]'} focus-visible:opacity-100 focus-visible:outline-none`}
                          aria-label="Thread options"
                          aria-expanded={isMenuOpen}
                        >
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-36 origin-top-right rounded-lg border border-[color-mix(in_srgb,white_10%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_95%,transparent)] p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl">
                            {onArchiveThread && (
                              <button
                                type="button"
                                onClick={() => { onArchiveThread(thread.id); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[11px] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,white_8%,transparent)] hover:text-[var(--aethel-text-primary)]"
                              >
                                <Archive className="h-3.5 w-3.5" /> Archive
                              </button>
                            )}
                            {onDeleteThread && (
                              <button
                                type="button"
                                onClick={() => { onDeleteThread(thread.id); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[11px] text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between border-t border-[color-mix(in_srgb,white_6%,transparent)] pt-2">
                    <span className="font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
                      {formatDate(new Date(thread.updatedAt))}
                    </span>
                    <span className="rounded bg-[color-mix(in_srgb,white_6%,transparent)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--aethel-text-tertiary)]">
                      {thread.messageCount} msg{thread.messageCount !== 1 && 's'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
    <div className="flex items-center justify-between gap-3 border-b border-[var(--aethel-border-secondary)] bg-[linear-gradient(180deg,var(--aethel-panel-strong),var(--aethel-panel))] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
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
        background: 'color-mix(in srgb, var(--aethel-surface-primary) 90%, transparent)',
        border: '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 18%, transparent)',
        boxShadow:
          'inset 0 0 24px color-mix(in srgb, var(--aethel-neon-cyan) 4%, transparent), 0 4px 16px color-mix(in srgb, black 40%, transparent)',
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
                      <span className="aethel-tag-reflection inline-flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> done
                      </span>
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
