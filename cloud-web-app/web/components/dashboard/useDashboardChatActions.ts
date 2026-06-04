'use client'

import { useCallback } from 'react'
import { analytics } from '@/lib/analytics'
import type { ChatMessage } from '@/lib/api'
import {
  AdvancedChatRequestError,
  isProviderSetupError,
  requestAdvancedChat,
} from '@/lib/ai-chat-advanced-client'
import { DEFAULT_MODEL } from './aethel-dashboard-constants'
import {
  buildLivePreviewContextPayload,
  buildLivePreviewPrompt,
  buildLivePreviewSuggestionMessage,
  buildLivePreviewSystemMessage,
  extractPrimaryAssistantContent,
} from './aethel-dashboard-livepreview-ai-utils'
import { extractApiContent, getAuthHeaders } from './aethel-dashboard-location-utils'
import type { ActiveTab, ToastType } from './aethel-dashboard-model'
import type { Point3 } from './aethel-dashboard-core-types'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

type DashboardChatActionsInput = {
  trackEvent: (category: string, action: string, metadata?: Record<string, unknown>) => void
  showToastMessage: (message: string, type?: ToastType) => void
  chatAbortRef: React.MutableRefObject<AbortController | null>
  aiProviderGate: { setupUrl?: string } | null
  copilotProjectId: string | null
  activeWorkflowId: string | null
  chatMessage: string
  chatHistory: ChatMessage[]
  isStreaming: boolean
  isGenerating: boolean
  selectedPreviewPoint: Point3 | null
  setActiveTab: SetState<ActiveTab>
  setChatMessage: SetState<string>
  setChatHistory: SetState<ChatMessage[]>
  setIsStreaming: SetState<boolean>
  setIsGenerating: SetState<boolean>
  setLivePreviewSuggestions: SetState<string[]>
  setSelectedPreviewPoint: SetState<Point3 | null>
  setFirstValueAiSuccess: SetState<boolean>
  setAiProviderGate: SetState<{ message: string; capabilityStatus?: string; setupUrl?: string } | null>
}

