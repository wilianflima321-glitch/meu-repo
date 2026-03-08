'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'
import AIProviderSetupGuide from '@/components/ai/AIProviderSetupGuide'
import { analytics } from '@/lib/analytics'
import {
  buildAiProviderGateMessage,
  type AiProviderStatusResponse,
  fetchAiProviderStatus,
} from '@/lib/ai-provider-status-client'
import { buildLocalDemoChatContent, consumeLocalDemoUsage } from '@/lib/ai-chat-local-demo'
import {
  AdvancedChatRequestError,
  type AdvancedProfile,
  inferAdvancedProfile,
  isProviderSetupError,
  requestAdvancedChat,
} from '@/lib/ai-chat-advanced-client'
import { buildResearchPrompt, consumeResearchHandoff } from '@/lib/research-handoff'

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
    id: 'google/gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'OpenRouter',
    description: 'Low-cost routed model for first-value and broad usage',
    maxTokens: 1000000,
    supportsVision: false,
    supportsVoice: false,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini (Routed)',
    provider: 'OpenRouter',
    description: 'OpenAI-compatible routed option with centralized provider control',
    maxTokens: 128000,
    supportsVision: false,
    supportsVoice: false,
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku (Routed)',
    provider: 'OpenRouter',
    description: 'Anthropic-quality low-cost routed option',
    maxTokens: 200000,
    supportsVision: false,
    supportsVoice: false,
  },
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

