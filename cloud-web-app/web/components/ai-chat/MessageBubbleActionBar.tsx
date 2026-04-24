'use client'

import { Check, Copy, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, Zap } from 'lucide-react'
import { formatTime } from './chat-utils'

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
            aria-label={copied ? 'Resposta copiada' : 'Copiar resposta'}
            onClick={onCopy}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title={copied ? 'Resposta copiada' : 'Copiar resposta'}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Regenerar resposta"
            onClick={onRegenerate}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Regenerar resposta"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Marcar resposta como util"
            onClick={() => onRate('up')}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Marcar resposta como util"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Marcar resposta como insuficiente"
            onClick={() => onRate('down')}
            className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            title="Marcar resposta como insuficiente"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
