'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'
import { analytics } from '@/lib/analytics'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
}

type QualityMode = 'standard' | 'delivery' | 'studio'

type AdvancedProfile = {
  qualityMode: QualityMode
  agentCount: 1 | 2 | 3
  enableWebResearch: boolean
}

type ProviderGateState = {
  code: string
  message: string
  capability?: string
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

function inferAdvancedProfile(message: string): AdvancedProfile {
  const lower = message.toLowerCase()
  const asksForDeepAudit = [
    'auditoria',
    'triagem',
    'benchmark',
    'pesquise',
    'research',
    'critique',
    'crítica',
    'arquitet',
    'studio',
  ].some((token) => lower.includes(token))

  if (asksForDeepAudit) {
    return {
      qualityMode: 'studio',
      agentCount: 3,
      enableWebResearch: true,
    }
  }

  const asksForImplementation = [
    'implemente',
    'implement',
    'corrija',
    'refactor',
    'fix',
    'build',
    'deploy',
  ].some((token) => lower.includes(token))

  if (asksForImplementation) {
    return {
      qualityMode: 'delivery',
      agentCount: 2,
      enableWebResearch: false,
    }
  }

  return {
    qualityMode: 'standard',
    agentCount: 1,
    enableWebResearch: false,
  }
}

function extractApiError(
  raw: string,
  fallbackStatus: number
): { code: string; message: string; capability?: string; capabilityStatus?: string } {
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
    const capability = typeof data?.capability === 'string' ? data.capability : undefined
    const capabilityStatus = typeof data?.capabilityStatus === 'string' ? data.capabilityStatus : undefined
    return { code, message, capability, capabilityStatus }
  } catch {
    return {
      code: fallbackStatus === 501 ? 'AI_PROVIDER_UNAVAILABLE' : 'AI_REQUEST_FAILED',
      message: raw || `Request failed with HTTP ${fallbackStatus}.`,
    }
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

function isAgentGateError(code: string): boolean {
  return code === 'FEATURE_NOT_ALLOWED' || code === 'AGENTS_LIMIT_EXCEEDED'
}

function isProviderSetupError(error: { code: string; capabilityStatus?: string }): boolean {
  return (
    error.code === 'AI_PROVIDER_UNAVAILABLE' ||
    error.code === 'NOT_IMPLEMENTED' ||
    error.capabilityStatus === 'NOT_IMPLEMENTED'
  )
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
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [providerGate, setProviderGate] = useState<ProviderGateState | null>(null)

  const modelOptions = useMemo(() => MODELS, [])

  useEffect(() => {
    setProjectId(getProjectIdFromLocation())
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
      analytics?.track?.('ai', 'ai_chat', {
        metadata: {
          source: 'ide-panel',
          model: currentModel,
          projectId,
        },
      })

      try {
        setProviderGate(null)
        const profile = inferAdvancedProfile(message)
        const payload = {
          model: currentModel,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          projectId,
          qualityMode: profile.qualityMode,
          agentCount: profile.agentCount,
          enableWebResearch: profile.enableWebResearch,
          includeTrace: true,
        }

        let res = await fetch('/api/ai/chat-advanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        let raw = await res.text()
        if (!res.ok) {
          const parsed = extractApiError(raw, res.status)
          if (isAgentGateError(parsed.code) && profile.agentCount > 1) {
            const fallbackPayload = {
              ...payload,
              agentCount: 1 as const,
            }
            res = await fetch('/api/ai/chat-advanced', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fallbackPayload),
            })
            raw = await res.text()
          }
        }

        if (!res.ok) {
          const parsed = extractApiError(raw, res.status)
          if (isProviderSetupError(parsed)) {
            setProviderGate({
              code: parsed.code,
              message: parsed.message,
              capability: parsed.capability,
            })
          }
          throw new Error(`${parsed.code}: ${parsed.message}`.trim())
        }

        const parsedResponse = tryParseJson(raw)
        const content = extractContent(raw)
        const tokenCount = typeof parsedResponse?.tokensUsed === 'number' ? parsedResponse.tokensUsed : undefined
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: content || 'No response from model.',
          timestamp: new Date(),
          model: currentModel,
          tokens: tokenCount,
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'AI_REQUEST_FAILED: AI request failed.'

        analytics?.track?.('ai', 'ai_error', {
          metadata: {
            source: 'ide-panel',
            model: currentModel,
            projectId,
            error: errorMessage,
          },
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
        setIsLoading(false)
      }
    },
    [messages, currentModel, isLoading, projectId]
  )

  const handleClearChat = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <div className="flex h-full flex-col">
      {providerGate && (
        <div className="mx-3 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          <div className="font-semibold">AI Provider Not Configured</div>
          <div className="mt-1 text-amber-200">
            {providerGate.message}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <a
              href="/admin/apis"
              className="rounded border border-amber-400/40 bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30"
            >
              Configure Provider
            </a>
            <span className="text-[11px] text-amber-300/80">
              capability: {providerGate.capability ?? 'AI_CHAT_ADVANCED'}
            </span>
          </div>
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
