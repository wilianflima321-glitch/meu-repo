import { type ChatMessage } from '@/lib/api'
import {
  type DashboardSettings,
  readDashboardActiveTabRaw,
  readDashboardChatHistoryRaw,
  readDashboardSessionHistoryRaw,
  readDashboardSettingsRaw,
  resolveStoredChatHistory,
  resolveStoredSessions,
  resolveStoredSettings,
} from '@/components/dashboard/aethel-dashboard-model'
import { DASHBOARD_DEFAULT_SETTINGS, coerceActiveTab } from '@/components/dashboard/aethel-dashboard-core-types'
import { getUiPersistence, setUiPersistence } from '@/lib/storage/ui-persistence-spine'

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined'
}

export function getInitialSessionHistory() {
  if (!canUseLocalStorage()) return []
  return resolveStoredSessions(readDashboardSessionHistoryRaw())
}

export function getInitialActiveTab() {
  if (!canUseLocalStorage()) return 'overview'
  return coerceActiveTab(readDashboardActiveTabRaw())
}

export function getInitialChatHistory(): ChatMessage[] {
  if (!canUseLocalStorage()) return []
  return resolveStoredChatHistory(readDashboardChatHistoryRaw())
}

export function getInitialSettings(): DashboardSettings {
  if (!canUseLocalStorage()) return { ...DASHBOARD_DEFAULT_SETTINGS }
  return resolveStoredSettings(readDashboardSettingsRaw())
}

export function getInitialFirstValueGuideState(dismissedStorageKey: string): boolean {
  if (!canUseLocalStorage()) return true
  const fromSpine = getUiPersistence<string | null>('dashboard.firstValueDismissed', null)
  if (typeof fromSpine === 'string') return fromSpine !== '1'
  // Compat: migrate one-shot from caller legacy key into spine bag.
  const legacy = window.localStorage.getItem(dismissedStorageKey)
  if (legacy === '1') {
    setUiPersistence('dashboard.firstValueDismissed', '1')
    return false
  }
  return true
}
