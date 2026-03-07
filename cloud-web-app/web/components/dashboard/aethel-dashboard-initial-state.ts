import { type ChatMessage } from '@/lib/api'
import {
  type DashboardSettings,
  STORAGE_KEYS,
  resolveStoredChatHistory,
  resolveStoredSessions,
  resolveStoredSettings,
} from '@/components/dashboard/aethel-dashboard-model'
import { DASHBOARD_DEFAULT_SETTINGS, coerceActiveTab } from '@/components/dashboard/aethel-dashboard-core-types'

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined'
}

export function getInitialSessionHistory() {
  if (!canUseLocalStorage()) return []
  return resolveStoredSessions(window.localStorage.getItem(STORAGE_KEYS.sessionHistory))
}

export function getInitialActiveTab() {
  if (!canUseLocalStorage()) return 'overview'
  return coerceActiveTab(window.localStorage.getItem(STORAGE_KEYS.activeTab))
}

export function getInitialChatHistory(): ChatMessage[] {
  if (!canUseLocalStorage()) return []
  return resolveStoredChatHistory(window.localStorage.getItem(STORAGE_KEYS.chatHistory))
}

export function getInitialSettings(): DashboardSettings {
  if (!canUseLocalStorage()) return { ...DASHBOARD_DEFAULT_SETTINGS }
  return resolveStoredSettings(window.localStorage.getItem(STORAGE_KEYS.settings))
}

export function getInitialFirstValueGuideState(dismissedStorageKey: string): boolean {
  if (!canUseLocalStorage()) return true
  return window.localStorage.getItem(dismissedStorageKey) !== '1'
}
