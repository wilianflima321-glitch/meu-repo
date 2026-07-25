import type { ChatMessage } from '@/lib/api'
import {
  getUiPersistence,
  removeUiPersistence,
  setUiPersistence,
  UI_PERSISTENCE_LEGACY_KEYS,
} from '@/lib/storage/ui-persistence-spine'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  steps: string[]
  nodes: WorkflowGraphNode[]
  edges: WorkflowGraphEdge[]
  thumbnail?: string
}

export interface WorkflowGraphNode {
  id: string
  type?: string
  position?: {
    x: number
    y: number
  }
  data?: Record<string, unknown>
}

export interface WorkflowGraphEdge {
  id: string
  source: string
  target: string
  type?: string
  data?: Record<string, unknown>
}

export interface UseCase {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  features: string[]
  sharedBy: string
  views: number
  likes: number
  tags: string[]
  preview?: string
  title?: string
}

export interface DashboardSettings {
  theme: 'dark' | 'light'
  autoSave: boolean
  notifications: boolean
}

export type SessionFilter = 'all' | 'favorites' | 'scheduled'

export type DashboardPrimaryTab = 'overview' | 'projects' | 'activity'

export type DashboardLegacyTab =
  | 'ai-chat'
  | 'content-creation'
  | 'unreal'
  | 'wallet'
  | 'billing'
  | 'connectivity'
  | 'templates'

export type ActiveTab = DashboardPrimaryTab | DashboardLegacyTab

export const MISSION_CONTROL_TABS = ['overview', 'projects', 'activity'] as const satisfies readonly DashboardPrimaryTab[]
export const OPERATIONS_TABS = ['billing', 'wallet', 'connectivity'] as const satisfies readonly ActiveTab[]
export const EXPLORE_TABS = [
  'templates',
  'content-creation',
  'unreal',
] as const satisfies readonly ActiveTab[]
export const LEGACY_DASHBOARD_TABS = [
  'ai-chat',
  ...OPERATIONS_TABS,
  ...EXPLORE_TABS,
] as const satisfies readonly DashboardLegacyTab[]

export const DASHBOARD_TAB_GROUPS = {
  mission: MISSION_CONTROL_TABS,
  operations: OPERATIONS_TABS,
  explore: EXPLORE_TABS,
} as const

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastState {
  message: string
  type: ToastType
}

export interface SessionEntry {
  id: string
  name: string
  timestamp: number
  chatHistory: ChatMessage[]
  livePreviewSuggestions: string[]
  favorite?: boolean
  scheduled?: boolean
  settings?: DashboardSettings
}

export interface Project {
  id: number
  name: string
  type: 'code' | 'unreal' | 'web' | string
  status: 'active' | 'paused' | 'completed' | 'planning' | string
  settings?: Record<string, unknown> | null
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  theme: 'dark',
  autoSave: true,
  notifications: true,
}

export const STORAGE_KEYS = {
  sessionHistory: UI_PERSISTENCE_LEGACY_KEYS.dashboardSessionHistory,
  settings: UI_PERSISTENCE_LEGACY_KEYS.dashboardSettings,
  activeTab: UI_PERSISTENCE_LEGACY_KEYS.dashboardActiveTab,
  chatHistory: UI_PERSISTENCE_LEGACY_KEYS.dashboardChatHistory,
} as const

export const DASHBOARD_TABS: ActiveTab[] = [
  ...MISSION_CONTROL_TABS,
  ...LEGACY_DASHBOARD_TABS,
]

export const resolvePrimaryDashboardTab = (tab: ActiveTab): DashboardPrimaryTab => {
  if (tab === 'overview' || tab === 'projects' || tab === 'activity') {
    return tab
  }
  return 'activity'
}

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as { role?: unknown; content?: unknown }
  if (typeof candidate.content !== 'string') {
    return false
  }
  return candidate.role === 'user' || candidate.role === 'assistant' || candidate.role === 'system'
}

const coerceBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  return fallback
}

