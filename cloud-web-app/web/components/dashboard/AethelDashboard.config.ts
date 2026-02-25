import type { Edge, Node } from '@xyflow/react'
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

const DASHBOARD_TABS: ActiveTab[] = [
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
  if (!value || typeof value !== 'object') return false
  const candidate = value as { role?: unknown; content?: unknown }
  if (typeof candidate.content !== 'string') return false
  return candidate.role === 'user' || candidate.role === 'assistant' || candidate.role === 'system'
}

const coerceBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  if (typeof value === 'number') return value !== 0
  return fallback
}

const sanitizeSessionEntry = (entry: unknown): SessionEntry | null => {
  if (!entry || typeof entry !== 'object') return null

  const candidate = entry as Partial<SessionEntry> & { settings?: Partial<DashboardSettings> }
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.timestamp !== 'number') {
    return null
  }

  const chatHistory = Array.isArray(candidate.chatHistory) ? candidate.chatHistory.filter(isChatMessage) : []
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
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
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
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardSettings> | null
    if (!parsed) return { ...DEFAULT_SETTINGS }
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
  if (raw && DASHBOARD_TABS.includes(raw as ActiveTab)) return raw as ActiveTab
  return 'overview'
}

export const resolveStoredChatHistory = (raw: string | null): ChatMessage[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
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
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEYS.sessionHistory)
    window.localStorage.removeItem(STORAGE_KEYS.settings)
    window.localStorage.removeItem(STORAGE_KEYS.activeTab)
    window.localStorage.removeItem(STORAGE_KEYS.chatHistory)
  } catch (error) {
    console.warn('Failed to clear stored dashboard state', error)
  }
}

export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: '1',
    name: 'Assistente de pesquisa com IA',
    description: 'Fluxo multiagente para coletar, resumir e reportar descobertas',
    category: 'Pesquisa',
    nodes: [],
    edges: [],
  },
  {
    id: '2',
    name: 'Pipeline de dados',
    description: 'Processamento e visualização de dados ponta a ponta',
    category: 'Ciência de Dados',
    nodes: [],
    edges: [],
  },
  {
    id: '3',
    name: 'Suíte de criação de conteúdo',
    description: 'Geração e edição de conteúdo em múltiplas etapas',
    category: 'Criativo',
    nodes: [],
    edges: [],
  },
  {
    id: '4',
    name: 'Pesquisa e análise',
    description: 'Fluxo completo de pesquisa e análise',
    category: 'Pesquisa',
    nodes: [],
    edges: [],
  },
]

export const DEFAULT_USE_CASES: UseCase[] = [
  {
    id: '1',
    title: 'Criar um dashboard em React',
    description: 'Fluxo completo para criar um dashboard moderno em React com assistência de IA',
    category: 'Desenvolvimento',
    sharedBy: 'Comunidade',
    views: 1250,
    likes: 89,
    tags: ['React', 'Painel', 'Front-end'],
    preview: 'https://example.com/preview1.png',
  },
  {
    id: '2',
    title: 'Suíte de visualização de dados',
    description: 'Pipeline de análise e visualização de dados ponta a ponta',
    category: 'Ciência de Dados',
    sharedBy: 'EspecialistaDados',
    views: 890,
    likes: 67,
    tags: ['Python', 'Visualização', 'Análises'],
    preview: 'https://example.com/preview2.png',
  },
  {
    id: '3',
    title: 'Estratégia de marketing de conteúdo',
    description: 'Criação de conteúdo com IA e desenvolvimento de estratégia de marketing',
    category: 'Marketing',
    sharedBy: 'MarketingPro',
    views: 2100,
    likes: 145,
    tags: ['Marketing', 'Conteúdo', 'Estratégia'],
    preview: 'https://example.com/preview3.png',
  },
]

export const DEFAULT_PROJECTS: Project[] = [
  { id: 1, name: 'Estúdio de Conteúdo IA', type: 'code', status: 'active' },
  { id: 2, name: 'Hub do Metaverso', type: 'unreal', status: 'active' },
  { id: 3, name: 'Funil de automação', type: 'web', status: 'planning' },
]

export const INITIAL_NODES: Node[] = [
  {
    id: '1',
    position: { x: 80, y: 40 },
    data: { label: 'Sinal de entrada' },
    type: 'input',
  },
  {
    id: '2',
    position: { x: 320, y: 140 },
    data: { label: 'Orquestrador IA' },
  },
  {
    id: '3',
    position: { x: 560, y: 40 },
    data: { label: 'Saída' },
    type: 'output',
  },
]

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
]

export const HEALTH_KEY = 'health::status'
export const CONNECTIVITY_KEY = 'connectivity::status'
export const BILLING_PLANS_KEY = 'billing::plans'
export const WALLET_KEY = 'wallet::summary'
export const CURRENT_PLAN_KEY = 'billing::current-plan'
export const CREDITS_KEY = 'billing::credits'

const CHAT_THREAD_KEY_BASE = 'chat::activeThreadId'
const COPILOT_WORKFLOW_KEY_BASE = 'copilot::activeWorkflowId'

const STATUS_LABELS: Record<string, string> = {
  pending: 'pendente',
  processing: 'processando',
  paid: 'pago',
  succeeded: 'confirmado',
  success: 'confirmado',
  completed: 'concluído',
  failed: 'falhou',
  canceled: 'cancelado',
  cancelled: 'cancelado',
  awaiting_settlement: 'aguardando liquidação',
  refunded: 'reembolsado',
  requires_action: 'requer ação',
  requires_payment_method: 'requer método de pagamento',
  requires_confirmation: 'requer confirmação',
  requires_capture: 'requer captura',
}

const CONNECTIVITY_STATUS_LABELS: Record<string, string> = {
  healthy: 'saudável',
  degraded: 'degradado',
  down: 'indisponível',
  unavailable: 'indisponível',
  unknown: 'desconhecido',
}

export function formatStatusLabel(rawStatus: unknown) {
  if (typeof rawStatus !== 'string' || !rawStatus.trim()) return 'confirmado'
  const normalized = rawStatus.toLowerCase()
  return STATUS_LABELS[normalized] ?? rawStatus
}

export function formatConnectivityStatus(rawStatus?: string | null) {
  if (!rawStatus) return CONNECTIVITY_STATUS_LABELS.unknown
  const normalized = rawStatus.toLowerCase()
  return CONNECTIVITY_STATUS_LABELS[normalized] ?? rawStatus
}

export function formatCurrencyLabel(currency?: string | null) {
  if (!currency) return 'créditos'
  if (currency.toLowerCase() === 'credits') return 'créditos'
  return currency
}

export function getScopedKeys(projectId: string | null) {
  const suffix = projectId ? `::${projectId}` : ''
  return {
    chatThreadKey: `${CHAT_THREAD_KEY_BASE}${suffix}`,
    workflowKey: `${COPILOT_WORKFLOW_KEY_BASE}${suffix}`,
    legacyChatThreadKey: CHAT_THREAD_KEY_BASE,
    legacyWorkflowKey: COPILOT_WORKFLOW_KEY_BASE,
  }
}
