'use client'

import { useMemo, useState } from 'react'
import type { Message } from '@/components/ide/AIChatPanelPro.types'
import type { AIChatConsoleMode } from './presets'

type UseAIChatPanelUiStateParams = {
  messages?: Message[]
  showHistory?: boolean
}

export function useAIChatPanelUiState({
  messages,
  showHistory = false,
}: UseAIChatPanelUiStateParams) {
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [consoleMode, setConsoleMode] = useState<AIChatConsoleMode>('ask')
  const [showHistorySidebar, setShowHistorySidebar] = useState(showHistory)
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
    setShowHistorySidebar,
    setShowModelSelector,
    showHistorySidebar,
    showModelSelector,
  }
}