const sanitizeSessionEntry = (entry: unknown): SessionEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const candidate = entry as Partial<SessionEntry> & {
    settings?: Partial<DashboardSettings>
  }

  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.timestamp !== 'number') {
    return null
  }

  const chatHistory = Array.isArray(candidate.chatHistory)
    ? candidate.chatHistory.filter(isChatMessage)
    : []

  const livePreviewSuggestions = Array.isArray(candidate.livePreviewSuggestions)
    ? candidate.livePreviewSuggestions.filter((item): item is string => typeof item === 'string')
    : []

  const settings: DashboardSettings | undefined = candidate.settings
    ? {
        theme: candidate.settings.theme === 'light' ? 'light' : 'dark',
        autoSave: coerceBoolean(candidate.settings.autoSave, DEFAULT_SETTINGS.autoSave),
        notifications: coerceBoolean(candidate.settings.notifications, DEFAULT_SETTINGS.notifications),
      }
    : undefined

  return {
    id: candidate.id,
    name: candidate.name,
    timestamp: candidate.timestamp,
    chatHistory,
    livePreviewSuggestions,
    favorite: coerceBoolean(candidate.favorite, false),
    scheduled: coerceBoolean(candidate.scheduled, false),
    settings,
  }
}

export const resolveStoredSessions = (raw: string | null): SessionEntry[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map(sanitizeSessionEntry)
      .filter((session): session is SessionEntry => session !== null)
      .slice(0, 10)
  } catch {
    // Corrupt local state should not break dashboard boot.
    return []
  }
}

export const resolveStoredSettings = (raw: string | null): DashboardSettings => {
  if (!raw) {
    return { ...DEFAULT_SETTINGS }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardSettings> | null
    if (!parsed) {
      return { ...DEFAULT_SETTINGS }
    }
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      autoSave: coerceBoolean(parsed.autoSave, DEFAULT_SETTINGS.autoSave),
      notifications: coerceBoolean(parsed.notifications, DEFAULT_SETTINGS.notifications),
    }
  } catch {
    // Corrupt local settings should not break dashboard boot.
    return { ...DEFAULT_SETTINGS }
  }
}

export const resolveStoredActiveTab = (raw: string | null): ActiveTab => {
  if (!raw) {
    return 'overview'
  }
  if (MISSION_CONTROL_TABS.includes(raw as DashboardPrimaryTab)) {
    return raw as DashboardPrimaryTab
  }
  if (LEGACY_DASHBOARD_TABS.includes(raw as DashboardLegacyTab)) {
    return 'activity'
  }
  return 'overview'
}

export const resolveStoredChatHistory = (raw: string | null): ChatMessage[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(isChatMessage)
      .map((message) => ({ role: message.role, content: message.content } as ChatMessage))
      .slice(-200)
  } catch {
    // Corrupt chat cache should not block a fresh session.
    return []
  }
}

export const clearStoredDashboardState = () => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    removeUiPersistence('dashboard.sessionHistory')
    removeUiPersistence('dashboard.settings')
    removeUiPersistence('dashboard.activeTab')
    removeUiPersistence('dashboard.chatHistory')
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

/** CW4 helpers — prefer these over raw localStorage for dashboard critical keys. */
export function persistDashboardSessionHistory(value: unknown): boolean {
  return setUiPersistence('dashboard.sessionHistory', value)
}

export function persistDashboardChatHistory(value: unknown): boolean {
  return setUiPersistence('dashboard.chatHistory', value)
}

export function persistDashboardSettings(value: unknown): boolean {
  return setUiPersistence('dashboard.settings', value)
}

export function persistDashboardActiveTab(value: string): boolean {
  return setUiPersistence('dashboard.activeTab', value)
}

export function readDashboardActiveTabRaw(): string | null {
  return getUiPersistence('dashboard.activeTab', null, (v): v is string => typeof v === 'string')
}

export function readDashboardSessionHistoryRaw(): string | null {
  const value = getUiPersistence<unknown>('dashboard.sessionHistory', null)
  if (value === null) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function readDashboardChatHistoryRaw(): string | null {
  const value = getUiPersistence<unknown>('dashboard.chatHistory', null)
  if (value === null) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function readDashboardSettingsRaw(): string | null {
  const value = getUiPersistence<unknown>('dashboard.settings', null)
  if (value === null) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}
