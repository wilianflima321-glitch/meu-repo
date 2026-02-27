import type { ChatMessage } from '@/lib/api'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: any[]
  edges: any[]
  thumbnail?: string
}

export interface UseCase {
  id: string
  title: string
  description: string
  category: string
  sharedBy: string
  views: number
  likes: number
  tags: string[]
  preview?: string
}

export interface DashboardSettings {
  theme: 'dark' | 'light'
  autoSave: boolean
  notifications: boolean
}

export type SessionFilter = 'all' | 'favorites' | 'scheduled'

export type ActiveTab =
  | 'overview'
  | 'projects'
  | 'ai-chat'
  | 'agent-canvas'
  | 'content-creation'
  | 'unreal'
  | 'wallet'
  | 'billing'
  | 'connectivity'
  | 'templates'
  | 'use-cases'
  | 'download'
  | 'admin'

export type ToastType = 'success' | 'error' | 'info'

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
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  theme: 'dark',
  autoSave: true,
  notifications: true,
}

export const STORAGE_KEYS = {
  sessionHistory: 'aethel-dashboard::session-history',
  settings: 'aethel-dashboard::settings',
  activeTab: 'aethel-dashboard::active-tab',
  chatHistory: 'aethel-dashboard::chat-history',
} as const

export const DASHBOARD_TABS: ActiveTab[] = [
  'overview',
  'projects',
  'ai-chat',
  'agent-canvas',
  'content-creation',
  'unreal',
  'wallet',
  'billing',
  'connectivity',
  'templates',
  'use-cases',
  'download',
  'admin',
]

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
  } catch (error) {
    console.warn('Failed to parse stored sessions', error)
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
  } catch (error) {
    console.warn('Failed to parse stored settings', error)
    return { ...DEFAULT_SETTINGS }
  }
}

export const resolveStoredActiveTab = (raw: string | null): ActiveTab => {
  if (raw && DASHBOARD_TABS.includes(raw as ActiveTab)) {
    return raw as ActiveTab
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
  } catch (error) {
    console.warn('Failed to parse stored chat history', error)
    return []
  }
}

export const clearStoredDashboardState = () => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.removeItem(STORAGE_KEYS.sessionHistory)
    window.localStorage.removeItem(STORAGE_KEYS.settings)
    window.localStorage.removeItem(STORAGE_KEYS.activeTab)
    window.localStorage.removeItem(STORAGE_KEYS.chatHistory)
  } catch (error) {
    console.warn('Failed to clear stored dashboard state', error)
  }
}
