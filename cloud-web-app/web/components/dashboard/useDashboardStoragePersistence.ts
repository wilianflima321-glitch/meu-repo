import { useEffect } from 'react'

import type { ChatMessage } from '@/lib/api'
import type { DashboardSettings } from './aethel-dashboard-model'
import {
  persistDashboardChatHistory,
  persistDashboardSessionHistory,
  persistDashboardSettings,
  type SessionEntry,
} from './aethel-dashboard-model'

type Params = {
  sessionHistory: SessionEntry[]
  chatHistory: ChatMessage[]
  settings: DashboardSettings
}

export function useDashboardStoragePersistence({ sessionHistory, chatHistory, settings }: Params) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    persistDashboardSessionHistory(sessionHistory)
  }, [sessionHistory])

  useEffect(() => {
    if (typeof window === 'undefined') return
    persistDashboardChatHistory(chatHistory)
  }, [chatHistory])

  useEffect(() => {
    if (typeof window === 'undefined') return
    persistDashboardSettings(settings)
  }, [settings])
}