function resolveProfileFromMentions(
  message: string,
  fallback: AdvancedProfile
): {
  message: string
  profile: AdvancedProfile
  tags: string[]
  unsupportedTags: string[]
  supportedTags: string[]
} {
  const tags = (message.match(/@[a-z0-9:_-]+/gi) || []).map((tag) => tag.toLowerCase())
  const profile: AdvancedProfile = { ...fallback }
  const supportedTagSet = new Set(['@studio', '@delivery', '@fast', '@web'])
  const supportedTags = tags.filter((tag) => supportedTagSet.has(tag) || /^@agents:[123]$/.test(tag))
  const unsupportedTags = tags.filter((tag) => !supportedTags.includes(tag))

  if (tags.includes('@studio')) {
    profile.qualityMode = 'studio'
    profile.agentCount = 3
  }
  if (tags.includes('@delivery')) {
    profile.qualityMode = 'delivery'
    if (profile.agentCount < 2) profile.agentCount = 2
  }
  if (tags.includes('@fast')) {
    profile.qualityMode = 'standard'
    profile.agentCount = 1
    profile.enableWebResearch = false
  }
  if (tags.includes('@web')) {
    profile.enableWebResearch = true
    if (profile.agentCount < 2) profile.agentCount = 2
  }

  const agentTag = tags.find((tag) => /^@agents:[123]$/.test(tag))
  if (agentTag) {
    const count = Number(agentTag.split(':')[1])
    if (count === 1 || count === 2 || count === 3) profile.agentCount = count
  }

  const cleaned = message
    .replace(/@[a-z0-9:_-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    message: cleaned || message.trim(),
    profile,
    tags,
    unsupportedTags,
    supportedTags,
  }
}

export default function AIChatPanelContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentModel, setCurrentModel] = useState(MODELS[0].id)
  const [isLoading, setIsLoading] = useState(false)
  const requestAbortRef = useRef<AbortController | null>(null)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [providerGate, setProviderGate] = useState<ProviderGateState | null>(null)
  const [providerStatus, setProviderStatus] = useState<AiProviderStatusResponse | null>(null)

  const modelOptions = useMemo(() => MODELS, [])

  useEffect(() => {
    setProjectId(getProjectIdFromLocation())
  }, [])

  useEffect(() => {
    const handoff = consumeResearchHandoff()
    if (!handoff) return

    const contextPrompt = buildResearchPrompt(handoff)
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [
        {
          id: `system-research-${Date.now()}`,
          role: 'system',
          content: `Research context imported from Nexus.\n\n${contextPrompt}`,
          timestamp: new Date(),
        },
        {
          id: `assistant-research-${Date.now() + 1}`,
          role: 'assistant',
          content:
            'Research handoff loaded. Send your next message to transform this into implementation steps. Tip: use @studio @web for deep multi-agent analysis.',
          timestamp: new Date(),
          model: currentModel,
        },
      ]
    })

    analytics?.track?.('ai', 'ai_chat', {
      metadata: {
        source: 'ide-research-handoff',
        query: handoff.query,
        sources: handoff.sources.length,
      },
    })
  }, [currentModel])

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        const status = await fetchAiProviderStatus(controller.signal)
        setProviderStatus(status)
        if (status.configured || status.demoModeEnabled) {
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
        setProviderStatus(null)
        // best-effort preflight; keep panel usable for retries
      }
    })()

    return () => controller.abort()
  }, [])

  const tryServeLocalDemo = useCallback(
    (input: { message: string; profile: AdvancedProfile; tags?: string[]; reason: string }): boolean => {
      if (providerStatus?.configured || providerStatus?.demoModeEnabled) return false

      const usage = consumeLocalDemoUsage(providerStatus?.demoDailyLimit)
      if (!usage.allowed) {
        const limitMessage = `DEMO_LIMIT_REACHED: local demo daily limit reached (${usage.used}/${usage.limit}). Configure a provider in /settings?tab=api or retry after ${usage.resetAt}.`
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: limitMessage,
            timestamp: new Date(),
            model: currentModel,
          },
        ])
        analytics?.track?.('ai', 'ai_error', {
          metadata: {
            source: 'ide-panel-local-demo',
            model: currentModel,
            projectId,
            error: 'DEMO_LIMIT_REACHED',
            demoLimit: usage.limit,
            demoUsed: usage.used,
            reason: input.reason,
          },
        })
        return true
      }

      const demoContent = buildLocalDemoChatContent({
        message: input.message,
        qualityMode: input.profile.qualityMode,
        agentCount: input.profile.agentCount,
        enableWebResearch: input.profile.enableWebResearch,
        remaining: usage.remaining,
        limit: usage.limit,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: demoContent,
          timestamp: new Date(),
          model: currentModel,
        },
      ])

      analytics?.track?.('ai', 'ai_stream', {
        metadata: {
          source: 'ide-panel-local-demo',
          model: currentModel,
          projectId,
          status: 'demo-local',
          reason: input.reason,
          qualityMode: input.profile.qualityMode,
          agentCount: input.profile.agentCount,
          enableWebResearch: input.profile.enableWebResearch,
          mentionTags: input.tags ?? [],
          demoRemaining: usage.remaining,
          demoLimit: usage.limit,
          demoUsed: usage.used,
        },
      })
      return true
    },
    [currentModel, projectId, providerStatus]
  )

  const handleSendMessage = useCallback(
    async (message: string, context?: { attachments?: unknown[] }) => {
      if (!message.trim() || isLoading) return

      const fallbackProfile = inferAdvancedProfile(message)
      const profileResolution = resolveProfileFromMentions(message, fallbackProfile)
      const normalizedMessage = profileResolution.message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: normalizedMessage,
        timestamp: new Date(),
      }

      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)

      if (profileResolution.unsupportedTags.length > 0) {
        const uniqueUnsupported = [...new Set(profileResolution.unsupportedTags)]
        const unsupportedList = uniqueUnsupported.join(', ')
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content:
              `MENTION_NOT_SUPPORTED: ${unsupportedList} ainda nao esta suportado nesta superficie.\n` +
              'Suportado no momento: @studio, @delivery, @fast, @web e @agents:1|2|3.',
            timestamp: new Date(),
            model: currentModel,
          },
        ])

        analytics?.track?.('ai', 'ai_error', {
          metadata: {
            source: 'ide-panel',
            model: currentModel,
            projectId,
            error: 'MENTION_NOT_SUPPORTED',
            unsupportedTags: uniqueUnsupported,
          },
        })

        if (!normalizedMessage.trim()) {
          return
        }
      }

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

      if (providerGate && tryServeLocalDemo({ message: normalizedMessage, profile: profileResolution.profile, tags: profileResolution.tags, reason: 'preflight_provider_gate' })) {
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
          message: normalizedMessage,
          model: currentModel,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          projectId,
          profileOverride: profileResolution.profile,
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
            qualityMode: profileResolution.profile.qualityMode,
            agentCount: profileResolution.profile.agentCount,
            enableWebResearch: profileResolution.profile.enableWebResearch,
            mentionTags: profileResolution.tags,
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
          const servedDemo = tryServeLocalDemo({
            message: normalizedMessage,
            profile: profileResolution.profile,
            tags: profileResolution.tags,
            reason: 'provider_setup_error',
          })
          if (servedDemo) {
            return
          }
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
    [messages, currentModel, isLoading, projectId, providerGate, tryServeLocalDemo]
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
        <div className="mx-3 mt-3 space-y-2">
          <AIProviderSetupGuide
            source="ide"
            compact
            message={providerGate.message}
            capability={providerGate.capability}
            settingsHref={providerGate.setupUrl}
          />
          {!providerStatus?.configured && !providerStatus?.demoModeEnabled && (
            <div className="rounded border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
              Demo local disponivel: voce pode enviar ate{' '}
              {typeof providerStatus?.demoDailyLimit === 'number' ? providerStatus.demoDailyLimit : 5} mensagens por dia
              com resposta guiada sem provider real.
            </div>
          )}
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
