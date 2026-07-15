'use client'

import { useMemo, useState } from 'react'
import type { Message } from '@aethel/ide-ui/AIChatPanelPro.types'
import type { AIChatConsoleMode } from '@/components/agents/chat/presets'

type UseAIChatPanelUiStateParams = {
  messages?: Message[]
}

export function useAIChatPanelUiState({ messages }: UseAIChatPanelUiStateParams) {
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [consoleMode, setConsoleMode] = useState<AIChatConsoleMode>('ask')
  const [agentCount, setAgentCount] = useState(1)

  const lastUserGoal = useMemo(() => {
    const list = messages ?? []
    const last = [...list].reverse().find((item) => item.role === 'user')
    return last?.content?.trim() || ''
  }, [messages])

  return {
    agentCount,
    consoleMode,
    lastUserGoal,
    setAgentCount,
    setConsoleMode,
    setShowModelSelector,
    showModelSelector,
  }
}
