'use client'

import { Check, Copy, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, Zap } from 'lucide-react'
import { formatTime } from '@/components/agents/chat/utils'

interface MessageBubbleActionBarProps {
  copied: boolean
  isUser: boolean
  model?: string
  tokens?: number
  timestamp: Date
  onCopy: () => void
  onRegenerate: () => void
  onRate: (rating: 'up' | 'down') => void
}

export function MessageBubbleActionBar({
  copied,
  isUser,
  model,
  tokens,
  timestamp,
  onCopy,
  onRegenerate,
  onRate,
}: MessageBubbleActionBarProps) {
  return (
    <div
      className={`mt-1 flex items-center gap-2 text-xs text-[var(--aethel-text-quaternary)] ${
        isUser ? 'justify-end' : ''
      }`}
    >
      {model && (
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {model}
        </span>
      )}
      {tokens && (
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {tokens} tokens
        </span>
      )}
      <span>{formatTime(timestamp)}</span>

      {!isUser && (
        <div className="ml-2 flex items-center gap-1 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100">
          <button
            type="button"
            aria-label={copied ? 'Response copied' : 'Copy response'}
            onClick={onCopy}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title={copied ? 'Response copied' : 'Copy response'}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Regenerate response"
            onClick={onRegenerate}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Regenerate response"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Mark response as useful"
            onClick={() => onRate('up')}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Mark response as useful"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Mark response as insufficient"
            onClick={() => onRate('down')}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Mark response as insufficient"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
