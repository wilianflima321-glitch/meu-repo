'use client'

import { useCallback, useMemo, useState } from 'react'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
}

const MODELS = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Fast, cost-efficient model for P0',
    maxTokens: 128000,
    supportsVision: false,
    supportsVoice: false,
  },
]

function extractContent(raw: string): string {
  try {
    const data = JSON.parse(raw)
    return (
      data?.choices?.[0]?.message?.content ||
      data?.message?.content ||
      data?.content ||
      data?.output?.text ||
      raw
    )
  } catch {
    return raw
  }
}

function extractApiError(raw: string, fallbackStatus: number): { code: string; message: string } {
  try {
    const data = JSON.parse(raw)
    const code =
      typeof data?.error === 'string'
        ? data.error
        : fallbackStatus === 501
          ? 'AI_PROVIDER_UNAVAILABLE'
          : 'AI_REQUEST_FAILED'
    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.detail === 'string'
          ? data.detail
          : `Request failed with HTTP ${fallbackStatus}.`
    return { code, message }
  } catch {
    return {
      code: fallbackStatus === 501 ? 'AI_PROVIDER_UNAVAILABLE' : 'AI_REQUEST_FAILED',
      message: raw || `Request failed with HTTP ${fallbackStatus}.`,
    }
  }
}

export default function AIChatPanelContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentModel, setCurrentModel] = useState(MODELS[0].id)
  const [isLoading, setIsLoading] = useState(false)

  const modelOptions = useMemo(() => MODELS, [])

  const handleSendMessage = useCallback(
    async (message: string, context?: { attachments?: unknown[] }) => {
      if (!message.trim() || isLoading) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message.trim(),
        timestamp: new Date(),
      }

      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)

      if (context?.attachments && context.attachments.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: 'Attachments are gated in this release phase. Use text-only prompts in P0.',
            timestamp: new Date(),
            model: currentModel,
          },
        ])
        return
      }

      setIsLoading(true)

      try {
        const payload = {
          model: currentModel,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const raw = await res.text()
        if (!res.ok) {
          const parsed = extractApiError(raw, res.status)
          throw new Error(`${parsed.code}: ${parsed.message}`)
        }

        const content = extractContent(raw)
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: content || 'No response from model.',
          timestamp: new Date(),
          model: currentModel,
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'AI_REQUEST_FAILED: AI request failed.'

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: errorMessage,
            timestamp: new Date(),
            model: currentModel,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [messages, currentModel, isLoading]
  )

  const handleClearChat = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <AIChatPanelPro
      messages={messages}
      onSendMessage={handleSendMessage}
      onClearChat={handleClearChat}
      isLoading={isLoading}
      currentModel={currentModel}
      models={modelOptions}
      onModelChange={setCurrentModel}
      allowAttachments={false}
    />
  )
}
