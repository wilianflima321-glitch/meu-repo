'use client'

import React from 'react'
import { AgentEvidenceCard } from '../../web/components/agents'
import { Bot, Sparkles, User } from 'lucide-react'

import { stripCodeBlocks, type InlineAIMessage } from './InlineAIChat.helpers'
import { MESSAGE_TIME_FORMATTER } from './InlineAIChat.styles'
import { CodeBlock, FormattedMessageBody, LoadingState } from './InlineAIChatPrimitives'

type InlineAIMessageListProps = {
  isLoading: boolean
  label: string
  messages: InlineAIMessage[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  onApplyCode?: (code: string) => void
  onReviewCode?: (code: string) => void
}

type MessageBubbleProps = {
  message: InlineAIMessage
  onApplyCode?: (code: string) => void
  onReviewCode?: (code: string) => void
}

export function InlineAIMessageList({
  isLoading,
  label,
  messages,
  messagesEndRef,
  onApplyCode,
  onReviewCode,
}: InlineAIMessageListProps) {
  return (
    <div
      aria-live="polite"
      className="flex flex-1 flex-col gap-4 overflow-auto p-4"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onApplyCode={onApplyCode}
          onReviewCode={onReviewCode}
        />
      ))}

      {isLoading && <LoadingState label={label} />}
      <div ref={messagesEndRef} />
    </div>
  )
}

function MessageBubble({ message, onApplyCode, onReviewCode }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const plainTextContent = stripCodeBlocks(message.content)
  const roleLabel = isUser ? 'You' : isSystem ? 'Context' : 'Assistant'

  if (isSystem) {
    return (
      <div className="w-full max-w-full rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--aethel-info)]">
          <Sparkles size={12} />
          <span>{roleLabel}</span>
          <span aria-hidden="true">|</span>
          <span>{MESSAGE_TIME_FORMATTER.format(message.timestamp)}</span>
        </div>

        <FormattedMessageBody content={plainTextContent} />
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md ${
          isUser
            ? 'border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]'
            : 'bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))]'
        }`}
      >
        {isUser ? <User size={14} className="text-[var(--aethel-text-secondary)]" /> : <Bot size={14} className="text-[var(--aethel-text-primary)]" />}
      </div>

      <div
        className={`max-w-[85%] rounded-lg border p-3 ${
          isUser
            ? 'border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-info)_16%,transparent),color-mix(in_srgb,var(--aethel-primary)_10%,transparent))]'
            : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)]'
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--aethel-text-tertiary)]">
          <span>{roleLabel}</span>
          <span>{MESSAGE_TIME_FORMATTER.format(message.timestamp)}</span>
        </div>

        {plainTextContent ? (
          <FormattedMessageBody content={plainTextContent} />
        ) : (
          <div className="text-sm text-[var(--aethel-text-secondary)]">
            Suggested code below.
          </div>
        )}

        {message.codeBlocks?.map((block) => (
          <CodeBlock
            key={`${block.language}-${block.code.slice(0, 24)}`}
            block={block}
            onApply={onApplyCode}
            onReview={onReviewCode}
          />
        ))}

        {!isUser && !isSystem && message.traceArtifact ? (
          <div className="mt-3">
            <AgentEvidenceCard artifact={message.traceArtifact} compact />
          </div>
        ) : null}
      </div>
    </div>
  )
}
