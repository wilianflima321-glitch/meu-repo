'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'

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

type TraceSummary = {
  summary?: string
  decisionRecord?: { decision?: string; reasons?: string[] }
  telemetry?: { model?: string; tokensUsed?: number; latencyMs?: number }
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
    if (message.length > 6000) {
      return {
        qualityMode: 'studio',
        agentCount: 2,
        enableWebResearch: true,
      }
    }
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

function toTraceSummary(input: unknown): TraceSummary | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as Record<string, unknown>
  const summary = typeof obj.summary === 'string' ? obj.summary : undefined
  const decisionRecord =
    obj.decisionRecord && typeof obj.decisionRecord === 'object'
      ? (obj.decisionRecord as { decision?: string; reasons?: string[] })
      : undefined
  const telemetry =
    obj.telemetry && typeof obj.telemetry === 'object'
      ? (obj.telemetry as { model?: string; tokensUsed?: number; latencyMs?: number })
      : undefined
  if (!summary && !decisionRecord?.decision) return null
  return { summary, decisionRecord, telemetry }
}

function formatTraceSummary(trace: TraceSummary): string {
  const lines: string[] = []
  lines.push(`Trace: ${trace.summary || 'Execution trace available.'}`)
  if (trace.decisionRecord?.decision) lines.push(`Decision: ${trace.decisionRecord.decision}`)
  if (Array.isArray(trace.decisionRecord?.reasons) && trace.decisionRecord.reasons.length > 0) {
    lines.push(`Reasons: ${trace.decisionRecord.reasons.slice(0, 3).join(' | ')}`)
  }
  if (trace.telemetry?.model || typeof trace.telemetry?.tokensUsed === 'number') {
    const telemetryParts: string[] = []
    if (trace.telemetry?.model) telemetryParts.push(`model=${trace.telemetry.model}`)
    if (typeof trace.telemetry?.tokensUsed === 'number') telemetryParts.push(`tokens=${trace.telemetry.tokensUsed}`)
    if (typeof trace.telemetry?.latencyMs === 'number') telemetryParts.push(`latencyMs=${trace.telemetry.latencyMs}`)
    lines.push(`Telemetry: ${telemetryParts.join(', ')}`)
  }
  return lines.join('\n')
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

      try {
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
          throw new Error(`${parsed.code}: ${parsed.message}`.trim())
        }

        const parsedResponse = tryParseJson(raw)
        const content = extractContent(raw)
        const tokenCount = typeof parsedResponse?.tokensUsed === 'number' ? parsedResponse.tokensUsed : undefined
        const traceSummary = toTraceSummary(parsedResponse?.traceSummary)
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: content || 'No response from model.',
          timestamp: new Date(),
          model: currentModel,
          tokens: tokenCount,
        }

        setMessages((prev) => {
          const next = [...prev, assistantMessage]
          if (traceSummary) {
            next.push({
              id: `system-trace-${Date.now()}`,
              role: 'system',
              content: formatTraceSummary(traceSummary),
              timestamp: new Date(),
              model: currentModel,
              tokens: tokenCount,
            })
          }
          return next
        })
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
    [messages, currentModel, isLoading, projectId]
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

