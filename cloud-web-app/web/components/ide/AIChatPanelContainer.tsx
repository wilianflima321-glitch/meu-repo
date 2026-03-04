'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'
import AIProviderSetupGuide from '@/components/ai/AIProviderSetupGuide'
import { analytics } from '@/lib/analytics'
import {
  buildAiProviderGateMessage,
  fetchAiProviderStatus,
} from '@/lib/ai-provider-status-client'
import {
  AdvancedChatRequestError,
  isProviderSetupError,
  requestAdvancedChat,
} from '@/lib/ai-chat-advanced-client'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
}

type ProviderGateState = {
  code: string
  message: string
  capability?: string
  setupUrl?: string
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
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    description: 'Fast critic/reviewer profile',
    maxTokens: 200000,
    supportsVision: false,
    supportsVoice: false,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    description: 'Large context for broad analysis',
    maxTokens: 1000000,
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

function tryParseJson(raw: string): Record<string, unknown> | null {
  try {
    const data = JSON.parse(raw)
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function getProjectIdFromLocation(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const value = new URLSearchParams(window.location.search).get('projectId')
  if (!value || !value.trim()) return undefined
  return value.trim()
}

export default function AIChatPanelContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentModel, setCurrentModel] = useState(MODELS[0].id)
  const [isLoading, setIsLoading] = useState(false)
  const requestAbortRef = useRef<AbortController | null>(null)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [providerGate, setProviderGate] = useState<ProviderGateState | null>(null)

  const modelOptions = useMemo(() => MODELS, [])

  useEffect(() => {
    setProjectId(getProjectIdFromLocation())
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        const status = await fetchAiProviderStatus(controller.signal)
        if (status.configured) {
          setProviderGate(null)
          return
        }

        const gateMessage = buildAiProviderGateMessage(status)
        setProviderGate({
          code: 'AI_PROVIDER_NOT_CONFIGURED',
          message: gateMessage,
          capability: status.capability || 'AI_PROVIDER_CONFIG',
          setupUrl: status.setupUrl,
        })
        analytics?.track?.('ai', 'ai_error', {
          metadata: {
            source: 'ide-provider-preflight',
            error: 'AI_PROVIDER_NOT_CONFIGURED',
            capability: status.capability || 'AI_PROVIDER_CONFIG',
          },
        })
      } catch {
        // best-effort preflight; keep panel usable for retries
      }
    })()

    return () => controller.abort()
  }, [])

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
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      analytics?.track?.('ai', 'ai_chat', {
        metadata: {
          source: 'ide-panel',
          model: currentModel,
          projectId,
        },
      })

      try {
        const controller = new AbortController()
        requestAbortRef.current = controller
        setProviderGate(null)

        const result = await requestAdvancedChat({
          message,
          model: currentModel,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          projectId,
          signal: controller.signal,
        })

        const parsedResponse = tryParseJson(result.raw)
        const content = extractContent(result.raw)
        const tokenCount = typeof parsedResponse?.tokensUsed === 'number' ? parsedResponse.tokensUsed : undefined
        const latencyMs = Math.max(
          0,
          Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
        )
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: content || 'No response from model.',
          timestamp: new Date(),
          model: currentModel,
          tokens: tokenCount,
        }

        analytics?.trackPerformance?.('ai_chat_latency', latencyMs, 'ms', {
          surface: 'ide',
          status: 'success',
          model: currentModel,
        })
        analytics?.track?.('ai', 'ai_stream', {
          metadata: {
            source: 'ide-panel',
            model: currentModel,
            projectId,
            latencyMs,
            status: 'success',
            usedFallback: result.usedFallback,
          },
        })

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: 'Request interrupted by user.',
              timestamp: new Date(),
              model: currentModel,
            },
          ])
          return
        }

        if (err instanceof AdvancedChatRequestError && isProviderSetupError(err)) {
          setProviderGate({
            code: err.code,
            message: err.message,
            capability: err.capability,
            setupUrl: err.setupUrl,
          })
        }

        const errorMessage =
          err instanceof AdvancedChatRequestError
            ? `${err.code}: ${err.message}`.trim()
            : err instanceof Error
              ? err.message
              : 'AI_REQUEST_FAILED: AI request failed.'
        const latencyMs = Math.max(
          0,
          Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
        )

        analytics?.track?.('ai', 'ai_error', {
          metadata: {
            source: 'ide-panel',
            model: currentModel,
            projectId,
            error: errorMessage,
            latencyMs,
          },
        })
        analytics?.trackPerformance?.('ai_chat_latency', latencyMs, 'ms', {
          surface: 'ide',
          status: 'error',
          model: currentModel,
        })

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
        requestAbortRef.current = null
        setIsLoading(false)
      }
    },
    [messages, currentModel, isLoading, projectId]
  )

  const handleClearChat = useCallback(() => {
    setMessages([])
  }, [])

  const handleStopGenerating = useCallback(() => {
    requestAbortRef.current?.abort()
  }, [])

  return (
    <div className="flex h-full flex-col">
      {providerGate && (
        <div className="mx-3 mt-3">
          <AIProviderSetupGuide
            source="ide"
            compact
            message={providerGate.message}
            capability={providerGate.capability}
            settingsHref={providerGate.setupUrl}
          />
        </div>
      )}
      {isLoading && (
        <div className="mx-3 mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleStopGenerating}
            className="aethel-button aethel-button-ghost text-[11px] border border-rose-500/40 text-rose-200 hover:bg-rose-500/20"
          >
            Stop generating
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
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
      </div>
    </div>
  )
}
