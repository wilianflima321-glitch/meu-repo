'use client'

import type { Ref } from 'react'
import { Bot, Radio } from 'lucide-react'
import { MessageBubble } from '@/components/ai-chat/MessageBubble'
import type { Message } from '@/components/ide/AIChatPanelPro.types'
import type { AIChatModePreset } from '@/components/agents/chat/presets'

interface AIChatMessagesPaneProps {
  messages: Message[]
  streamingContent: string
  isLoading: boolean
  showAdvancedControls: boolean
  supportsVoice: boolean
  modePreset: AIChatModePreset
  onQuickPrompt: (prompt: string) => void
  onEnableAdvancedControls: () => void
  onCopy: (content: string) => Promise<void>
  onRegenerateResponse?: (messageId: string) => void
  onRateResponse?: (messageId: string, rating: 'up' | 'down') => void
  messagesEndRef: Ref<HTMLDivElement>
}

export function AIChatMessagesPane({
  messages,
  streamingContent,
  isLoading,
  showAdvancedControls,
  supportsVoice,
  modePreset,
  onQuickPrompt,
  onEnableAdvancedControls,
  onCopy,
  onRegenerateResponse,
  onRateResponse,
  messagesEndRef,
}: AIChatMessagesPaneProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)]">
            <Bot className="h-8 w-8 text-[var(--aethel-text-primary)]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
            {modePreset.emptyStateTitle}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-[var(--aethel-text-tertiary)]">
            {modePreset.emptyStateDescription}
          </p>
          {supportsVoice && (
            <p className="mb-4 flex items-center gap-1 text-xs text-[var(--aethel-info-light)]">
              <Radio className="h-3 w-3" />
              This model supports live mode for real-time voice
            </p>
          )}
          {showAdvancedControls ? (
            <div className="flex flex-wrap justify-center gap-2">
              {modePreset.quickPrompts.map(({ icon: Icon, label, prompt }) => (
                <button
                  type="button"
                  aria-label={`Use quick prompt ${label}`}
                  key={label}
                  onClick={() => onQuickPrompt(prompt)}
                  className="flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              aria-label="Show advanced shortcuts"
              onClick={onEnableAdvancedControls}
              className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
            >
              Show advanced shortcuts
            </button>
          )}
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={onCopy}
          onRegenerate={() => onRegenerateResponse?.(message.id)}
          onRate={(rating) => onRateResponse?.(message.id, rating)}
        />
      ))}

      {streamingContent && (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)]">
            <Bot className="h-4 w-4 animate-pulse text-[var(--aethel-text-primary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-block max-w-full rounded-2xl rounded-tl-sm bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_86%,transparent)] px-4 py-2.5 text-left text-[var(--aethel-text-secondary)]">
              <div className="whitespace-pre-wrap text-sm">{streamingContent}</div>
              <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[var(--aethel-info-light)]" />
            </div>
          </div>
        </div>
      )}

      {isLoading && !streamingContent && (
        <div className="flex gap-3" role="status" aria-live="polite" aria-label="Generating response">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)]">
            <Bot className="h-4 w-4 animate-pulse text-[var(--aethel-text-primary)]" />
          </div>
          <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_86%,transparent)] px-4 py-3">
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aethel-text-quaternary)]" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aethel-text-quaternary)]" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aethel-text-quaternary)]" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
