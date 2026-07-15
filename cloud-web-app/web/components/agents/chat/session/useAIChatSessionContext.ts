'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { analytics } from '@/lib/analytics'
import { buildResearchPrompt, consumeResearchHandoff } from '@/lib/research-handoff'
import { buildResearchArtifactFromPayload } from '@/components/agents/evidence'
import {
  buildDashboardLaunchSystemContext,
  consumeDashboardLaunchMission,
} from '@/components/dashboard/dashboard-launch-handoff'
import type { ChatMessage } from '@/components/agents/chat/session-types'

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
    const launchHandoff = missionParam?.trim() ? null : consumeDashboardLaunchMission()
    const mission = missionParam && missionParam.trim() ? missionParam.trim() : launchHandoff?.mission ?? null
    const source = sourceParam && sourceParam.trim() ? sourceParam.trim() : launchHandoff?.source ?? null

    setMission(mission)
    setSource(source)

    if (!launchHandoff) return

    setMessages((prev) => {
      if (prev.length > 0) return prev

      return [
        {
          id: `system-dashboard-launch-${Date.now()}`,
          role: 'system',
          content: buildDashboardLaunchSystemContext(launchHandoff),
          timestamp: new Date(),
        },
        {
          id: `assistant-dashboard-launch-${Date.now() + 1}`,
          role: 'assistant',
          content:
            'Studio Home mission loaded. Choose a quick intent or send the next message and I will keep Copilot, IDE, preview, Viewport 3D, receipts, and runtime checks aligned.',
          timestamp: new Date(),
          model: currentModel,
        },
      ]
    })

    analytics?.track?.('ai', 'ai_chat', {
      metadata: {
        source: 'dashboard-launch-handoff',
        missionLength: launchHandoff.mission.length,
      },
    })
  }, [currentModel, fallbackProjectId, setMessages, setMission, setProjectId, setSource])

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
