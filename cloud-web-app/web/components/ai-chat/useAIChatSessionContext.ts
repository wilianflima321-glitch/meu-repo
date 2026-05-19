'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { analytics } from '@/lib/analytics'
import { buildResearchPrompt, consumeResearchHandoff } from '@/lib/research-handoff'
import { buildResearchArtifactFromPayload } from '@/components/ai-chat/ai-chat-evidence'
import type { ChatMessage } from '@/components/ai-chat/ai-chat-container.types'

type UseAIChatSessionContextArgs = {
  currentModel: string
  fallbackProjectId?: string
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setProjectId: Dispatch<SetStateAction<string | undefined>>
  setMission: Dispatch<SetStateAction<string | null>>
  setSource: Dispatch<SetStateAction<string | null>>
}

function getProjectIdFromLocation(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const value = new URLSearchParams(window.location.search).get('projectId')
  if (!value || !value.trim()) return undefined
  return value.trim()
}

export function useAIChatSessionContext({
  currentModel,
  fallbackProjectId,
  setMessages,
  setProjectId,
  setMission,
  setSource,
}: UseAIChatSessionContextArgs) {
  useEffect(() => {
    setProjectId(getProjectIdFromLocation() ?? fallbackProjectId)

    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const missionParam = params.get('mission')
    const sourceParam = params.get('source')
    setMission(missionParam && missionParam.trim() ? missionParam.trim() : null)
    setSource(sourceParam && sourceParam.trim() ? sourceParam.trim() : null)
  }, [fallbackProjectId, setMission, setProjectId, setSource])

  useEffect(() => {
    const handoff = consumeResearchHandoff()
    if (!handoff) return

    const contextPrompt = buildResearchPrompt(handoff)
    const researchArtifact = buildResearchArtifactFromPayload(handoff)
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
            'Research handoff loaded. Send your next message to turn it into implementation steps. Tip: use @studio @web for a deeper multi-agent analysis.',
          timestamp: new Date(),
          model: currentModel,
          researchArtifact,
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
  }, [currentModel, setMessages])
}
