import { useEffect } from 'react'

import type { ChatMessage } from '@/lib/api'
import type { DashboardSettings } from './aethel-dashboard-model'
import { STORAGE_KEYS, type SessionEntry } from './aethel-dashboard-model'

type Params = {
  sessionHistory: SessionEntry[]
  chatHistory: ChatMessage[]
  settings: DashboardSettings
}

export function useDashboardStoragePersistence({ sessionHistory, chatHistory, settings }: Params) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.sessionHistory, JSON.stringify(sessionHistory))
    }
  }, [sessionHistory])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.chatHistory, JSON.stringify(chatHistory))
    }
  }, [chatHistory])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
    }
  }, [settings])
}
