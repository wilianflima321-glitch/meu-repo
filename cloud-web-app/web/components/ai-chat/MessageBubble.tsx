'use client'

import { useState } from 'react'
import { Bot, File, ImageIcon, Mic, User } from 'lucide-react'
import type { Message } from '../ide/AIChatPanelPro.types'
import { ThinkingDisplay, ToolCallDisplay } from '../ide/AIChatPanelChrome'
import { MessageBubbleActionBar } from '@/components/ai-chat/MessageBubbleActionBar'
import { MessageBubbleContent } from '@/components/ai-chat/MessageBubbleContent'
import { AgentEvidenceCard } from '@/components/agents/AgentEvidenceCard'
import { useMessageBubbleCopyActions } from '@/components/ai-chat/useMessageBubbleCopyActions'

export interface MessageBubbleProps {
  message: Message
  onCopy: (content: string) => void | Promise<void>
  onRegenerate: () => void
  onRate: (rating: 'up' | 'down') => void
}

/**
 * Single chat message bubble — renders markdown/code blocks, tool calls,
 * thinking panels, plus benchmark-like hover actions for code and reply controls.
 */
export function MessageBubble({ message, onCopy, onRegenerate, onRate }: MessageBubbleProps) {
  const [showThinking, setShowThinking] = useState(false)
  const isUser = message.role === 'user'
  const { copiedCode, copiedMessage, copyCode, copyMessage } = useMessageBubbleCopyActions(onCopy)
  const evidenceArtifact = message.traceArtifact ?? message.researchArtifact ?? null

  return (
    <div className={`group/message flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-[var(--aethel-primary)]' : 'bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)]'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-[var(--aethel-text-primary)]" />
        ) : (
          <Bot className="h-4 w-4 text-[var(--aethel-text-primary)]" />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${isUser ? 'text-right' : ''}`}>
        {message.isVoice && (
          <div className="mb-1 flex items-center gap-1 text-xs text-[var(--aethel-info-light)]">
            <Mic className="h-3 w-3" />
            Voice message
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_48%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]"
              >
                {attachment.type === 'image' ? (
                  <ImageIcon className="h-3 w-3" />
                ) : (
                  <File className="h-3 w-3" />
                )}
                {attachment.name}
              </div>
            ))}
          </div>
        )}

        {message.thinking && (
          <ThinkingDisplay
            thinking={message.thinking}
            isExpanded={showThinking}
            onToggle={() => setShowThinking((previous) => !previous)}
          />
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2">
            {message.toolCalls.map((toolCall) => (
              <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}

        <div
          className={`inline-block max-w-full rounded-2xl px-4 py-2.5 text-left ${
            isUser
              ? 'rounded-tr-sm bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
              : 'rounded-tl-sm bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_86%,transparent)] text-[var(--aethel-text-secondary)]'
          }`}
        >
          <div className="text-sm">
            <MessageBubbleContent content={message.content} copiedCode={copiedCode} onCopy={copyCode} />
          </div>
        </div>

        {!isUser && evidenceArtifact ? (
          <div className="mt-2 max-w-full">
            <AgentEvidenceCard artifact={evidenceArtifact} compact />
          </div>
        ) : null}

        <MessageBubbleActionBar
          copied={copiedMessage}
          isUser={isUser}
          model={message.model}
          tokens={message.tokens}
          timestamp={message.timestamp}
          onCopy={() => void copyMessage(message.content)}
          onRegenerate={onRegenerate}
          onRate={onRate}
        />
      </div>
    </div>
  )
}

export default MessageBubble
