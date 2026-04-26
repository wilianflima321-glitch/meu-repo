'use client'

import React from 'react'
import { tokens } from '@/lib/design-tokens'
import { Bot, Sparkles, User } from 'lucide-react'

import { stripCodeBlocks, type InlineAIMessage } from './InlineAIChat.helpers'
import {
  ACCENT_CYAN,
  BORDER_SECONDARY,
  MESSAGE_TIME_FORMATTER,
  PRIMARY_GRADIENT,
  SURFACE_SECONDARY,
  SURFACE_TERTIARY,
  TEXT_INVERSE,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  mixColor,
} from './InlineAIChat.styles'
import { CodeBlock, FormattedMessageBody, LoadingState } from './InlineAIChatPrimitives'

type InlineAIMessageListProps = {
  isLoading: boolean
  label: string
  messages: InlineAIMessage[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  onApplyCode?: (code: string) => void
}

type MessageBubbleProps = {
  message: InlineAIMessage
  onApplyCode?: (code: string) => void
}

export function InlineAIMessageList({
  isLoading,
  label,
  messages,
  messagesEndRef,
  onApplyCode,
}: InlineAIMessageListProps) {
  return (
    <div
      aria-live="polite"
      style={{
        flex: 1,
        overflow: 'auto',
        padding: tokens.spacing['4'],
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing['4'],
      }}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onApplyCode={onApplyCode} />
      ))}

      {isLoading && <LoadingState label={label} />}
      <div ref={messagesEndRef} />
    </div>
  )
}

function MessageBubble({ message, onApplyCode }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const plainTextContent = stripCodeBlocks(message.content)
  const roleLabel = isUser ? 'Voce' : isSystem ? 'Contexto' : 'Assistente'

  if (isSystem) {
    return (
      <div
        style={{
          maxWidth: '100%',
          padding: tokens.spacing['3'],
          borderRadius: tokens.radius.lg,
          border: `1px solid ${mixColor(ACCENT_CYAN, 24)}`,
          background: mixColor(ACCENT_CYAN, 8),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing['2'],
            marginBottom: tokens.spacing['2'],
            color: ACCENT_CYAN,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.medium,
          }}
        >
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
    <div
      style={{
        display: 'flex',
        gap: tokens.spacing['3'],
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: tokens.radius.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isUser ? mixColor(SURFACE_TERTIARY, 82) : PRIMARY_GRADIENT,
          border: isUser ? `1px solid ${BORDER_SECONDARY}` : 'none',
        }}
      >
        {isUser ? <User size={14} color={TEXT_SECONDARY} /> : <Bot size={14} color={TEXT_INVERSE} />}
      </div>

      <div
        style={{
          maxWidth: '85%',
          padding: tokens.spacing['3'],
          background: isUser
            ? `linear-gradient(135deg, ${mixColor(ACCENT_CYAN, 16)}, ${mixColor('var(--aethel-primary)', 10)})`
            : mixColor(SURFACE_SECONDARY, 74),
          border: `1px solid ${isUser ? mixColor(ACCENT_CYAN, 24) : BORDER_SECONDARY}`,
          borderRadius: tokens.radius.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.spacing['3'],
            marginBottom: tokens.spacing['2'],
            color: TEXT_TERTIARY,
            fontSize: tokens.typography.fontSize.xs,
          }}
        >
          <span>{roleLabel}</span>
          <span>{MESSAGE_TIME_FORMATTER.format(message.timestamp)}</span>
        </div>

        {plainTextContent ? (
          <FormattedMessageBody content={plainTextContent} />
        ) : (
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm,
              color: TEXT_SECONDARY,
            }}
          >
            Codigo sugerido abaixo.
          </div>
        )}

        {message.codeBlocks?.map((block) => (
          <CodeBlock
            key={`${block.language}-${block.code.slice(0, 24)}`}
            block={block}
            onApply={onApplyCode}
          />
        ))}
      </div>
    </div>
  )
}
