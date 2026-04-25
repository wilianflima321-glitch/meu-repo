'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ChatThread, Message } from '@/components/ide/AIChatPanelPro.types'
import { formatTime } from './chat-utils'

export type AIChatTimelineTone = 'user' | 'assistant' | 'system' | 'live'

export interface AIChatTimelineItem {
  id: string
  tone: AIChatTimelineTone
  title: string
  summary: string
  meta: string
}

interface UseAIChatHistoryModeParams {
  activeThreadId?: string
  isLiveMode?: boolean
  liveStatus?: 'idle' | 'listening' | 'thinking' | 'speaking'
  messages?: Message[]
  onToggleHistory?: () => void
  showHistory?: boolean
  threads?: ChatThread[]
}

function summarizeMessage(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 96) return normalized
  return `${normalized.slice(0, 93)}...`
}

function buildTimelineItem(message: Message): AIChatTimelineItem {
  const title =
    message.role === 'user'
      ? 'Voce pediu'
      : message.role === 'assistant'
        ? 'IA respondeu'
        : 'Sistema'

  return {
    id: message.id,
    tone: message.role,
    title,
    summary: summarizeMessage(message.content),
    meta: formatTime(message.timestamp),
  }
}

export function useAIChatHistoryMode({
  activeThreadId,
  isLiveMode = false,
  liveStatus = 'idle',
  messages,
  onToggleHistory,
  showHistory = false,
  threads = [],
}: UseAIChatHistoryModeParams) {
  const [showHistorySidebar, setShowHistorySidebar] = useState(showHistory)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  )

  const timelineItems = useMemo(() => {
    const recentMessages = (messages ?? []).slice(-4).map(buildTimelineItem)

    if (isLiveMode) {
      recentMessages.push({
        id: `live-${liveStatus}`,
        tone: 'live',
        title: 'Modo ao vivo',
        summary:
          liveStatus === 'listening'
            ? 'Ouvindo a conversa em tempo real.'
            : liveStatus === 'thinking'
              ? 'Processando a interacao ao vivo.'
              : liveStatus === 'speaking'
                ? 'Respondendo em voz neste momento.'
                : 'Pronto para uma nova interacao ao vivo.',
        meta: 'agora',
      })
    }

    return recentMessages.reverse()
  }, [isLiveMode, liveStatus, messages])

  const toggleHistorySidebar = useCallback(() => {
    setShowHistorySidebar((previous) => !previous)
    onToggleHistory?.()
  }, [onToggleHistory])

  const closeHistorySidebar = useCallback(() => {
    setShowHistorySidebar(false)
  }, [])

  return {
    activeThread,
    closeHistorySidebar,
    hasHistory: threads.length > 0,
    setShowHistorySidebar,
    showHistorySidebar,
    timelineItems,
    toggleHistorySidebar,
  }
}
