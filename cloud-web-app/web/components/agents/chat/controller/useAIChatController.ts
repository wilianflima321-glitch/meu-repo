'use client'

import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { analytics } from '@/lib/analytics'
import { buildLocalDemoChatContent, consumeLocalDemoUsage } from '@/lib/ai-chat-local-demo'
import {
  AdvancedChatRequestError,
  type AdvancedProfile,
  inferAdvancedProfile,
  isProviderSetupError,
  requestAdvancedChat,
} from '@/lib/ai-chat-advanced-client'
import type { AiProviderStatusResponse } from '@/lib/ai-provider-status-client'
import { ensureLocalEngineReady, generateLocalChatReply } from '@/lib/ai/local-chat-bridge'
import { buildLedgerEvidenceArtifact, buildTraceArtifact } from '@/components/agents/evidence'
import type { ChatMessage, ProviderGateState } from '@/components/agents/chat/session-types'
import type { AIChatConsoleMode } from '@/components/agents/chat/presets'
import type { MessageContext } from '@aethel/ide-ui/AIChatPanelPro.types'
import { useSceneDigest } from '@aethel/engine/useSceneDigest'
import { useAethelContext } from '@/contexts/AethelContextRegistry'
import { getByokHeaders } from '@/lib/ai'
import { openAiQuotaModal } from '@/lib/billing/ai-quota-modal-bridge'
import { isAiQuotaBlockCode, normalizeAiQuotaBlocked } from '@/lib/billing/ai-quota-blocked'

type UseAIChatControllerArgs = {
  currentModel: string
  isLoading: boolean
  messages: ChatMessage[]
  projectId?: string
  providerGate: ProviderGateState | null
  providerStatus: AiProviderStatusResponse | null
  setIsLoading: Dispatch<SetStateAction<boolean>>
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setProviderGate: Dispatch<SetStateAction<ProviderGateState | null>>
}

function formatAiErrorForUser(err: unknown): string {
  if (err instanceof AdvancedChatRequestError) {
    switch (err.code) {
      case 'AI_PROVIDER_NOT_CONFIGURED':
        return 'AI is not configured. Connect a provider to continue.'
      case 'DEMO_LIMIT_REACHED':
        return 'Demo limit reached. Enable a provider to continue.'
      case 'MENTION_NOT_SUPPORTED':
        return 'This mention type is not supported yet.'
      case 'MODEL_NOT_AVAILABLE':
        return 'Model unavailable right now. Try another profile.'
      case 'CREATIVE_COST_GUARD_DENIED':
        return (
          err.message ||
          'Creative request blocked by Cost Guard. Add BYOK or credits — nothing was charged on the free path.'
        )
      case 'LAZY_INSPECTOR_REJECT':
        return (
          err.message ||
          'Change rejected — incomplete or lazy patch. Nothing was written.'
        )
      case 'L5_PROJECT_TYPECHECK_FAIL':
        return (
          err.message ||
          'Change rejected — project typecheck failed. Nothing was written.'
        )
      case 'QUOTA_EXCEEDED':
      case 'ULTRA_REQUIRES_WALLET':
      case 'INSUFFICIENT_WALLET':
      case 'PAYG_CAP_REACHED':
      case 'SPEND_BLOCKED':
      case 'INSUFFICIENT_CREDITS':
        return (
          err.message ||
          'AI quota reached for this month. The IDE stays open — choose how to continue AI.'
        )
      default:
        return err.message || 'AI request failed.'
    }
  }

  if (err instanceof Error) return err.message
  return 'AI request failed.'
}

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

function applyConsoleModeBias(message: string, consoleMode: AIChatConsoleMode | undefined) {
  if (!consoleMode || consoleMode === 'ask') return message

  const prefixes: Record<Exclude<AIChatConsoleMode, 'ask'>, string> = {
    plan: 'Plan mode: structure the response into steps, risks, and next actions.',
    execute: 'Execute mode: prioritize actionable steps, diff/apply, and execution order.',
    review: 'Review mode: look for risks, regressions, missing tests, and weak points.',
    live: 'Live mode: answer briefly, oriented to the current state and the next move.',
  }

  return `${prefixes[consoleMode]}\n\n${message}`
}