export function useDashboardChatActions({
  trackEvent,
  showToastMessage,
  chatAbortRef,
  aiProviderGate,
  copilotProjectId,
  activeWorkflowId,
  chatMessage,
  chatHistory,
  isStreaming,
  isGenerating,
  selectedPreviewPoint,
  setActiveTab,
  setChatMessage,
  setChatHistory,
  setIsStreaming,
  setIsGenerating,
  setLivePreviewSuggestions,
  setSelectedPreviewPoint,
  setFirstValueAiSuccess,
  setAiProviderGate,
}: DashboardChatActionsInput) {
  const handleOpenProviderSettings = useCallback(() => {
    const setupTarget = aiProviderGate?.setupUrl || '/settings?tab=api'
    if (typeof window !== 'undefined') {
      window.location.assign(setupTarget)
    }
    trackEvent('ai', 'ai_error', { source: 'provider-gate', action: 'open-settings-api-tab', setupTarget })
  }, [aiProviderGate?.setupUrl, trackEvent])

  const handleStopDashboardChat = useCallback(() => {
    chatAbortRef.current?.abort()
    chatAbortRef.current = null
    setIsStreaming(false)
    showToastMessage('Execution interrupted by the user.', 'info')
    trackEvent('ai', 'ai_error', { source: 'dashboard-chat', action: 'abort' })
  }, [chatAbortRef, setIsStreaming, showToastMessage, trackEvent])

  const handleApplyDirectorNote = useCallback((title: string) => {
    setChatMessage(`Apply the guideline to the current project: ${title}`)
    setActiveTab('activity')
    showToastMessage('Director note prepared for the IDE agent lane.', 'success')
  }, [setChatMessage, setActiveTab, showToastMessage])

  const handleSendChatMessage = useCallback(() => {
    void (async () => {
      const message = chatMessage.trim()
      if (!message || isStreaming) return
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      setAiProviderGate(null)
      const nextMessages = [...chatHistory, { role: 'user', content: message } as ChatMessage].slice(-200)
      setChatMessage('')
      setChatHistory(nextMessages)
      setIsStreaming(true)
      try {
        const controller = new AbortController()
        chatAbortRef.current = controller
        const result = await requestAdvancedChat({
          message,
          model: DEFAULT_MODEL,
          messages: nextMessages.map((item) => ({ role: item.role, content: item.content })),
          projectId: copilotProjectId ?? undefined,
          headers: getAuthHeaders(),
          signal: controller.signal,
        })
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: extractApiContent(result.raw) || 'The model returned an empty response.',
        }
        const latencyMs = Math.max(
          0,
          Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
        )
        setChatHistory((prev) => [...prev, assistantMessage].slice(-200))
        setFirstValueAiSuccess(true)
        setAiProviderGate(null)
        trackEvent('ai', 'ai_chat', { source: 'dashboard-chat', status: 'success', latencyMs })
        analytics?.trackPerformance?.('ai_chat_latency', latencyMs, 'ms', {
          surface: 'dashboard',
          status: 'success',
        })
        analytics?.track?.('ai', 'ai_stream', {
          metadata: {
            source: 'dashboard-chat',
            latencyMs,
            status: 'success',
            usedFallback: result.usedFallback,
          },
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Request interrupted by user.' } as ChatMessage].slice(-200))
          return
        }
        let errorMessage = error instanceof Error ? error.message : 'AI call failed.'
        if (error instanceof AdvancedChatRequestError) {
          const providerGate = isProviderSetupError(error)
          if (providerGate) {
            setAiProviderGate({
              message: error.message,
              capabilityStatus: error.capabilityStatus,
              setupUrl: error.setupUrl,
            })
            const setupTarget = error.setupUrl || '/settings?tab=api'
            errorMessage = `${error.message} Configure a provider in ${setupTarget} to enable chat.`
          } else {
            errorMessage = `${error.code}: ${error.message}`
          }
        }
        const latencyMs = Math.max(
          0,
          Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
        )
        setChatHistory((prev) => [...prev, { role: 'assistant', content: errorMessage } as ChatMessage].slice(-200))
        trackEvent('ai', 'ai_error', { source: 'dashboard-chat', latencyMs, error: errorMessage })
        analytics?.trackPerformance?.('ai_chat_latency', latencyMs, 'ms', {
          surface: 'dashboard',
          status: 'error',
        })
      } finally {
        chatAbortRef.current = null
        setIsStreaming(false)
      }
    })()
  }, [
    chatMessage,
    isStreaming,
    chatHistory,
    copilotProjectId,
    chatAbortRef,
    setChatMessage,
    setChatHistory,
    setIsStreaming,
    setFirstValueAiSuccess,
    setAiProviderGate,
    trackEvent,
  ])

  const handleMagicWandSelect = useCallback((position: Point3) => {
    setSelectedPreviewPoint(position)
    if (!activeWorkflowId) return
    const payload = buildLivePreviewContextPayload(activeWorkflowId, position)
    void fetch('/api/copilot/context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        projectId: copilotProjectId,
        ...payload,
      }),
    })
  }, [setSelectedPreviewPoint, activeWorkflowId, copilotProjectId])

  const handleSendLivePreviewSuggestion = useCallback(async (suggestion: string) => {
    const normalized = suggestion.trim()
    if (!normalized || isGenerating) return
    setIsGenerating(true)
    setLivePreviewSuggestions((prev) => [normalized, ...prev].slice(0, 10))
    try {
      const prompt = selectedPreviewPoint ? `${buildLivePreviewPrompt(selectedPreviewPoint)}\n\nUser request: ${normalized}` : normalized
      const result = await requestAdvancedChat({
        message: prompt,
        model: DEFAULT_MODEL,
        messages: [buildLivePreviewSystemMessage(), { role: 'user', content: prompt }],
        projectId: copilotProjectId ?? undefined,
        headers: getAuthHeaders(),
        profileOverride: {
          qualityMode: 'delivery',
          agentCount: 1,
          enableWebResearch: false,
        },
      })
      const parsed = extractPrimaryAssistantContent(JSON.parse(result.raw)) || extractApiContent(result.raw)
      const finalSuggestion = parsed.trim() || normalized
      setLivePreviewSuggestions((prev) => [finalSuggestion, ...prev].slice(0, 10))
      setChatHistory((prev) => [...prev, buildLivePreviewSuggestionMessage(finalSuggestion)].slice(-200))
    } catch (error) {
      const message =
        error instanceof AdvancedChatRequestError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Failed to generate suggestion.'
      setLivePreviewSuggestions((prev) => [`Error: ${message}`, ...prev].slice(0, 10))
    } finally {
      setIsGenerating(false)
    }
  }, [
    isGenerating,
    selectedPreviewPoint,
    copilotProjectId,
    setIsGenerating,
    setLivePreviewSuggestions,
    setChatHistory,
  ])

  return {
    handleOpenProviderSettings,
    handleStopDashboardChat,
    handleApplyDirectorNote,
    handleSendChatMessage,
    handleMagicWandSelect,
    handleSendLivePreviewSuggestion,
  }
}
