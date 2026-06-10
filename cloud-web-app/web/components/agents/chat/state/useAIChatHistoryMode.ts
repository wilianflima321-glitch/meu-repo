'use client'

import { useCallback, useMemo, useState } from 'react'
import type { AIChatTimelineItem } from '@/components/agents/chat/activity'
import type { ChatThread, Message } from '@/components/ide/AIChatPanelPro.types'
import { formatTime } from '@/components/agents/chat/utils'

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
      ? 'You asked'
      : message.role === 'assistant'
        ? 'AI answered'
        : 'System'

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
        title: 'Live mode',
        summary:
          liveStatus === 'listening'
            ? 'Listening to the live conversation.'
            : liveStatus === 'thinking'
              ? 'Processing the live interaction.'
              : liveStatus === 'speaking'
                ? 'Speaking the response now.'
                : 'Ready for a new live interaction.',
        meta: 'now',
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