function resolveProfileFromMentions(
  message: string,
  fallback: AdvancedProfile
): {
  message: string
  profile: AdvancedProfile
  tags: string[]
  unsupportedTags: string[]
} {
  const tags = (message.match(/@[a-z0-9:_-]+/gi) || []).map((tag) => tag.toLowerCase())
  const profile: AdvancedProfile = { ...fallback }
  const profileTagSet = new Set(['@studio', '@delivery', '@fast', '@web'])
  const contextualTagMatchers = [
    /^@file:[^\s]+$/,
    /^@folder:[^\s]+$/,
    /^@function:[^\s]+$/,
    /^@symbol:[^\s]+$/,
    /^@selection$/,
    /^@diagnostics$/,
    /^@git:(diff|staged|status)$/,
    /^@terminal$/,
    /^@web:[^\s]+$/,
    /^@docs:[^\s]+$/,
    /^@codebase$/,
  ]
  const supportedTags = tags.filter((tag) =>
    profileTagSet.has(tag) ||
    /^@agents:[123]$/.test(tag) ||
    contextualTagMatchers.some((pattern) => pattern.test(tag))
  )
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
    .replace(/@(studio|delivery|fast|web)\b/gi, ' ')
    .replace(/@agents:[123]\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    message: cleaned || message.trim(),
    profile,
    tags,
    unsupportedTags,
  }
}

export function useAIChatController({
  currentModel,
  isLoading,
  messages,
  projectId,
  providerGate,
  providerStatus,
  setIsLoading,
  setMessages,
  setProviderGate,
}: UseAIChatControllerArgs) {
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const requestAbortRef = useRef<AbortController | null>(null)
  const sceneDigest = useSceneDigest()
  const aethelContext = useAethelContext()

  const tryServeLocalDemo = useCallback(
    (input: { message: string; profile: AdvancedProfile; tags?: string[]; reason: string }): boolean => {
      if (providerStatus?.configured || providerStatus?.demoModeEnabled) return false

      const usage = consumeLocalDemoUsage(providerStatus?.demoDailyLimit)
      if (!usage.allowed) {
        const limitMessage = `DEMO_LIMIT_REACHED: limite diario do demo local atingido (${usage.used}/${usage.limit}). Configure um provider em /settings?tab=api ou tente novamente em ${usage.resetAt}.`
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
    [currentModel, projectId, providerStatus, setMessages]
  )

  const handleSendMessage = useCallback(
    async (message: string, context?: MessageContext) => {
      if (!message.trim() || isLoading) return
      setLastFailedMessage(null)

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
      let requestMessage = applyConsoleModeBias(normalizedMessage, context?.consoleMode)
      if (sceneDigest) {
        requestMessage += `\n\n[System Context - 3D Viewport State]\nCamera Position: ${sceneDigest.activeCameraPosition ? `[${sceneDigest.activeCameraPosition.map(v => v.toFixed(2)).join(', ')}]` : 'Unknown'}\nSelected Entities: ${sceneDigest.selectedEntities.length > 0 ? JSON.stringify(sceneDigest.selectedEntities) : 'None'}`
      }
      requestMessage += aethelContext.toPromptSuffix()
      const requestMessages = nextMessages.map((entry, index) => ({
        role: entry.role,
        content:
          index === nextMessages.length - 1 && entry.role === 'user' ? requestMessage : entry.content,
      }))
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
              `${unsupportedList} is not supported here yet.\n` +
              'Available now: @studio, @delivery, @fast, @web, and @agents:1|2|3.',
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

        if (!normalizedMessage.trim()) return
      }

      if (context?.attachments && context.attachments.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: 'Attachments are not available here yet. Use text prompts for now.',
            timestamp: new Date(),
            model: currentModel,
          },
        ])
        return
      }

      if (
        providerGate &&
        tryServeLocalDemo({
          message: requestMessage,
          profile: profileResolution.profile,
          tags: profileResolution.tags,
          reason: 'preflight_provider_gate',
        })
      ) {
        return
      }

      setIsLoading(true)
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      analytics?.track?.('ai', 'ai_chat', {
        metadata: {
          source: 'ide-panel',
          model: currentModel,
          projectId,
          consoleMode: context?.consoleMode ?? 'ask',
        },
      })

      try {
        const controller = new AbortController()
        requestAbortRef.current = controller
        setProviderGate(null)

        // Local-first (Missão Executiva 4 — WebLLM): try on-device inference
        // before spending cloud API budget. `ensureLocalEngineReady()` is the
        // single hardware-gated choke point (deviceMemory + WebGPU) — any
        // `false`/thrown result here just means "use the cloud path below",
        // never a hard failure. This never runs unless the user explicitly
        // activated local AI via `LocalAIModal`.
        try {
          const localReady = await ensureLocalEngineReady()
          if (localReady) {
            const localContent = await generateLocalChatReply(requestMessages)
            const latencyMs = Math.max(
              0,
              Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
            )
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: localContent || 'No response from local model.',
              timestamp: new Date(),
              model: 'local-webllm',
              tokens: undefined,
            }
            analytics?.track?.('ai', 'ai_stream', {
              metadata: {
                source: 'ide-panel-local-webllm',
                model: 'local-webllm',
                projectId,
                latencyMs,
                status: 'success',
                consoleMode: context?.consoleMode ?? 'ask',
              },
            })
            setMessages((prev) => [...prev, assistantMessage])
            requestAbortRef.current = null
            setIsLoading(false)
            return
          }
        } catch (localError) {
          // Graceful Fallback: local inference failed mid-generation (e.g. a
          // GPU/driver hiccup) — fall through to the cloud path below instead
          // of surfacing an error, exactly like an unsupported-hardware gate.
          analytics?.track?.('ai', 'ai_error', {
            metadata: {
              source: 'ide-panel-local-webllm',
              model: 'local-webllm',
              projectId,
              error: localError instanceof Error ? localError.message : 'LOCAL_AI_FAILED',
            },
          })
        }

        const result = await requestAdvancedChat({
          message: requestMessage,
          model: currentModel,
          messages: requestMessages,
          projectId,
          agentId: selectedAgentId || undefined,
          headers: {
            ...aethelContext.toApiHeaders(),
            ...getByokHeaders(),
          },
          profileOverride: profileResolution.profile,
          signal: controller.signal,
        })

        const parsedResponse = tryParseJson(result.raw)
        const content = extractContent(result.raw)
        const tokenCount = typeof parsedResponse?.tokensUsed === 'number' ? parsedResponse.tokensUsed : undefined
        const traceArtifact = buildTraceArtifact(parsedResponse?.traceSummary)
        const apexMission =
          parsedResponse && typeof parsedResponse === 'object'
            ? (parsedResponse as { apexMission?: Record<string, unknown> }).apexMission
            : undefined
        const ledgerArtifact = buildLedgerEvidenceArtifact(apexMission?.evidenceLedger)
        const nexusMission =
          apexMission && typeof apexMission.nexus === 'object' && apexMission.nexus
            ? (apexMission.nexus as ChatMessage['nexusMission'])
            : null
        const undoHint =
          apexMission &&
          typeof apexMission.undoHint === 'object' &&
          apexMission.undoHint &&
          typeof (apexMission.undoHint as { transactionId?: unknown }).transactionId === 'string'
            ? {
                transactionId: String((apexMission.undoHint as { transactionId: string }).transactionId),
                message: String(
                  (apexMission.undoHint as { message?: string }).message ||
                    'Ctrl+Z reverts this AI edit atomically.',
                ),
              }
            : null
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
          traceArtifact,
          ledgerArtifact,
          nexusMission,
          fusionUndoHint: undoHint,
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
            consoleMode: context?.consoleMode ?? 'ask',
            mentionTags: profileResolution.tags,
            traceId: traceArtifact?.traceId,
            evidenceItems: traceArtifact?.evidence.length ?? 0,
            riskChecks: traceArtifact?.riskChecks.length ?? 0,
            toolRuns: traceArtifact?.toolRuns.length ?? 0,
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
              content: 'Solicitacao interrormpida pelo usuario.',
              timestamp: new Date(),
              model: currentModel,
            },
          ])
          return
        }

        if (err instanceof AdvancedChatRequestError) {
          const quotaPayload =
            normalizeAiQuotaBlocked(err.metadata?.quotaBody) ||
            (isAiQuotaBlockCode(err.code) || err.status === 402
              ? normalizeAiQuotaBlocked({
                  error: err.code,
                  message: err.message,
                  ctas: (err.metadata?.quotaBody as { ctas?: unknown })?.ctas,
                  ideLocked: false,
                })
              : null)
          if (quotaPayload) {
            openAiQuotaModal(quotaPayload)
          }
        }

        if (err instanceof AdvancedChatRequestError && isProviderSetupError(err)) {
          setProviderGate({
            code: err.code,
            message: err.message,
            capability: err.capability,
            setupUrl: err.setupUrl,
          })
          const servedDemo = tryServeLocalDemo({
            message: requestMessage,
            profile: profileResolution.profile,
            tags: profileResolution.tags,
            reason: 'provider_setup_error',
          })
          if (servedDemo) return
        }

        const rawErrorMessage =
          err instanceof AdvancedChatRequestError
            ? `${err.code}: ${err.message}`.trim()
            : err instanceof Error
              ? err.message
              : 'AI_REQUEST_FAILED: AI request failed.'
        const errorMessage = formatAiErrorForUser(err)
        const latencyMs = Math.max(
          0,
          Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
        )

        analytics?.track?.('ai', 'ai_error', {
          metadata: {
            source: 'ide-panel',
            model: currentModel,
            projectId,
            consoleMode: context?.consoleMode ?? 'ask',
            error: rawErrorMessage,
            latencyMs,
          },
        })
        analytics?.trackPerformance?.('ai_chat_latency', latencyMs, 'ms', {
          surface: 'ide',
          status: 'error',
          model: currentModel,
        })

        setMessages((prev) => {
          const blockedBody =
            err instanceof AdvancedChatRequestError && err.code === 'APEX_MISSION_BLOCKED'
              ? (err.metadata?.quotaBody as {
                  apexMission?: {
                    nexus?: ChatMessage['nexusMission']
                    evidenceLedger?: unknown
                    undoHint?: ChatMessage['fusionUndoHint']
                  }
                })
              : null
          const ledgerArtifact = buildLedgerEvidenceArtifact(blockedBody?.apexMission?.evidenceLedger)
          return [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: errorMessage,
              timestamp: new Date(),
              model: currentModel,
              ledgerArtifact,
              nexusMission: blockedBody?.apexMission?.nexus ?? null,
              fusionUndoHint: blockedBody?.apexMission?.undoHint ?? null,
            },
          ]
        })
        setLastFailedMessage(normalizedMessage)
      } finally {
        requestAbortRef.current = null
        setIsLoading(false)
      }
    },
    [
      currentModel,
      isLoading,
      messages,
      projectId,
      providerGate,
      setIsLoading,
      setMessages,
      setProviderGate,
      tryServeLocalDemo,
      sceneDigest,
      aethelContext,
      selectedAgentId,
    ]
  )

  const handleClearChat = useCallback(() => {
    setMessages([])
  }, [setMessages])

  const handleStopGenerating = useCallback(() => {
    requestAbortRef.current?.abort()
  }, [])

  return useMemo(
    () => ({
      handleClearChat,
      handleSendMessage,
      handleStopGenerating,
      lastFailedMessage,
      selectedAgentId,
      setSelectedAgentId,
    }),
    [handleClearChat, handleSendMessage, handleStopGenerating, lastFailedMessage, selectedAgentId]
  )
}
