'use client'
import Link from 'next/link'

import { AethelAPIClient, APIError } from '@/lib/api'
import type {
  BillingPlan,
  ChatMessage,
  CopilotWorkflowSummary,
  ConnectivityResponse,
  PurchaseIntentResponse,
  TransferResponse,
  WalletSummary,
} from '@/lib/api'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import LivePreview from './LivePreview'
import MiniPreview from './MiniPreview'
import AdminPanel from './AdminPanel'
import * as THREE from 'three'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { isAuthenticated } from '@/lib/auth'

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: any[];
  edges: any[];
  thumbnail?: string;
}

interface UseCase {
  id: string;
  title: string;
  description: string;
  category: string;
  sharedBy: string;
  views: number;
  likes: number;
  tags: string[];
  preview?: string;
}

interface DashboardSettings {
  theme: 'dark' | 'light';
  autoSave: boolean;
  notifications: boolean;
}

type SessionFilter = 'all' | 'favorites' | 'scheduled';

type ActiveTab =
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
  | 'admin';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

interface SessionEntry {
  id: string;
  name: string;
  timestamp: number;
  chatHistory: ChatMessage[];
  livePreviewSuggestions: string[];
  favorite?: boolean;
  scheduled?: boolean;
  settings?: DashboardSettings;
}

interface Project {
  id: number;
  name: string;
  type: 'code' | 'unreal' | 'web' | string;
  status: 'active' | 'paused' | 'completed' | 'planning' | string;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  theme: 'dark',
  autoSave: true,
  notifications: true,
};

const STORAGE_KEYS = {
  sessionHistory: 'aethel-dashboard::session-history',
  settings: 'aethel-dashboard::settings',
  activeTab: 'aethel-dashboard::active-tab',
  chatHistory: 'aethel-dashboard::chat-history',
} as const;

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
];

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as { role?: unknown; content?: unknown };
  if (typeof candidate.content !== 'string') {
    return false;
  }
  return candidate.role === 'user' || candidate.role === 'assistant' || candidate.role === 'system';
};

const coerceBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (normalised === 'true') {
      return true;
    }
    if (normalised === 'false') {
      return false;
    }
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return fallback;
};

const sanitizeSessionEntry = (entry: unknown): SessionEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Partial<SessionEntry> & {
    settings?: Partial<DashboardSettings>;
  };

  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.timestamp !== 'number') {
    return null;
  }

  const chatHistory = Array.isArray(candidate.chatHistory)
    ? candidate.chatHistory.filter(isChatMessage)
    : [];

  const livePreviewSuggestions = Array.isArray(candidate.livePreviewSuggestions)
    ? candidate.livePreviewSuggestions.filter((item): item is string => typeof item === 'string')
    : [];

  const settings: DashboardSettings | undefined = candidate.settings
    ? {
        theme: candidate.settings.theme === 'light' ? 'light' : 'dark',
        autoSave: coerceBoolean(candidate.settings.autoSave, DEFAULT_SETTINGS.autoSave),
        notifications: coerceBoolean(candidate.settings.notifications, DEFAULT_SETTINGS.notifications),
      }
    : undefined;

  return {
    id: candidate.id,
    name: candidate.name,
    timestamp: candidate.timestamp,
    chatHistory,
    livePreviewSuggestions,
    favorite: coerceBoolean(candidate.favorite, false),
    scheduled: coerceBoolean(candidate.scheduled, false),
    settings,
  };
};

const resolveStoredSessions = (raw: string | null): SessionEntry[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(sanitizeSessionEntry)
      .filter((session): session is SessionEntry => session !== null)
      .slice(0, 10);
  } catch (error) {
    console.warn('Failed to parse stored sessions', error);
    return [];
  }
};

const resolveStoredSettings = (raw: string | null): DashboardSettings => {
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardSettings> | null;
    if (!parsed) {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      autoSave: coerceBoolean(parsed.autoSave, DEFAULT_SETTINGS.autoSave),
      notifications: coerceBoolean(parsed.notifications, DEFAULT_SETTINGS.notifications),
    };
  } catch (error) {
    console.warn('Failed to parse stored settings', error);
    return { ...DEFAULT_SETTINGS };
  }
};

const resolveStoredActiveTab = (raw: string | null): ActiveTab => {
  if (raw && DASHBOARD_TABS.includes(raw as ActiveTab)) {
    return raw as ActiveTab;
  }
  return 'overview';
};

const resolveStoredChatHistory = (raw: string | null): ChatMessage[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isChatMessage)
      .map(message => ({ role: message.role, content: message.content } as ChatMessage))
      .slice(-200);
  } catch (error) {
    console.warn('Failed to parse stored chat history', error);
    return [];
  }
};

const clearStoredDashboardState = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEYS.sessionHistory);
    window.localStorage.removeItem(STORAGE_KEYS.settings);
    window.localStorage.removeItem(STORAGE_KEYS.activeTab);
    window.localStorage.removeItem(STORAGE_KEYS.chatHistory);
  } catch (error) {
    console.warn('Failed to clear stored dashboard state', error);
  }
};

const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: '1',
    name: 'AI Research Assistant',
    description: 'Multi-agent workflow for gathering, summarizing, and reporting findings',
    category: 'Research',
    nodes: [],
    edges: [],
  },
  {
    id: '2',
    name: 'Data Ops Pipeline',
    description: 'End-to-end data processing and visualization',
    category: 'Data Science',
    nodes: [],
    edges: [],
  },
  {
    id: '3',
    name: 'Content Creation Suite',
    description: 'Multi-step content generation and editing',
    category: 'Creative',
    nodes: [],
    edges: [],
  },
  {
    id: '4',
    name: 'Research & Analysis',
    description: 'Comprehensive research and analysis workflow',
    category: 'Research',
    nodes: [],
    edges: [],
  },
]

const DEFAULT_USE_CASES: UseCase[] = [
  {
    id: '1',
    title: 'Build a React Dashboard',
    description: 'Complete workflow for creating a modern React dashboard with AI assistance',
    category: 'Development',
    sharedBy: 'Community',
    views: 1250,
    likes: 89,
    tags: ['React', 'Dashboard', 'Frontend'],
    preview: 'https://example.com/preview1.png',
  },
  {
    id: '2',
    title: 'Data Visualization Suite',
    description: 'End-to-end data analysis and visualization pipeline',
    category: 'Data Science',
    sharedBy: 'DataExpert',
    views: 890,
    likes: 67,
    tags: ['Python', 'Visualization', 'Analytics'],
    preview: 'https://example.com/preview2.png',
  },
  {
    id: '3',
    title: 'Content Marketing Strategy',
    description: 'AI-powered content creation and marketing strategy development',
    category: 'Marketing',
    sharedBy: 'MarketingPro',
    views: 2100,
    likes: 145,
    tags: ['Marketing', 'Content', 'Strategy'],
    preview: 'https://example.com/preview3.png',
  },
]

const DEFAULT_PROJECTS: Project[] = [
  { id: 1, name: 'AI Content Studio', type: 'code', status: 'active' },
  { id: 2, name: 'Metaverse Hub', type: 'unreal', status: 'active' },
  { id: 3, name: 'Automation Funnel', type: 'web', status: 'planning' },
]

const INITIAL_NODES: Node[] = [
  {
    id: '1',
    position: { x: 80, y: 40 },
    data: { label: 'Input Signal' },
    type: 'input',
  },
  {
    id: '2',
    position: { x: 320, y: 140 },
    data: { label: 'AI Orchestrator' },
  },
  {
    id: '3',
    position: { x: 560, y: 40 },
    data: { label: 'Output' },
    type: 'output',
  },
]

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
]

const HEALTH_KEY = 'health::status'
const CONNECTIVITY_KEY = 'connectivity::status'
const BILLING_PLANS_KEY = 'billing::plans'
const WALLET_KEY = 'wallet::summary'
const CURRENT_PLAN_KEY = 'billing::current-plan'
const CREDITS_KEY = 'billing::credits'

const CHAT_THREAD_KEY_BASE = 'chat::activeThreadId'
const COPILOT_WORKFLOW_KEY_BASE = 'copilot::activeWorkflowId'

function getScopedKeys(projectId: string | null) {
  const suffix = projectId ? `::${projectId}` : ''
  return {
    chatThreadKey: `${CHAT_THREAD_KEY_BASE}${suffix}`,
    workflowKey: `${COPILOT_WORKFLOW_KEY_BASE}${suffix}`,
    legacyChatThreadKey: CHAT_THREAD_KEY_BASE,
    legacyWorkflowKey: COPILOT_WORKFLOW_KEY_BASE,
  }
}

export default function AethelDashboard() {
  const { mutate } = useSWRConfig()

  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES)
  const [useCases, setUseCases] = useState<UseCase[]>(DEFAULT_USE_CASES)
  const [showToast, setShowToast] = useState<ToastState | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>(() => {
    if (typeof window === 'undefined') {
      return []
    }
    return resolveStoredSessions(window.localStorage.getItem(STORAGE_KEYS.sessionHistory))
  })
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window === 'undefined') {
      return 'overview'
    }
    return resolveStoredActiveTab(window.localStorage.getItem(STORAGE_KEYS.activeTab))
  })
  const [aiActivity, setAiActivity] = useState('Idle')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') {
      return []
    }
    return resolveStoredChatHistory(window.localStorage.getItem(STORAGE_KEYS.chatHistory))
  })
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null)
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null)
  const [copilotProjectId, setCopilotProjectId] = useState<string | null>(null)
  const [copilotWorkflows, setCopilotWorkflows] = useState<CopilotWorkflowSummary[]>([])
  const [copilotWorkflowsLoading, setCopilotWorkflowsLoading] = useState(false)
  const [connectFromWorkflowId, setConnectFromWorkflowId] = useState<string>('')
  const [connectBusy, setConnectBusy] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [livePreviewSuggestions, setLivePreviewSuggestions] = useState<string[]>([])
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SETTINGS }
    }
    return resolveStoredSettings(window.localStorage.getItem(STORAGE_KEYS.settings))
  })
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState<Project['type']>('code')
  const [isGenerating, setIsGenerating] = useState(false)
  const [miniPreviewExpanded, setMiniPreviewExpanded] = useState(true)
  const [chatMode, setChatMode] = useState<'chat' | 'agent' | 'canvas'>('chat')
  const [walletActionMessage, setWalletActionMessage] = useState<string | null>(null)
  const [walletActionError, setWalletActionError] = useState<string | null>(null)
  const [walletSubmitting, setWalletSubmitting] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState({ amount: '', currency: 'credits', reference: '' })
  const [transferForm, setTransferForm] = useState({ targetUserId: '', amount: '', currency: 'credits', reference: '' })
  const [lastPurchaseIntent, setLastPurchaseIntent] = useState<PurchaseIntentResponse | null>(null)
  const [lastTransferReceipt, setLastTransferReceipt] = useState<TransferResponse | null>(null)
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)
  const [isTrialActive, setIsTrialActive] = useState(true)
  const trialDaysLeft = 14
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES)
  const [hasToken, setHasToken] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState<Error | null>(null)

  // Show toast notification (must be declared before callbacks that use it)
  const showToastMessage = useCallback((message: string, type: ToastType = 'info') => {
    setShowToast({ message, type })
    const timeoutId = window.setTimeout(() => setShowToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const walletKey = hasToken ? WALLET_KEY : null
  const currentPlanKey = hasToken ? CURRENT_PLAN_KEY : null
  const creditsKey = hasToken ? CREDITS_KEY : null

  const { data: healthData } = useSWR(HEALTH_KEY, () => AethelAPIClient.health(), {
    revalidateOnFocus: false,
  })

  const { data: billingData, error: billingError } = useSWR<BillingPlan[]>(
    BILLING_PLANS_KEY,
    () => AethelAPIClient.getBillingPlans(),
    { revalidateOnFocus: false }
  )

  const { data: walletData, error: walletError, isLoading: walletLoading } = useSWR<WalletSummary>(
    walletKey,
    () => AethelAPIClient.getWalletSummary(),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const { data: connectivityData, error: connectivityError, isLoading: connectivityLoading } = useSWR<ConnectivityResponse>(
    CONNECTIVITY_KEY,
    () => AethelAPIClient.getConnectivityStatus(),
    { revalidateOnFocus: false }
  )

  const { data: currentPlan, error: currentPlanError } = useSWR<BillingPlan>(
    currentPlanKey,
    () => AethelAPIClient.getCurrentPlan(),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const { data: creditsInfo, error: creditsError } = useSWR<{ credits: number }>(
    creditsKey,
    () => AethelAPIClient.getCredits(),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.sessionHistory,
        JSON.stringify(sessionHistory.slice(0, 10))
      )
    } catch (error) {
      console.warn('Failed to persist session history', error)
    }
  }, [sessionHistory])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.chatHistory,
        JSON.stringify(chatHistory.slice(-200))
      )
    } catch (error) {
      console.warn('Failed to persist chat history', error)
    }
  }, [chatHistory])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
    } catch (error) {
      console.warn('Failed to persist settings', error)
    }
  }, [settings])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.activeTab, activeTab)
    } catch (error) {
      console.warn('Failed to persist active tab', error)
    }
  }, [activeTab])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark')
    }
  }, [settings.theme])

  useEffect(() => {
    try {
      setHasToken(isAuthenticated())
    } catch (error) {
      setAuthError(error instanceof Error ? error : new Error('Failed to verify authentication state'))
      setHasToken(false)
    } finally {
      setAuthReady(true)
    }
  }, [])

  // Persistência do Chat por conta: restaura a última thread e salva mensagens no backend.
  useEffect(() => {
    if (!authReady || !hasToken) return
    if (typeof window === 'undefined') return

    let cancelled = false

    void (async () => {
      try {
        const ctx = await AethelAPIClient.getCopilotContext().catch(() => ({ projectId: null as any }))
        const projectId = typeof (ctx as any)?.projectId === 'string' ? String((ctx as any).projectId) : null
        setCopilotProjectId(projectId)
        const keys = getScopedKeys(projectId)

        const refreshWorkflows = async () => {
          setCopilotWorkflowsLoading(true)
          try {
            const workflows = await AethelAPIClient.listCopilotWorkflows().catch(() => ({ workflows: [] as any[] }))
            const list = Array.isArray((workflows as any).workflows) ? ((workflows as any).workflows as CopilotWorkflowSummary[]) : []
            setCopilotWorkflows(list)
            return list
          } finally {
            setCopilotWorkflowsLoading(false)
          }
        }

        const storedWorkflowId = window.localStorage.getItem(keys.workflowKey) || window.localStorage.getItem(keys.legacyWorkflowKey)
        if (storedWorkflowId) {
          const wf = await AethelAPIClient.getCopilotWorkflow(storedWorkflowId).catch(() => null)
          const workflow = (wf as any)?.workflow
          if (workflow?.id) {
            setActiveWorkflowId(String(workflow.id))
            window.localStorage.setItem(keys.workflowKey, String(workflow.id))
            if (workflow.chatThreadId) {
              window.localStorage.setItem(keys.chatThreadKey, String(workflow.chatThreadId))
              setActiveChatThreadId(String(workflow.chatThreadId))
            }
          }
        }

        await refreshWorkflows().catch(() => null)

        const storedThreadId = window.localStorage.getItem(keys.chatThreadKey) || window.localStorage.getItem(keys.legacyChatThreadKey)
        const list = await AethelAPIClient.listChatThreads().catch(() => ({ threads: [] as any[] }))
        const threads = Array.isArray((list as any).threads) ? (list as any).threads : []

        let threadId: string | null = storedThreadId
        if (threadId && !threads.find((t: any) => t?.id === threadId)) {
          threadId = null
        }
        if (!threadId && threads.length > 0 && typeof threads[0]?.id === 'string') {
          threadId = threads[0].id
        }
        if (!threadId) {
          const created = await AethelAPIClient.createChatThread({ title: 'Chat' })
          threadId = (created as any)?.thread?.id ?? null
        }

        if (!threadId) return
        if (cancelled) return

        window.localStorage.setItem(keys.chatThreadKey, threadId)
        setActiveChatThreadId(threadId)

        // Garante workflow persistente associado a essa thread.
        if (!window.localStorage.getItem(keys.workflowKey) && !window.localStorage.getItem(keys.legacyWorkflowKey)) {
          const createdWf = await AethelAPIClient.createCopilotWorkflow({
            title: 'Workflow',
            chatThreadId: threadId,
          }).catch(() => null)
          const wfId = (createdWf as any)?.workflow?.id
          if (wfId) {
            window.localStorage.setItem(keys.workflowKey, String(wfId))
            setActiveWorkflowId(String(wfId))
          }
        }

        const data = await AethelAPIClient.getChatMessages(threadId)
        const raw = Array.isArray((data as any)?.messages) ? (data as any).messages : []
        const restored: ChatMessage[] = raw
          .filter((m: any) => m && typeof m.content === 'string')
          .map((m: any) => ({ role: (m.role as any) || 'user', content: m.content }))

        if (cancelled) return
        if (restored.length) {
          setChatHistory(restored)
        }
      } catch (e) {
        console.warn('Chat persistence unavailable', e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authReady, hasToken])

  const loadChatHistoryForThread = useCallback(async (threadId: string) => {
    const data = await AethelAPIClient.getChatMessages(threadId)
    const raw = Array.isArray((data as any)?.messages) ? (data as any).messages : []
    const restored: ChatMessage[] = raw
      .filter((m: any) => m && typeof m.content === 'string')
      .map((m: any) => ({ role: (m.role as any) || 'user', content: m.content }))
    setChatHistory(restored)
  }, [])

  const refreshCopilotWorkflows = useCallback(async () => {
    setCopilotWorkflowsLoading(true)
    try {
      const res = await AethelAPIClient.listCopilotWorkflows().catch(() => ({ workflows: [] as any[] }))
      const list = Array.isArray((res as any).workflows) ? ((res as any).workflows as CopilotWorkflowSummary[]) : []
      setCopilotWorkflows(list)
      return list
    } finally {
      setCopilotWorkflowsLoading(false)
    }
  }, [])

  const switchCopilotWorkflow = useCallback(async (workflowId: string) => {
    const got = await AethelAPIClient.getCopilotWorkflow(workflowId)
    const wf = (got as any)?.workflow as CopilotWorkflowSummary | undefined
    if (!wf?.id) return

    const projectId = wf.projectId ? String(wf.projectId) : null
    setCopilotProjectId(projectId)
    const keys = getScopedKeys(projectId)

    setActiveWorkflowId(String(wf.id))
    if (typeof window !== 'undefined') window.localStorage.setItem(keys.workflowKey, String(wf.id))

    let threadId: string | null = wf.chatThreadId ? String(wf.chatThreadId) : null
    if (!threadId) {
      const created = await AethelAPIClient.createChatThread({ title: wf.title || 'Chat' })
      threadId = (created as any)?.thread?.id ?? null
      if (threadId) {
        await AethelAPIClient.updateCopilotWorkflow(String(wf.id), { chatThreadId: threadId }).catch(() => null)
        await refreshCopilotWorkflows().catch(() => null)
      }
    }

    if (!threadId) return
    setActiveChatThreadId(threadId)
    if (typeof window !== 'undefined') window.localStorage.setItem(keys.chatThreadKey, threadId)

    await loadChatHistoryForThread(threadId).catch(() => null)
  }, [loadChatHistoryForThread, refreshCopilotWorkflows])

  const createCopilotWorkflow = useCallback(async () => {
    const title = `Workflow ${new Date().toLocaleString()}`
    const createdThread = await AethelAPIClient.createChatThread({ title, ...(copilotProjectId ? { projectId: copilotProjectId } : {}) })
    const threadId = (createdThread as any)?.thread?.id as string | undefined
    const createdWf = await AethelAPIClient.createCopilotWorkflow({
      title,
      ...(copilotProjectId ? { projectId: copilotProjectId } : {}),
      ...(threadId ? { chatThreadId: threadId } : {}),
    }).catch(() => null)
    const wfId = (createdWf as any)?.workflow?.id as string | undefined
    await refreshCopilotWorkflows().catch(() => null)
    if (wfId) await switchCopilotWorkflow(String(wfId)).catch(() => null)
  }, [copilotProjectId, refreshCopilotWorkflows, switchCopilotWorkflow])

  const renameCopilotWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    const current = copilotWorkflows.find((w) => String(w.id) === String(activeWorkflowId))
    const nextTitle = window.prompt('Novo nome do trabalho (workflow):', current?.title || 'Workflow')
    if (!nextTitle || !nextTitle.trim()) return
    await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { title: nextTitle.trim() }).catch(() => null)
    await refreshCopilotWorkflows().catch(() => null)
    showToastMessage('Trabalho renomeado.', 'success')
  }, [activeWorkflowId, copilotWorkflows, refreshCopilotWorkflows, showToastMessage])

  const archiveCopilotWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    const ok = window.confirm('Arquivar este trabalho (workflow)?')
    if (!ok) return
    await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { archived: true }).catch(() => null)
    const list = await refreshCopilotWorkflows().catch(() => [])
    const next = Array.isArray(list) ? (list as any[])[0]?.id : (copilotWorkflows[0]?.id ?? null)
    if (next) await switchCopilotWorkflow(String(next)).catch(() => null)
    else await createCopilotWorkflow().catch(() => null)
    showToastMessage('Trabalho arquivado.', 'info')
  }, [activeWorkflowId, copilotWorkflows, createCopilotWorkflow, refreshCopilotWorkflows, switchCopilotWorkflow, showToastMessage])

  const copyHistoryFromWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    if (!connectFromWorkflowId) {
      showToastMessage('Selecione um trabalho para copiar o histórico.', 'error')
      return
    }

    if (connectBusy) return
    setConnectBusy(true)

    try {
      showToastMessage('Copiando histórico (server-side)…', 'info')
      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null)
      const source = (sourceRes as any)?.workflow as any
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null
      if (!sourceThreadId) {
        showToastMessage('Esse trabalho não tem histórico (thread) para copiar.', 'error')
        return
      }

      const current = copilotWorkflows.find((w) => String(w.id) === String(activeWorkflowId))
      const title = `${current?.title || 'Workflow'} (cópia)`

      const created = await AethelAPIClient.cloneChatThread({ sourceThreadId, title }).catch(() => null)
      const newThreadId = (created as any)?.thread?.id ? String((created as any).thread.id) : null
      if (!newThreadId) {
        showToastMessage('Falha ao clonar o histórico.', 'error')
        return
      }

      await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: newThreadId }).catch(() => null)
      await refreshCopilotWorkflows().catch(() => null)
      setConnectFromWorkflowId('')
      await switchCopilotWorkflow(activeWorkflowId).catch(() => null)
      showToastMessage('Histórico copiado para este trabalho.', 'success')
    } finally {
      setConnectBusy(false)
    }
  }, [activeWorkflowId, connectBusy, connectFromWorkflowId, copilotWorkflows, refreshCopilotWorkflows, switchCopilotWorkflow, showToastMessage])

  const mergeFromWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    if (!connectFromWorkflowId) {
      showToastMessage('Selecione um trabalho para mesclar.', 'error')
      return
    }

    if (connectBusy) return
    setConnectBusy(true)

    try {
      showToastMessage('Mesclando trabalhos (server-side)…', 'info')

      const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null)
      const source = (sourceRes as any)?.workflow as any
      const sourceThreadId = source?.chatThreadId ? String(source.chatThreadId) : null
      if (!sourceThreadId) {
        showToastMessage('Esse trabalho não tem histórico (thread) para mesclar.', 'error')
        return
      }

      let targetThreadId: string | null = activeChatThreadId
      if (!targetThreadId) {
        const current = copilotWorkflows.find((w) => String(w.id) === String(activeWorkflowId))
        const created = await AethelAPIClient.createChatThread({
          title: current?.title || 'Chat',
          ...(copilotProjectId ? { projectId: copilotProjectId } : {}),
        })
        targetThreadId = (created as any)?.thread?.id ?? null
        if (targetThreadId) {
          await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { chatThreadId: targetThreadId }).catch(() => null)
        }
      }

      if (!targetThreadId) {
        showToastMessage('Não foi possível determinar a thread de destino.', 'error')
        return
      }

      await AethelAPIClient.mergeChatThreads({ sourceThreadId, targetThreadId }).catch(() => null)

      const ctx = source?.context
      if (ctx && typeof ctx === 'object') {
        const patch: any = { workflowId: activeWorkflowId }
        if ((ctx as any).livePreview) patch.livePreview = (ctx as any).livePreview
        if ((ctx as any).editor) patch.editor = (ctx as any).editor
        if (Array.isArray((ctx as any).openFiles)) patch.openFiles = (ctx as any).openFiles
        await fetch('/api/copilot/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }).catch(() => null)
      }

      await AethelAPIClient.updateCopilotWorkflow(connectFromWorkflowId, { archived: true }).catch(() => null)
      await refreshCopilotWorkflows().catch(() => null)
      setConnectFromWorkflowId('')
      setActiveChatThreadId(targetThreadId)
      await loadChatHistoryForThread(targetThreadId).catch(() => null)
      showToastMessage('Trabalhos mesclados. O trabalho de origem foi arquivado.', 'success')
    } finally {
      setConnectBusy(false)
    }
  }, [activeChatThreadId, activeWorkflowId, connectBusy, connectFromWorkflowId, copilotProjectId, copilotWorkflows, loadChatHistoryForThread, refreshCopilotWorkflows, showToastMessage])

  const importContextFromWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    if (!connectFromWorkflowId) {
      showToastMessage('Selecione um trabalho para importar o contexto.', 'error')
      return
    }

    const sourceRes = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId).catch(() => null)
    const source = (sourceRes as any)?.workflow as any
    const ctx = source?.context
    if (!ctx || typeof ctx !== 'object') {
      showToastMessage('Esse trabalho não tem contexto salvo para importar.', 'error')
      return
    }

    const patch: any = { workflowId: activeWorkflowId }
    if ((ctx as any).livePreview) patch.livePreview = (ctx as any).livePreview
    if ((ctx as any).editor) patch.editor = (ctx as any).editor
    if (Array.isArray((ctx as any).openFiles)) patch.openFiles = (ctx as any).openFiles

    if (connectBusy) return
    setConnectBusy(true)
    try {
      showToastMessage('Importando contexto…', 'info')
      await fetch('/api/copilot/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).catch(() => null)

      showToastMessage('Contexto importado para o trabalho atual.', 'success')
      setConnectFromWorkflowId('')
    } finally {
      setConnectBusy(false)
    }
  }, [activeWorkflowId, connectBusy, connectFromWorkflowId, showToastMessage])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorage = () => {
      try {
        setHasToken(isAuthenticated())
      } catch (error) {
        setAuthError(error instanceof Error ? error : new Error('Failed to verify authentication state'))
        setHasToken(false)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleTheme = useCallback(() => {
    setSettings(prev => {
      const nextTheme = prev.theme === 'dark' ? 'light' : 'dark'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', nextTheme === 'dark')
      }
      return { ...prev, theme: nextTheme }
    })
  }, [])

  // Create new session
  const createNewSession = useCallback(() => {
    setSessionHistory(prev => {
      const newSession: SessionEntry = {
        id: Date.now().toString(),
        name: `New Session ${prev.length + 1}`,
        timestamp: Date.now(),
        chatHistory: [],
        livePreviewSuggestions: [],
        favorite: false,
        scheduled: false,
        settings: { ...settings },
      }
      return [newSession, ...prev]
    })
    setChatHistory([])
    setLivePreviewSuggestions([])
    setActiveTab('ai-chat')
    showToastMessage('New session created!', 'success')

    // Também cria uma nova thread persistida para a conta.
    if (typeof window !== 'undefined' && isAuthenticated()) {
      void (async () => {
        try {
          const created = await AethelAPIClient.createChatThread({ title: `Session ${new Date().toLocaleString()}` })
          const threadId = (created as any)?.thread?.id
          if (typeof threadId === 'string' && threadId) {
            const keys = getScopedKeys(copilotProjectId)
            window.localStorage.setItem(keys.chatThreadKey, threadId)
            setActiveChatThreadId(threadId)

            const createdWf = await AethelAPIClient.createCopilotWorkflow({
              title: `Workflow ${new Date().toLocaleString()}`,
              chatThreadId: threadId,
            }).catch(() => null)
            const wfId = (createdWf as any)?.workflow?.id
            if (wfId) {
              window.localStorage.setItem(keys.workflowKey, String(wfId))
              setActiveWorkflowId(String(wfId))
            }
          }
        } catch (e) {
          console.warn('Failed to create chat thread', e)
        }
      })()
    }
  }, [copilotProjectId, settings, showToastMessage])

  // Toggle favorite on session
  const toggleFavorite = (sessionId: string) => {
    setSessionHistory(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, favorite: !Boolean(session.favorite) }
          : session
      )
    );
  };

  // Toggle scheduled on session
  const toggleScheduled = (sessionId: string) => {
    setSessionHistory(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, scheduled: !Boolean(session.scheduled) }
          : session
      )
    );
  };

  // Filtered sessions
  const filteredSessions = sessionHistory.filter(session => {
    switch (sessionFilter) {
      case 'favorites': return Boolean(session.favorite);
      case 'scheduled': return Boolean(session.scheduled);
      default: return true;
    }
  });

  // Function to save current session
  const saveCurrentSession = useCallback(() => {
    setSessionHistory(prev => {
      const currentSession: SessionEntry = {
        id: Date.now().toString(),
        name: `Session ${prev.length + 1}`,
        timestamp: Date.now(),
        chatHistory: [...chatHistory],
        livePreviewSuggestions: [...livePreviewSuggestions],
        favorite: false,
        scheduled: false,
        settings: { ...settings },
      }
      return [currentSession, ...prev.slice(0, 9)]
    })
  }, [chatHistory, livePreviewSuggestions, settings])

  const clearDashboardState = useCallback(() => {
    clearStoredDashboardState()
    setSessionHistory([])
    setSessionFilter('all')
    setChatHistory([])
    setChatMessage('')
    setLivePreviewSuggestions([])
    setActiveTab('overview')
    setSettings({ ...DEFAULT_SETTINGS })
    showToastMessage('Preferências do painel redefinidas.', 'success')
  }, [showToastMessage])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for new task
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        createNewSession();
      }

      // Ctrl+S for save current session
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveCurrentSession();
        showToastMessage('Session saved!', 'success');
      }

      // Escape to close sidebar on mobile
      if (event.key === 'Escape' && sidebarOpen && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [createNewSession, saveCurrentSession, showToastMessage, sidebarOpen]);

  // Simulate download functionality
  const handleDownload = async (platform: 'windows' | 'mac' | 'linux') => {
    showToastMessage(`Preparing ${platform} installer...`, 'info');

    // Simulate download preparation
    setTimeout(() => {
      showToastMessage(`${platform} installer ready! Download starting...`, 'success');

      // In a real implementation, this would trigger actual download
      // For now, we'll simulate the download process
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = '#'; // Would be actual download URL
        link.download = `aethel-ide-${platform}-v2.1.0${platform === 'windows' ? '.exe' : platform === 'mac' ? '.dmg' : '.tar.gz'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToastMessage(`Download completed! Aethel IDE for ${platform} is ready to install.`, 'success');
      }, 2000);
    }, 1500);
  };

  // Mobile responsiveness improvements
  useEffect(() => {
    const handleResize = () => {
      // Auto-close sidebar on mobile when switching to small screens
      if (window.innerWidth < 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Function to load a session
  const loadSession = (sessionId: string) => {
    const session = sessionHistory.find(s => s.id === sessionId)
    if (session) {
      setChatHistory(session.chatHistory)
      if (session.settings) setSettings(session.settings)
      // Load other states as needed
    }
  }

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return

    setAiActivity('Sending message to AI...')
    const userMessage: ChatMessage = { role: 'user', content: chatMessage }
    setChatHistory(prev => [...prev, userMessage])
    const currentMessage = chatMessage
    setChatMessage('')

    // Persistência: salva mensagem do usuário na thread ativa.
    const threadId = activeChatThreadId
    if (threadId) {
      void AethelAPIClient.appendChatMessage(threadId, { role: 'user', content: userMessage.content, model: 'openai:gpt-4' })
        .then(async () => {
          // Se for o primeiro input da thread, tenta melhorar o título.
          if (chatHistory.length === 0) {
            const title = `Chat: ${String(userMessage.content).slice(0, 60)}`
            await AethelAPIClient.updateChatThread(threadId, { title }).catch(() => null)
          }
        })
        .catch(() => null)
    }

    // Add streaming AI response placeholder
    const aiMessageId = Date.now().toString()
    const aiMessage: ChatMessage = { role: 'assistant', content: '' }
    setChatHistory(prev => [...prev, aiMessage])

    try {
      setAiActivity('AI is thinking...')
      const messages: ChatMessage[] = [...chatHistory, userMessage].map(m => ({
        role: (m.role as ChatMessage['role']) || 'user',
        content: m.content
      }))

      let accumulatedContent = ''
      for await (const chunk of AethelAPIClient.chatStream({ model: 'openai:gpt-4', messages })) {
        accumulatedContent += chunk
        setChatHistory(prev =>
          prev.map(msg => (msg === aiMessage ? { ...msg, content: accumulatedContent } : msg))
        )
      }

      // Persistência: salva mensagem final do assistente.
      if (threadId) {
        void AethelAPIClient.appendChatMessage(threadId, { role: 'assistant', content: accumulatedContent, model: 'openai:gpt-4' }).catch(() => null)
      }

      setAiActivity('AI responded')
      showToastMessage('AI response received!', 'success');

      // Add to session history with enhanced metadata
      setSessionHistory(prev => [{
        id: aiMessageId,
        name: `Chat: ${currentMessage.slice(0, 30)}...`,
        timestamp: Date.now(),
        chatHistory: [...chatHistory, userMessage, { ...aiMessage, content: accumulatedContent }],
        livePreviewSuggestions: livePreviewSuggestions,
        favorite: false,
        scheduled: false
      }, ...prev.slice(0, 9)])

    } catch (error) {
      console.error('Error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Failed to connect to backend. Please check if the server is running.'
      }
      setChatHistory(prev =>
        prev.map(msg =>
          msg === aiMessage ? errorMessage : msg
        )
      )
      setAiActivity('Connection failed')
      showToastMessage('Failed to connect to AI backend', 'error');
    }
  }

  const createProject = () => {
    if (!newProjectName.trim()) return
    const newProject = {
      id: projects.length + 1,
      name: newProjectName,
      type: newProjectType,
      status: 'active'
    }
    setProjects(prev => [...prev, newProject])
    setNewProjectName('')
    setNewProjectType('code')
  }

  const deleteProject = (id: number) => {
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const handleMagicWandSelect = async (position: THREE.Vector3) => {
    setAiActivity('Analyzing selected area...')
    setIsGenerating(true)

    try {
      // Atualiza contexto do Copilot (snapshot mínimo do Live Preview).
      // MVP: em memória no server; sem isso a IA perde precisão.
      await fetch('/api/copilot/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: activeWorkflowId,
          livePreview: {
            selectedPoint: { x: position.x, y: position.y, z: position.z },
          },
        }),
      })
    } catch (e) {
      // Não bloqueia o fluxo de sugestão; apenas mantém real-or-fail.
      console.warn('Failed to update copilot context', e)
    }

    const prompt =
      `Live Preview context:\n` +
      `Selected point: x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}\n\n` +
      `Task: Suggest ONE concrete improvement for the scene at that point. ` +
      `Return a single short sentence. No markdown. No bullet lists.`

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content:
            'You are Aethel Copilot for Live Preview. Be precise, minimal, and avoid guessing. If you lack info, ask one question.',
        },
        { role: 'user', content: prompt },
      ]

      const data = await AethelAPIClient.chat({ model: 'openai:gpt-4', messages })
      const content =
        data?.choices?.[0]?.message?.content ||
        data?.message?.content ||
        ''

      const suggestion = String(content).trim()
      if (!suggestion) {
        setAiActivity('No suggestion returned')
        showToastMessage('AI não retornou sugestão para a área selecionada.', 'info')
        return
      }

      setLivePreviewSuggestions(prev => [...prev, suggestion])
      setAiActivity('Generated suggestion for selected area')
    } catch (error) {
      console.error('Error generating live preview suggestion:', error)
      setAiActivity('Suggestion unavailable')
      showToastMessage('Sugestão indisponível (IA não configurada ou sem créditos).', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendSuggestion = async (suggestion: string) => {
    setAiActivity('Processing user suggestion...')
    setIsGenerating(true)
    // Add to chat history and send to AI
    const userMessage: ChatMessage = { role: 'user', content: `Live Preview Suggestion: ${suggestion}` }
    setChatHistory(prev => [...prev, userMessage])

    try {
      const messages: ChatMessage[] = [...chatHistory, userMessage].map(m => ({
        role: (m.role as ChatMessage['role']) || 'user',
        content: m.content
      }))
      const data = await AethelAPIClient.chat({ model: 'openai:gpt-4', messages })
      if (data?.choices?.[0]?.message) {
        const aiMessage = { role: data.choices[0].message.role, content: data.choices[0].message.content }
        setChatHistory(prev => [...prev, aiMessage])
        setAiActivity('Applied suggestion to live preview')
      }
    } catch (error) {
      console.error('Error sending suggestion:', error)
      setAiActivity('Error processing suggestion')
    }
    setIsGenerating(false)
  }

  const handleAcceptSuggestion = (suggestion: string) => {
    handleSendSuggestion(`Accept and apply: ${suggestion}`)
  }

  const walletTransactions = useMemo(() => walletData?.transactions ?? [], [walletData?.transactions])
  const connectivityServices = useMemo(() => connectivityData?.services ?? [], [connectivityData?.services])
  const lastWalletUpdate = walletTransactions.length > 0 ? walletTransactions[walletTransactions.length - 1].created_at : null

  const creditEntries = useMemo(() => walletTransactions.filter(entry => entry.entry_type === 'credit'), [walletTransactions])

  const {
    creditsUsedToday,
    creditsUsedThisMonth,
    creditsReceivedThisMonth,
  } = useMemo(() => {
    if (walletTransactions.length === 0) {
      return {
        creditsUsedToday: 0,
        creditsUsedThisMonth: 0,
        creditsReceivedThisMonth: 0,
      }
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let usedToday = 0
    let usedMonth = 0
    let receivedMonth = 0

    for (const entry of walletTransactions) {
      const createdAt = new Date(entry.created_at)

      if (entry.entry_type === 'credit') {
        if (createdAt >= startOfMonth) {
          receivedMonth += entry.amount
        }
        continue
      }

      if (createdAt >= startOfToday) {
        usedToday += entry.amount
      }

      if (createdAt >= startOfMonth) {
        usedMonth += entry.amount
      }
    }

    return {
      creditsUsedToday: usedToday,
      creditsUsedThisMonth: usedMonth,
      creditsReceivedThisMonth: receivedMonth,
    }
  }, [walletTransactions])

  const receivableSummary = useMemo(() => {
    if (creditEntries.length === 0) {
      return {
        total: 0,
        pending: 0,
        recent: [] as typeof creditEntries,
      }
    }

    let pending = 0
    for (const entry of creditEntries) {
      const rawStatus = entry.metadata?.['status'] as unknown
      const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : ''
      const rawSettled = entry.metadata?.['settled'] as unknown
      const settledFlag = typeof rawSettled === 'boolean' ? rawSettled : undefined
      if (status === 'pending' || status === 'awaiting_settlement' || settledFlag === false) {
        pending += entry.amount
      }
    }

    const recent = creditEntries
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    const total = creditEntries.reduce((sum, entry) => sum + entry.amount, 0)

    return {
      total,
      pending,
      recent,
    }
  }, [creditEntries])

  const refreshWallet = async () => {
    if (walletKey) {
      await mutate(walletKey)
    }
  }

  const refreshConnectivity = async () => {
    await mutate('connectivity::status')
  }

  const handlePurchaseIntentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasToken) {
      setWalletActionError('Faça login para criar intents.')
      return
    }
    const amountInt = Number.parseInt(purchaseForm.amount, 10)
    if (!Number.isFinite(amountInt) || amountInt <= 0) {
      setWalletActionError('Informe um valor de créditos válido.')
      return
    }
    setWalletSubmitting(true)
    setWalletActionMessage(null)
    setWalletActionError(null)
    try {
      const intent = await AethelAPIClient.createPurchaseIntent({
        amount: amountInt,
        currency: purchaseForm.currency || 'credits',
        reference: purchaseForm.reference || undefined,
      })
      setLastPurchaseIntent(intent)
      setWalletActionMessage(
        `Intenção ${intent.intent_id} confirmada: +${intent.entry.amount.toLocaleString()} ${intent.entry.currency}.`,
      )
      setPurchaseForm(prev => ({ ...prev, amount: '', reference: '' }))
      await refreshWallet()
      if (creditsKey) {
        await mutate(creditsKey)
      }
    } catch (error) {
      if (error instanceof APIError) {
        setWalletActionError(`Falha ao criar intenção (${error.status}): ${error.statusText}`)
      } else {
        setWalletActionError('Não foi possível registrar a intenção de compra.')
      }
    } finally {
      setWalletSubmitting(false)
    }
  }

  const handleTransferSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasToken) {
      setWalletActionError('Faça login para transferir créditos.')
      return
    }
    const amountInt = Number.parseInt(transferForm.amount, 10)
    const target = transferForm.targetUserId.trim()
    if (!Number.isFinite(amountInt) || amountInt <= 0 || !target) {
      setWalletActionError('Informe destinatário (userId/email) e valor válidos.')
      return
    }
    setWalletSubmitting(true)
    setWalletActionMessage(null)
    setWalletActionError(null)
    try {
      const receipt = await AethelAPIClient.transferCredits({
        target_user_id: target,
        amount: amountInt,
        currency: transferForm.currency || 'credits',
        reference: transferForm.reference || undefined,
      })
      setLastTransferReceipt(receipt)
      setWalletActionMessage(
        `Transferência ${receipt.transfer_id} concluída: -${receipt.sender_entry.amount.toLocaleString()} ${receipt.sender_entry.currency}.`,
      )
      setTransferForm(prev => ({ ...prev, amount: '', reference: '' }))
      await refreshWallet()
      if (creditsKey) {
        await mutate(creditsKey)
      }
    } catch (error) {
      if (error instanceof APIError) {
        setWalletActionError(
          error.status === 400
            ? 'Saldo insuficiente ou dados inválidos.'
            : `Falha ao transferir (${error.status}): ${error.statusText}`,
        )
      } else {
        setWalletActionError('Não foi possível concluir a transferência.')
      }
    } finally {
      setWalletSubmitting(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!hasToken) {
      setSubscribeError('Faça login para alterar o plano.')
      return
    }

    setSubscribeMessage(null)
    setSubscribeError(null)
    setSubscribingPlan(planId)
    try {
      const response = await AethelAPIClient.subscribe(planId)
      setSubscribeMessage(`Plano atualizado: ${response.status}.`)

      if (response.checkoutUrl) {
        window.location.assign(response.checkoutUrl)
        return
      }
      if (currentPlanKey) {
        await mutate(currentPlanKey)
      }
      if (creditsKey) {
        await mutate(creditsKey)
      }
      await refreshWallet()
    } catch (error) {
      if (error instanceof APIError) {
        setSubscribeError(`Não foi possível alterar o plano (${error.status}).`)
      } else {
        setSubscribeError('Falha ao comunicar com o serviço de billing.')
      }
    } finally {
      setSubscribingPlan(null)
    }
  }

  return (
    <div className="min-h-screen aethel-container">
      {/* Trial Banner */}
      {isTrialActive && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Free Trial: {trialDaysLeft} days remaining - Upgrade to Pro for unlimited access</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-white underline text-xs hover:text-gray-200">Upgrade Now</button>
            <button
              onClick={() => setIsTrialActive(false)}
              className="text-white hover:text-gray-200 ml-2"
              aria-label="Dismiss trial banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="aethel-card aethel-m-4 aethel-rounded-xl aethel-shadow-lg">
        <div className="aethel-flex aethel-items-center aethel-justify-between aethel-p-4">
      <div className="aethel-flex aethel-items-center aethel-gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden aethel-button aethel-button-ghost aethel-p-2"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="aethel-flex aethel-items-center aethel-gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
                Aethel IDE
              </h1>
            </div>
          </div>
          <div className="aethel-flex aethel-items-center aethel-gap-4">
            <button
              onClick={clearDashboardState}
              className="aethel-button aethel-button-ghost aethel-text-xs"
            >
              Redefinir painel
            </button>
            <button
              onClick={toggleTheme}
              className="aethel-button aethel-button-ghost aethel-p-2"
              aria-label="Toggle theme"
            >
              {settings.theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className={`aethel-flex aethel-items-center aethel-gap-2 aethel-px-3 aethel-py-1 aethel-rounded-full text-sm font-medium ${
              healthData
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              <div className={`w-2 h-2 aethel-rounded-full ${healthData ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
              Backend: {healthData ? 'Online' : 'Offline'}
            </div>
            {authError && (
              <span className="text-xs aethel-text-red-400" title={String(authError)}>
                Auth providers indisponíveis
              </span>
            )}
            {billingError && (
              <span className="text-xs aethel-text-yellow-400" title={String(billingError)}>
                Planos indisponíveis
              </span>
            )}
            <button className="aethel-button aethel-button-primary aethel-shadow-md hover:aethel-shadow-lg aethel-transition">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Launch Desktop IDE
            </button>
          </div>
        </div>
      </header>

      <div className="aethel-flex aethel-gap-0">
        {/* Sidebar */}
        <nav className={`aethel-sidebar fixed md:relative z-50 h-full md:h-auto transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <div className="aethel-sidebar-header">
            <div className="aethel-flex aethel-items-center aethel-gap-3">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-pink-500 rounded aethel-flex aethel-items-center aethel-justify-center">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="font-semibold text-sm">Navigation</span>
            </div>
          </div>

          {/* New Task Button - Inspired by Manus */}
          <div className="px-3 py-3">
            <button
              onClick={createNewSession}
              className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors active:opacity-80 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 h-9 px-3 rounded-lg gap-2 text-sm min-w-9 w-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Task</span>
              <div className="flex items-center gap-0.5 ml-auto">
                <span className="flex text-slate-300 justify-center items-center min-w-4 h-4 px-1 rounded text-xs font-normal">Ctrl</span>
                <span className="flex justify-center items-center w-4 h-4 px-1 rounded text-xs font-normal text-slate-300">K</span>
              </div>
            </button>
          </div>

          {/* Session Filters - Inspired by Manus */}
          <div className="px-3 pb-3">
            <div className="flex gap-1">
              <button
                onClick={() => setSessionFilter('all')}
                className={`flex justify-center items-center clickable rounded-full px-3 py-1.5 border-none outline-offset-0 outline-slate-600 text-xs leading-4 ${
                  sessionFilter === 'all'
                    ? 'bg-indigo-600 text-white outline-none outline-0'
                    : 'border border-slate-600 text-slate-400 hover:bg-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSessionFilter('favorites')}
                className={`flex justify-center items-center clickable rounded-full px-3 py-1.5 border-none outline-offset-0 outline-slate-600 text-xs leading-4 ${
                  sessionFilter === 'favorites'
                    ? 'bg-indigo-600 text-white outline-none outline-0'
                    : 'border border-slate-600 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Favorites
              </button>
              <button
                onClick={() => setSessionFilter('scheduled')}
                className={`flex justify-center items-center clickable rounded-full px-3 py-1.5 border-none outline-offset-0 outline-slate-600 text-xs leading-4 ${
                  sessionFilter === 'scheduled'
                    ? 'bg-indigo-600 text-white outline-none outline-0'
                    : 'border border-slate-600 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Scheduled
              </button>
            </div>
          </div>

          <div className="aethel-sidebar-nav aethel-space-y-1">
            <button
              onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Overview
            </button>

            <button
              onClick={() => { setActiveTab('projects'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'projects' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0" />
              </svg>
              Projects
            </button>

            <button
              onClick={() => { setActiveTab('ai-chat'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'ai-chat' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              AI Chat
            </button>

            <button
              onClick={() => { setActiveTab('agent-canvas'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'agent-canvas' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Agent Canvas
            </button>

            <button
              onClick={() => { setActiveTab('content-creation'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'content-creation' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l2 2-2 2" />
              </svg>
              Content Creation
            </button>

            <button
              onClick={() => { setActiveTab('unreal'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'unreal' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Unreal Engine
            </button>

            <button
              onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'wallet' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a1 1 0 110 2 1 1 0 010-2z" />
              </svg>
              Wallet
            </button>

            <button
              onClick={() => { setActiveTab('billing'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'billing' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Billing
            </button>

            <button
              onClick={() => { setActiveTab('connectivity'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'connectivity' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.866 0-7 3.134-7 7m7-11c5.523 0 10 4.477 10 10m-5 0a5 5 0 00-10 0" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19h.01" />
              </svg>
              Connectivity
            </button>

            <button
              onClick={() => { setActiveTab('templates'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'templates' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Templates
            </button>

            <button
              onClick={() => { setActiveTab('use-cases'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'use-cases' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Use Cases
            </button>

            <button
              onClick={() => { setActiveTab('download'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'download' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download IDE
            </button>

            <button
              onClick={() => { setActiveTab('admin'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'admin' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin Panel
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="aethel-flex-1 aethel-min-h-screen aethel-bg-slate-900 aethel-text-slate-100">
          {/* Content based on active tab */}
          {activeTab === 'overview' && (
            <div className="aethel-p-6 aethel-space-y-6">
              {/* Status Cards */}
              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">AI Activity</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-indigo-400">{aiActivity}</p>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Active Projects</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-green-400">{projects.filter(p => p.status === 'active').length}</p>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Live Preview</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-purple-400">{livePreviewSuggestions.length} suggestions</p>
                </div>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <div className="aethel-flex aethel-items-center aethel-justify-between">
                    <h3 className="aethel-text-lg aethel-font-semibold">Wallet Balance</h3>
                    {authReady && hasToken && (
                      <button
                        onClick={refreshWallet}
                        className="aethel-text-xs aethel-border aethel-border-slate-700 aethel-rounded aethel-px-2 aethel-py-1 hover:aethel-border-slate-500"
                      >
                        Atualizar
                      </button>
                    )}
                    {lastWalletUpdate && (
                      <span className="aethel-text-xs aethel-text-slate-400">
                        Atualizado • {new Date(lastWalletUpdate).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="aethel-mt-4">
                    {!authReady && <p className="aethel-text-sm aethel-text-slate-400">Verificando sessão...</p>}
                    {authReady && !hasToken && (
                      <p className="aethel-text-sm aethel-text-slate-400">Faça login para visualizar seu saldo.</p>
                    )}
                    {authReady && hasToken && walletLoading && (
                      <p className="aethel-text-sm aethel-text-slate-400">Carregando carteira...</p>
                    )}
                    {authReady && hasToken && walletError && (
                      <p className="aethel-text-sm aethel-text-red-400">
                        {walletError instanceof APIError && walletError.status === 401
                          ? 'Sessão expirada. Entre novamente.'
                          : 'Não foi possível carregar os dados da carteira.'}
                      </p>
                    )}
                    {authReady && hasToken && !walletLoading && !walletError && walletData && (
                      <>
                        <p className="aethel-text-3xl aethel-font-bold aethel-text-slate-100">
                          {walletData.balance.toLocaleString()} {walletData.currency}
                        </p>
                        <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-1">
                          {walletTransactions.length} transações registradas
                        </p>
                        <ul className="aethel-mt-4 aethel-space-y-3">
                          {walletTransactions.slice(-3).reverse().map(entry => (
                            <li key={entry.id} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                              <div className="aethel-flex aethel-justify-between aethel-items-center">
                                <span className="aethel-text-sm aethel-font-medium">
                                  {entry.reference || entry.entry_type.toUpperCase()}
                                </span>
                                <span className={`aethel-text-sm aethel-font-semibold ${entry.entry_type === 'credit' ? 'aethel-text-emerald-400' : 'aethel-text-red-400'}`}>
                                  {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {entry.currency}
                                </span>
                              </div>
                              <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                                <span className="aethel-text-xs aethel-text-slate-400">
                                  Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {entry.currency}
                                </span>
                                <span className="aethel-text-xs aethel-text-slate-500">
                                  {new Date(entry.created_at).toLocaleString()}
                                </span>
                              </div>
                            </li>
                          ))}
                          {walletTransactions.length === 0 && (
                            <li className="aethel-text-sm aethel-text-slate-400">Nenhuma transação registrada.</li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-flex aethel-justify-between aethel-items-center">
                    <h3 className="aethel-text-lg aethel-font-semibold">Connectivity Status</h3>
                    {connectivityData && (
                      <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 aethel-border ${
                        connectivityData.overall_status === 'healthy'
                          ? 'aethel-border-emerald-500/30 aethel-bg-emerald-500/20 aethel-text-emerald-300'
                          : connectivityData.overall_status === 'degraded'
                          ? 'aethel-border-amber-500/30 aethel-bg-amber-500/20 aethel-text-amber-300'
                          : 'aethel-border-red-500/30 aethel-bg-red-500/20 aethel-text-red-300'
                      }`}>
                        {(connectivityData.overall_status ?? 'unknown').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="aethel-mt-4">
                    {connectivityLoading && (
                      <p className="aethel-text-sm aethel-text-slate-400">Monitorando serviços...</p>
                    )}
                    {connectivityError && (
                      <p className="aethel-text-sm aethel-text-red-400">Falha ao consultar conectividade.</p>
                    )}
                    {!connectivityLoading && !connectivityError && connectivityServices.length === 0 && (
                      <p className="aethel-text-sm aethel-text-slate-400">Nenhum serviço configurado.</p>
                    )}
                    {!connectivityLoading && !connectivityError && connectivityServices.length > 0 && (
                      <div className="aethel-space-y-3">
                        {connectivityServices.map(service => (
                          <div key={service.name} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                            <div className="aethel-flex aethel-justify-between aethel-items-center">
                              <span className="aethel-text-sm aethel-font-medium aethel-capitalize">{service.name.replace(/_/g, ' ')}</span>
                              <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 ${
                                service.status === 'healthy'
                                  ? 'aethel-bg-emerald-500/20 aethel-text-emerald-300'
                                  : service.status === 'degraded'
                                  ? 'aethel-bg-amber-500/20 aethel-text-amber-300'
                                  : 'aethel-bg-red-500/20 aethel-text-red-300'
                              }`}>
                                {service.status.toUpperCase()}
                              </span>
                            </div>
                            <ul className="aethel-mt-2 aethel-space-y-1">
                              {service.endpoints.slice(0, 3).map(endpoint => (
                                <li key={`${service.name}-${endpoint.url}`} className="aethel-flex aethel-justify-between aethel-text-xs">
                                  <span className={`${endpoint.healthy ? 'aethel-text-emerald-300' : 'aethel-text-red-300'}`}>
                                    {endpoint.url}
                                  </span>
                                  <span className="aethel-text-slate-400">
                                    {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)}ms` : '—'}
                                  </span>
                                </li>
                              ))}
                              {service.endpoints.length > 3 && (
                                <li className="aethel-text-xs aethel-text-slate-500">
                                  +{service.endpoints.length - 3} endpoints adicionais
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="aethel-card aethel-p-6">
                <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                  <h3 className="aethel-text-xl aethel-font-semibold">Live Preview</h3>
                  <button
                    onClick={() => setMiniPreviewExpanded(!miniPreviewExpanded)}
                    className="aethel-button aethel-button-ghost aethel-text-sm"
                  >
                    {miniPreviewExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                <LivePreview
                  onMagicWandSelect={handleMagicWandSelect}
                  suggestions={livePreviewSuggestions}
                  onSendSuggestion={handleSendSuggestion}
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Projects</h2>
              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6 aethel-mb-6">
                {projects.map(project => (
                  <div key={project.id} className="aethel-card aethel-p-4">
                    <h3 className="aethel-font-semibold aethel-mb-2">{project.name}</h3>
                    <p className="aethel-text-sm aethel-text-slate-400 aethel-mb-2">Type: {project.type}</p>
                    <p className="aethel-text-sm aethel-mb-4">Status: <span className={`aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs ${project.status === 'active' ? 'aethel-bg-green-500/20 aethel-text-green-400' : 'aethel-bg-gray-500/20 aethel-text-gray-400'}`}>{project.status}</span></p>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="aethel-button aethel-button-danger aethel-text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <div className="aethel-card aethel-p-6 aethel-max-w-md">
                <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Create New Project</h3>
                <div className="aethel-space-y-4">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="aethel-input aethel-w-full"
                  />
                  <select
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value)}
                    className="aethel-input aethel-w-full"
                  >
                    <option value="code">Code Project</option>
                    <option value="unreal">Unreal Engine</option>
                    <option value="web">Web Application</option>
                  </select>
                  <button
                    onClick={createProject}
                    className="aethel-button aethel-button-primary aethel-w-full"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
                <h2 className="aethel-text-2xl aethel-font-bold">AI Chat</h2>
                <div className="aethel-flex aethel-gap-2">
                  <button
                    onClick={() => setChatMode('chat')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'chat' ? 'aethel-bg-indigo-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setChatMode('agent')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'agent' ? 'aethel-bg-indigo-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Modo agente
                  </button>
                  <button
                    onClick={() => setChatMode('canvas')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'canvas' ? 'aethel-bg-indigo-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Canvas
                  </button>
                </div>
              </div>

              <div className="aethel-flex aethel-items-center aethel-gap-2 aethel-mb-4">
                <span className="aethel-text-sm aethel-text-slate-400">Trabalho</span>
                <select
                  value={activeWorkflowId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '__new__') {
                      void createCopilotWorkflow()
                      return
                    }
                    if (v) void switchCopilotWorkflow(v)
                  }}
                  className="aethel-input"
                  disabled={copilotWorkflowsLoading || connectBusy}
                >
                  {copilotWorkflows.map((wf) => (
                    <option key={String(wf.id)} value={String(wf.id)}>
                      {wf.title || 'Workflow'}
                    </option>
                  ))}
                  <option value="__new__">+ Novo trabalho</option>
                </select>

                <button
                  onClick={() => void renameCopilotWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId}
                >
                  Renomear
                </button>
                <button
                  onClick={() => void archiveCopilotWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId}
                >
                  Arquivar
                </button>

                <select
                  value={connectFromWorkflowId}
                  onChange={(e) => setConnectFromWorkflowId(e.target.value)}
                  className="aethel-input"
                  disabled={copilotWorkflowsLoading || connectBusy}
                >
                  <option value="">Conectar…</option>
                  {copilotWorkflows
                    .filter((w) => String(w.id) !== String(activeWorkflowId))
                    .map((wf) => (
                      <option key={String(wf.id)} value={String(wf.id)}>
                        {wf.title || 'Workflow'}
                      </option>
                    ))}
                </select>

                <button
                  onClick={() => void copyHistoryFromWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
                  title="Copia o histórico do trabalho selecionado para o trabalho atual (clona a thread)"
                >
                  {connectBusy ? 'Processando…' : 'Copiar histórico'}
                </button>

                <button
                  onClick={() => void importContextFromWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
                  title="Importa contexto (livePreview/editor/openFiles) do trabalho selecionado"
                >
                  {connectBusy ? 'Processando…' : 'Importar contexto'}
                </button>

                <button
                  onClick={() => void mergeFromWorkflow()}
                  className="aethel-button aethel-button-secondary"
                  disabled={!activeWorkflowId || !connectFromWorkflowId || connectBusy}
                  title="Mescla histórico + contexto do trabalho selecionado e arquiva o trabalho de origem"
                >
                  {connectBusy ? 'Processando…' : 'Mesclar'}
                </button>
              </div>

              {chatMode === 'chat' && (
                <div className="aethel-card aethel-p-6 aethel-max-w-4xl aethel-mx-auto">
                  <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
                    Standard conversational AI chat with Aethel&apos;s advanced agents.
                  </div>
                  <div className="aethel-space-y-4 aethel-mb-4 aethel-max-h-96 aethel-overflow-y-auto">
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`aethel-p-3 aethel-rounded-lg ${msg.role === 'user' ? 'aethel-bg-indigo-500/20 aethel-ml-12' : 'aethel-bg-slate-700/50 aethel-mr-12'}`}>
                        <p className="aethel-text-sm aethel-font-medium aethel-mb-1">{msg.role === 'user' ? 'You' : 'AI'}</p>
                        <p className="aethel-text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="aethel-flex aethel-gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type your message..."
                      className="aethel-input aethel-flex-1"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="aethel-button aethel-button-primary"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              {chatMode === 'agent' && (
                <div className="aethel-card aethel-p-6 aethel-max-w-4xl aethel-mx-auto">
                  <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
                    Autonomous agent mode - Inspired by Manus platform. The AI will execute tasks step-by-step and provide results.
                  </div>
                  <div className="aethel-space-y-4 aethel-mb-4">
                    <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-4">
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Research & Analysis</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Gather information, analyze data, and provide insights</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Content Creation</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Generate articles, code, documentation, and creative content</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Automation</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Build workflows, scripts, and automated processes</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Problem Solving</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Debug code, optimize performance, solve complex issues</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Code Generation</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Generate, debug, and optimize code across languages</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Data Analysis</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Analyze datasets, create visualizations, and extract insights</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Creative Design</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Design UI/UX, graphics, and creative concepts</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Business Strategy</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Strategic planning, market analysis, and business development</p>
                      </button>
                    </div>
                  </div>
                  <div className="aethel-flex aethel-gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Describe the task for the agent..."
                      className="aethel-input aethel-flex-1"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="aethel-button aethel-button-primary"
                    >
                      Executar
                    </button>
                  </div>
                </div>
              )}

              {chatMode === 'canvas' && (
                <div className="aethel-card aethel-p-6 aethel-max-w-6xl aethel-mx-auto">
                  <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
                    Visual canvas for collaborative AI work. Draw, sketch ideas, and collaborate with AI in real-time.
                  </div>
                  <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-4 aethel-min-h-96 aethel-border aethel-border-slate-700 aethel-relative">
                    <div className="aethel-absolute aethel-top-4 aethel-left-4 aethel-flex aethel-gap-2">
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Draw</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Shapes</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Text</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">AI Enhance</button>
                    </div>
                    <div className="aethel-text-center aethel-text-slate-500 aethel-py-32">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">Interactive Canvas</p>
                      <p className="text-sm">Coming soon with full drawing and collaboration features</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'content-creation' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Content Creation</h2>
              <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">AI-Powered Content</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">Generate code, documentation, and creative content with AI assistance.</p>
                  <button className="aethel-button aethel-button-primary">Start Creating</button>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Templates</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">Use pre-built templates for common development tasks.</p>
                  <button className="aethel-button aethel-button-secondary">Browse Templates</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'unreal' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Unreal Engine Integration</h2>
              <div className="aethel-card aethel-p-6">
                <p className="aethel-text-slate-400 aethel-mb-4">Seamlessly integrate with Unreal Engine for VR and game development.</p>
                <div className="aethel-flex aethel-gap-4">
                  <button className="aethel-button aethel-button-primary">Connect to Unreal</button>
                  <button className="aethel-button aethel-button-secondary">VR Preview</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <h2 className="aethel-text-2xl aethel-font-bold">Wallet</h2>
                {authReady && hasToken && (
                  <button onClick={refreshWallet} className="aethel-button aethel-button-secondary aethel-text-xs">
                    Atualizar
                  </button>
                )}
              </div>
              {!authReady && <p className="aethel-text-sm aethel-text-slate-400">Verificando autenticação...</p>}
              {authReady && !hasToken && (
                <div className="aethel-card aethel-p-6 aethel-max-w-2xl">
                  <p className="aethel-text-sm aethel-text-slate-300">
                    Para visualizar o saldo e realizar operações, faça login no portal.
                  </p>
                </div>
              )}
              {authReady && hasToken && (
                <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
                  <div className="aethel-card aethel-p-6 aethel-space-y-4">
                    <div>
                      <h3 className="aethel-text-lg aethel-font-semibold">Saldo Atual</h3>
                      {walletLoading && <p className="aethel-text-sm aethel-text-slate-400">Carregando carteira...</p>}
                      {walletError && (
                        <p className="aethel-text-sm aethel-text-red-400">
                          Falha ao carregar os dados. Tente novamente.
                        </p>
                      )}
                      {!walletLoading && !walletError && walletData && (
                        <>
                          <div className="aethel-text-4xl aethel-font-bold aethel-text-slate-100">
                            {walletData.balance.toLocaleString()} {walletData.currency}
                          </div>
                          {creditsInfo && (
                            <p className="aethel-text-xs aethel-text-slate-400">
                              Créditos faturáveis: {creditsInfo.credits.toLocaleString()} {walletData.currency}
                            </p>
                          )}
                          <p className="aethel-text-xs aethel-text-slate-500">
                            {walletTransactions.length} transações
                          </p>
                          {lastWalletUpdate && (
                            <p className="aethel-text-xs aethel-text-slate-500">
                              Atualizado em {new Date(lastWalletUpdate).toLocaleString()}
                            </p>
                          )}
                          <div className="aethel-grid aethel-grid-cols-1 sm:aethel-grid-cols-3 aethel-gap-3 aethel-mt-4">
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Gasto hoje</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-rose-300">
                                {creditsUsedToday.toLocaleString()} {walletData.currency}
                              </p>
                            </div>
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Gasto no mês</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                                {creditsUsedThisMonth.toLocaleString()} {walletData.currency}
                              </p>
                            </div>
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Recebido no mês</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                                {creditsReceivedThisMonth.toLocaleString()} {walletData.currency}
                              </p>
                            </div>
                          </div>
                          {lastPurchaseIntent && (
                            <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-2">
                              Última intenção #{lastPurchaseIntent.intent_id} • +
                              {lastPurchaseIntent.entry.amount.toLocaleString()} {lastPurchaseIntent.entry.currency}{' '}
                              em {new Date(lastPurchaseIntent.entry.created_at).toLocaleString()}
                            </p>
                          )}
                          {lastTransferReceipt && (
                            <p className="aethel-text-xs aethel-text-slate-400">
                              Última transferência #{lastTransferReceipt.transfer_id} • -
                              {lastTransferReceipt.sender_entry.amount.toLocaleString()} {lastTransferReceipt.sender_entry.currency}{' '}
                              em {new Date(lastTransferReceipt.sender_entry.created_at).toLocaleString()}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {(walletActionMessage || walletActionError) && (
                      <div className={`aethel-text-sm ${walletActionError ? 'aethel-text-red-400' : 'aethel-text-emerald-400'}`}>
                        {walletActionError || walletActionMessage}
                      </div>
                    )}
                    <form className="aethel-space-y-3" onSubmit={handlePurchaseIntentSubmit}>
                      <h4 className="aethel-text-sm aethel-font-semibold">Adicionar Créditos</h4>
                      <div className="aethel-flex aethel-gap-2">
                        <input
                          type="number"
                          min={1}
                          value={purchaseForm.amount}
                          onChange={(e) => setPurchaseForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="aethel-input"
                          placeholder="Quantidade"
                          required
                        />
                        <select
                          value={purchaseForm.currency}
                          onChange={(e) => setPurchaseForm(prev => ({ ...prev, currency: e.target.value }))}
                          className="aethel-input aethel-w-32"
                        >
                          <option value="credits">Credits</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={purchaseForm.reference}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, reference: e.target.value }))}
                        className="aethel-input"
                        placeholder="Referência (opcional)"
                      />
                      <button
                        type="submit"
                        className="aethel-button aethel-button-primary"
                        disabled={walletSubmitting}
                      >
                        {walletSubmitting ? 'Processando...' : 'Confirmar Intenção'}
                      </button>
                    </form>
                  </div>

                  <div className="aethel-card aethel-p-6 aethel-space-y-4">
                    <form className="aethel-space-y-3" onSubmit={handleTransferSubmit}>
                      <h3 className="aethel-text-lg aethel-font-semibold">Transferir Créditos</h3>
                      <input
                        type="text"
                        value={transferForm.targetUserId}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                        className="aethel-input"
                        placeholder="User ID ou email do destinatário"
                        required
                      />
                      <div className="aethel-flex aethel-gap-2">
                        <input
                          type="number"
                          min={1}
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="aethel-input"
                          placeholder="Quantidade"
                          required
                        />
                        <select
                          value={transferForm.currency}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, currency: e.target.value }))}
                          className="aethel-input aethel-w-32"
                        >
                          <option value="credits">Credits</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={transferForm.reference}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, reference: e.target.value }))}
                        className="aethel-input"
                        placeholder="Referência (opcional)"
                      />
                      <button
                        type="submit"
                        className="aethel-button aethel-button-secondary"
                        disabled={walletSubmitting}
                      >
                        {walletSubmitting ? 'Processando...' : 'Transferir'}
                      </button>
                    </form>

                    <div>
                      <h4 className="aethel-text-sm aethel-font-semibold aethel-mb-2">Histórico Recente</h4>
                      <div className="aethel-space-y-2 aethel-max-h-64 aethel-overflow-y-auto">
                        {walletTransactions.length === 0 && (
                          <p className="aethel-text-sm aethel-text-slate-500">Nenhuma transação registrada.</p>
                        )}
                        {walletTransactions.slice().reverse().map(entry => (
                          <div key={entry.id} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                            <div className="aethel-flex aethel-justify-between aethel-items-center">
                              <span className="aethel-text-sm aethel-font-medium">
                                {entry.reference || entry.entry_type.toUpperCase()}
                              </span>
                              <span className={`aethel-text-sm aethel-font-semibold ${entry.entry_type === 'credit' ? 'aethel-text-emerald-400' : entry.entry_type === 'transfer' ? 'aethel-text-amber-300' : 'aethel-text-red-400'}`}>
                                {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {entry.currency}
                              </span>
                            </div>
                            <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                              <span className="aethel-text-xs aethel-text-slate-400">
                                Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {entry.currency}
                              </span>
                              <span className="aethel-text-xs aethel-text-slate-500">
                                {new Date(entry.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="aethel-card aethel-p-6 lg:aethel-col-span-2 aethel-space-y-4">
                    <div className="aethel-flex aethel-items-center aethel-justify-between">
                      <h3 className="aethel-text-lg aethel-font-semibold">Recebíveis</h3>
                      <span className="aethel-text-xs aethel-text-slate-500">
                        {creditEntries.length} lançamentos de entrada
                      </span>
                    </div>
                    <div className="aethel-grid aethel-grid-cols-1 sm:aethel-grid-cols-3 aethel-gap-4">
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Recebido no mês</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                          {creditsReceivedThisMonth.toLocaleString()} {walletData?.currency ?? 'credits'}
                        </p>
                      </div>
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-indigo-300">
                          {receivableSummary.total.toLocaleString()} {walletData?.currency ?? 'credits'}
                        </p>
                      </div>
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Pendente de conciliação</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                          {receivableSummary.pending.toLocaleString()} {walletData?.currency ?? 'credits'}
                        </p>
                      </div>
                    </div>
                    <div className="aethel-overflow-x-auto">
                      <table className="aethel-min-w-full aethel-text-xs aethel-text-left">
                        <thead>
                          <tr className="aethel-text-slate-400">
                            <th className="aethel-py-2 aethel-pr-4">Referência</th>
                            <th className="aethel-py-2 aethel-pr-4">Valor</th>
                            <th className="aethel-py-2 aethel-pr-4">Status</th>
                            <th className="aethel-py-2 aethel-pr-4">Saldo</th>
                            <th className="aethel-py-2">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivableSummary.recent.length === 0 && (
                            <tr>
                              <td className="aethel-py-3 aethel-text-slate-500" colSpan={5}>
                                Nenhum recebimento registrado.
                              </td>
                            </tr>
                          )}
                          {receivableSummary.recent.map(entry => {
                            const rawStatus = entry.metadata?.['status'] as unknown
                            const statusLabel = typeof rawStatus === 'string' ? rawStatus : 'confirmado'
                            const invoice = entry.metadata?.['invoice_id'] as unknown
                            const invoiceLabel = typeof invoice === 'string' ? invoice : entry.reference
                            const amountLabel = `+${entry.amount.toLocaleString()} ${entry.currency}`
                            return (
                              <tr key={entry.id} className="aethel-border-t aethel-border-slate-800">
                                <td className="aethel-py-2 aethel-pr-4 aethel-font-medium aethel-text-slate-200">
                                  {invoiceLabel || 'Recebimento'}
                                </td>
                                <td className="aethel-py-2 aethel-pr-4 aethel-text-emerald-300">
                                  {amountLabel}
                                </td>
                                <td className="aethel-py-2 aethel-pr-4 aethel-uppercase">
                                  {statusLabel}
                                </td>
                                <td className="aethel-py-2 aethel-pr-4 aethel-text-slate-400">
                                  {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {entry.currency}
                                </td>
                                <td className="aethel-py-2 aethel-text-slate-400">
                                  {new Date(entry.created_at).toLocaleString()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'connectivity' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <h2 className="aethel-text-2xl aethel-font-bold">Connectivity Monitor</h2>
                <button onClick={refreshConnectivity} className="aethel-button aethel-button-secondary aethel-text-xs">
                  Atualizar
                </button>
              </div>
              {connectivityLoading && (
                <p className="aethel-text-sm aethel-text-slate-400">Monitorando serviços...</p>
              )}
              {connectivityError && (
                <p className="aethel-text-sm aethel-text-red-400">Não foi possível consultar os endpoints.</p>
              )}
              {!connectivityLoading && !connectivityError && connectivityData && (
                <div className="aethel-space-y-4">
                  <div className="aethel-card aethel-p-6 aethel-flex aethel-justify-between aethel-items-center">
                    <div>
                      <p className="aethel-text-sm aethel-text-slate-400">Status geral</p>
                      <p className="aethel-text-3xl aethel-font-bold">
                        {(connectivityData.overall_status ?? 'unknown').toUpperCase()}
                      </p>
                    </div>
                    <div className="aethel-text-sm aethel-text-slate-400">
                      Atualizado em {connectivityData.timestamp ? new Date(connectivityData.timestamp).toLocaleString() : '—'}
                    </div>
                  </div>

                  <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-4">
                    {connectivityServices.map(service => (
                      <div key={service.name} className="aethel-card aethel-p-5 aethel-space-y-3">
                        <div className="aethel-flex aethel-justify-between aethel-items-center">
                          <h3 className="aethel-text-lg aethel-font-semibold aethel-capitalize">{service.name.replace(/_/g, ' ')}</h3>
                          <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 ${
                            service.status === 'healthy'
                              ? 'aethel-bg-emerald-500/20 aethel-text-emerald-300'
                              : service.status === 'degraded'
                              ? 'aethel-bg-amber-500/20 aethel-text-amber-300'
                              : 'aethel-bg-red-500/20 aethel-text-red-300'
                          }`}>
                            {service.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="aethel-space-y-2">
                          {service.endpoints.map(endpoint => (
                            <div key={`${service.name}-${endpoint.url}`} className="aethel-border aethel-border-slate-800 aethel-rounded aethel-p-3">
                              <div className="aethel-flex aethel-justify-between aethel-items-center">
                                <span className={`${endpoint.healthy ? 'aethel-text-emerald-300' : 'aethel-text-red-300'} aethel-text-sm`}>{endpoint.url}</span>
                                <span className="aethel-text-xs aethel-text-slate-400">
                                  {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)} ms` : '—'} • {endpoint.status_code ?? '—'}
                                </span>
                              </div>
                              {endpoint.error && (
                                <p className="aethel-text-xs aethel-text-red-300 aethel-mt-1">{endpoint.error}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'agent-canvas' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Agent Canvas</h2>
              <div className="aethel-card aethel-p-6">
                <div className="aethel-mb-4">
                  <p className="aethel-text-slate-400 aethel-mb-4">Build and visualize AI agent workflows. Inspired by advanced platforms like Manus for autonomous task execution.</p>
                  <div className="aethel-flex aethel-gap-4 aethel-mb-4">
                    <button className="aethel-button aethel-button-primary">New Workflow</button>
                    <button className="aethel-button aethel-button-secondary">Load Template</button>
                    <button className="aethel-button aethel-button-ghost">Run Agent</button>
                  </div>
                </div>
               <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-4 aethel-min-h-96 aethel-border aethel-border-slate-700 aethel-overflow-hidden">
                 <ReactFlow
                   nodes={nodes}
                   edges={edges}
                   onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
                   onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
                   fitView
                   style={{ background: '#1e293b' }}
                 >
                   <Background color="#374151" gap={16} />
                   <Controls />
                   <MiniMap
                     nodeColor="#6366f1"
                     maskColor="rgba(30, 41, 59, 0.8)"
                   />
                 </ReactFlow>
               </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-flex aethel-flex-col md:aethel-flex-row md:aethel-items-end md:aethel-justify-between aethel-gap-4">
                <div className="aethel-space-y-2">
                  <h2 className="aethel-text-3xl aethel-font-bold">Billing &amp; Credits</h2>
                  <p className="aethel-text-slate-400 aethel-max-w-2xl">
                    Acompanhe o plano ativo, créditos disponíveis e recebíveis em tempo real. Todas as operações refletem
                    diretamente o que está registrado na carteira e nos endpoints de billing.
                  </p>
                </div>
                <Link href="/terms" className="aethel-button aethel-button-secondary aethel-text-sm">
                  Consultar Termos de Uso
                </Link>
              </div>

              {(billingError || currentPlanError || creditsError) && (
                <div className="aethel-card aethel-border aethel-border-amber-500/40 aethel-bg-amber-500/10 aethel-text-amber-200 aethel-text-sm aethel-p-4">
                  <p>
                    {billingError && 'Falha ao recuperar planos. '}
                    {currentPlanError && 'Não foi possível identificar o plano atual. '}
                    {creditsError && 'Não foi possível obter o saldo de créditos faturáveis.'}
                  </p>
                </div>
              )}

              {(subscribeMessage || subscribeError) && (
                <div className={`aethel-card aethel-text-sm aethel-p-4 ${subscribeError ? 'aethel-text-red-300 aethel-bg-red-500/10 aethel-border aethel-border-red-500/40' : 'aethel-text-emerald-300 aethel-bg-emerald-500/10 aethel-border aethel-border-emerald-500/40'}`}>
                  {subscribeError || subscribeMessage}
                </div>
              )}

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 xl:aethel-grid-cols-4 aethel-gap-4">
                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Plano atual</p>
                  <h3 className="aethel-text-xl aethel-font-semibold">
                    {currentPlan?.name ?? 'Plano padrão'}
                  </h3>
                  <p className="aethel-text-sm aethel-text-slate-400">
                    {currentPlan?.price !== undefined ? `US$ ${currentPlan.price.toFixed(2)}/mês` : 'Valor conforme consumo'}
                  </p>
                  {currentPlan?.features && currentPlan.features.length > 0 && (
                    <ul className="aethel-text-xs aethel-text-slate-400 aethel-space-y-1">
                      {currentPlan.features.slice(0, 3).map(feature => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Saldo em créditos</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-indigo-300">
                    {walletData ? `${walletData.balance.toLocaleString()} ${walletData.currency}` : '—'}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">
                    {creditsInfo
                      ? `Créditos faturáveis: ${creditsInfo.credits.toLocaleString()} ${walletData?.currency ?? 'credits'}`
                      : 'Sincronize após login para detalhar faturamento.'}
                  </p>
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Consumo mensal</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-rose-300">
                    {creditsUsedThisMonth.toLocaleString()} {walletData?.currency ?? 'credits'}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">Inclui débitos e transferências realizadas desde o início do mês.</p>
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Recebíveis pendentes</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-amber-300">
                    {receivableSummary.pending.toLocaleString()} {walletData?.currency ?? 'credits'}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">Baseado nos lançamentos com status pendente ou não conciliado.</p>
                </div>
              </div>

              <div className="aethel-card aethel-p-6 aethel-space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <h3 className="aethel-text-lg aethel-font-semibold">Saldo &amp; Recebíveis</h3>
                  <span className="aethel-text-xs aethel-text-slate-500">Última atualização: {lastWalletUpdate ? new Date(lastWalletUpdate).toLocaleString() : '—'}</span>
                </div>
                <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-4">
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Recebido no mês</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                      {creditsReceivedThisMonth.toLocaleString()} {walletData?.currency ?? 'credits'}
                    </p>
                  </div>
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Gasto hoje</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-rose-300">
                      {creditsUsedToday.toLocaleString()} {walletData?.currency ?? 'credits'}
                    </p>
                  </div>
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-indigo-300">
                      {receivableSummary.total.toLocaleString()} {walletData?.currency ?? 'credits'}
                    </p>
                  </div>
                </div>
                <div className="aethel-overflow-x-auto">
                  <table className="aethel-min-w-full aethel-text-xs aethel-text-left">
                    <thead>
                      <tr className="aethel-text-slate-400">
                        <th className="aethel-py-2 aethel-pr-4">Referência</th>
                        <th className="aethel-py-2 aethel-pr-4">Valor</th>
                        <th className="aethel-py-2 aethel-pr-4">Status</th>
                        <th className="aethel-py-2 aethel-pr-4">Saldo</th>
                        <th className="aethel-py-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivableSummary.recent.length === 0 && (
                        <tr>
                          <td className="aethel-py-3 aethel-text-slate-500" colSpan={5}>
                            Nenhum recebimento cadastrado neste período.
                          </td>
                        </tr>
                      )}
                      {receivableSummary.recent.map(entry => {
                        const rawStatus = entry.metadata?.['status'] as unknown
                        const statusLabel = typeof rawStatus === 'string' ? rawStatus : 'confirmado'
                        const invoice = entry.metadata?.['invoice_id'] as unknown
                        const invoiceLabel = typeof invoice === 'string' ? invoice : entry.reference
                        const amountLabel = `+${entry.amount.toLocaleString()} ${entry.currency}`
                        return (
                          <tr key={entry.id} className="aethel-border-t aethel-border-slate-800">
                            <td className="aethel-py-2 aethel-pr-4 aethel-font-medium aethel-text-slate-200">
                              {invoiceLabel || 'Recebimento'}
                            </td>
                            <td className="aethel-py-2 aethel-pr-4 aethel-text-emerald-300">
                              {amountLabel}
                            </td>
                            <td className="aethel-py-2 aethel-pr-4 aethel-uppercase">
                              {statusLabel}
                            </td>
                            <td className="aethel-py-2 aethel-pr-4 aethel-text-slate-400">
                              {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {entry.currency}
                            </td>
                            <td className="aethel-py-2 aethel-text-slate-400">
                              {new Date(entry.created_at).toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 xl:aethel-grid-cols-3 aethel-gap-4">
                {billingData && billingData.length > 0 ? (
                  billingData.map(plan => {
                    const isActive = currentPlan?.id === plan.id || currentPlan?.name === plan.name
                    return (
                      <div
                        key={plan.id}
                        className={`aethel-card aethel-p-6 aethel-space-y-4 ${isActive ? 'aethel-border-2 aethel-border-indigo-500' : 'aethel-border aethel-border-slate-700'}`}
                      >
                        <div className="aethel-flex aethel-justify-between aethel-items-start">
                          <div>
                            <h3 className="aethel-text-xl aethel-font-semibold">{plan.name}</h3>
                            <p className="aethel-text-3xl aethel-font-bold aethel-text-slate-200">
                              {/* Todos os planos são pagos - estratégia zero prejuízo */}
                              US$ {plan.price?.toFixed(2) || '0.00'}/mês
                              {plan.priceBRL && <span className="aethel-text-sm aethel-text-slate-400 aethel-ml-2">(R${plan.priceBRL})</span>}
                            </p>
                          </div>
                          {isActive && (
                            <span className="aethel-bg-indigo-600/20 aethel-text-indigo-200 aethel-text-xs aethel-font-semibold aethel-rounded-full aethel-px-3 aethel-py-1">
                              Plano atual
                            </span>
                          )}
                        </div>
                        {plan.features && plan.features.length > 0 ? (
                          <ul className="aethel-text-sm aethel-space-y-2 aethel-text-slate-300">
                            {plan.features.map(feature => (
                              <li key={feature} className="aethel-flex aethel-gap-2">
                                <span className="aethel-text-indigo-400">•</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="aethel-text-sm aethel-text-slate-400">Recursos definidos conforme contrato.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSubscribe(plan.id)}
                          className={`aethel-button aethel-w-full ${isActive ? 'aethel-button-secondary' : 'aethel-button-primary'}`}
                          disabled={isActive || subscribingPlan === plan.id}
                        >
                          {isActive ? 'Plano atual' : subscribingPlan === plan.id ? 'Processando...' : 'Selecionar plano'}
                        </button>
                      </div>
                    )
                  })
                ) : (
                  <div className="aethel-card aethel-p-6 aethel-col-span-full">
                    <p className="aethel-text-sm aethel-text-slate-400">Nenhum plano disponível no momento.</p>
                  </div>
                )}
              </div>

              <div className="aethel-card aethel-p-6 aethel-space-y-3">
                <h3 className="aethel-text-lg aethel-font-semibold">Governança e conformidade</h3>
                <p className="aethel-text-sm aethel-text-slate-400">
                  Todas as operações de compra, transferência e recepção de créditos seguem os Termos de Uso e políticas de
                  cobrança da plataforma Aethel. Certifique-se de compartilhar estes documentos com os times financeiro e
                  jurídico antes de ativar automações de faturamento.
                </p>
                <div className="aethel-flex aethel-flex-wrap aethel-gap-3">
                  <Link href="/terms" className="aethel-button aethel-button-ghost aethel-text-xs">
                    Termos de Uso
                  </Link>
                  <a href="mailto:billing@aethel.ai" className="aethel-button aethel-button-ghost aethel-text-xs">
                    Contato financeiro
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'download' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Download Aethel IDE</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Experience the full power of Aethel with our local IDE. Complete with AI integration,
                  advanced coding tools, and seamless backend connectivity.
                  <br /><br />
                  <strong>Free for personal use • Professional features available</strong>
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-8 aethel-max-w-6xl aethel-mx-auto">
                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-indigo-500 aethel-to-purple-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Windows Installer</h3>
                    <p className="aethel-text-slate-400">Complete setup for Windows 10/11</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Size:</span>
                    <span>~250 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Version:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('windows')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    Download for Windows
                    </button>
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-blue-500 aethel-to-cyan-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">macOS Installer</h3>
                    <p className="aethel-text-slate-400">Native app for macOS 11+</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Size:</span>
                    <span>~220 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Version:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('mac')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    🍎 Download for macOS
                    </button>
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-orange-500 aethel-to-red-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Linux Installer</h3>
                    <p className="aethel-text-slate-400">Universal Linux package</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Size:</span>
                    <span>~200 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Version:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('linux')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    🐧 Download for Linux
                    </button>
                  </div>
                </div>

                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-green-500 aethel-to-teal-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">System Requirements</h3>
                    <p className="aethel-text-slate-400">Cross-platform compatibility</p>
                  </div>
                  <div className="aethel-space-y-4">
                    <div className="aethel-border-b aethel-border-slate-700 aethel-pb-3">
                      <h4 className="aethel-text-sm aethel-font-medium aethel-text-slate-300 aethel-mb-2">All Platforms</h4>
                      <ul className="aethel-space-y-1 aethel-text-sm">
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        8GB RAM minimum
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        2GB free disk space
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Internet connection for AI features
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="aethel-text-sm aethel-font-medium aethel-text-slate-300 aethel-mb-2">Platform Specific</h4>
                      <ul className="aethel-space-y-1 aethel-text-sm">
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <span className="aethel-text-slate-400">Windows:</span>
                        <span>10/11 (64-bit)</span>
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <span className="aethel-text-slate-400">macOS:</span>
                        <span>11.0+ (Intel/Apple Silicon)</span>
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <span className="aethel-text-slate-400">Linux:</span>
                        <span>Ubuntu 18.04+ / CentOS 7+</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="aethel-text-center aethel-mt-8">
                <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-6 aethel-max-w-2xl aethel-mx-auto">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-3">Quick Start</h3>
                  <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-4 aethel-text-sm">
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-indigo-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">1</div>
                    Download & Install
                    </div>
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-indigo-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">2</div>
                    Connect to Backend
                    </div>
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-indigo-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">3</div>
                    Start Creating
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Workflow Templates</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Jumpstart your projects with pre-built workflow templates. Drag and drop to customize your AI-powered pipelines.
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6">
                {workflowTemplates.map(template => (
                  <div key={template.id} className="aethel-card aethel-p-6 hover:aethel-shadow-xl aethel-transition aethel-cursor-pointer group">
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                      <div className={`aethel-w-12 aethel-h-12 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center ${
                        template.category === 'Development' ? 'aethel-bg-blue-500/20 aethel-text-blue-400' :
                        template.category === 'Data Science' ? 'aethel-bg-green-500/20 aethel-text-green-400' :
                        template.category === 'Creative' ? 'aethel-bg-purple-500/20 aethel-text-purple-400' :
                        'aethel-bg-orange-500/20 aethel-text-orange-400'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded-full aethel-bg-slate-700 aethel-text-slate-300">
                        {template.category}
                      </span>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2 group-hover:aethel-text-indigo-400 aethel-transition">
                      {template.name}
                    </h3>
                    <p className="aethel-text-slate-400 aethel-text-sm aethel-mb-4">
                      {template.description}
                    </p>
                    <button className="aethel-button aethel-button-primary aethel-w-full group-hover:aethel-bg-indigo-600 aethel-transition">
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'use-cases' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Community Use Cases</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Discover how the Aethel community is building amazing things. Get inspired and share your own creations.
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6">
                {useCases.map(useCase => (
                  <div key={useCase.id} className="aethel-card aethel-p-6 hover:aethel-shadow-xl aethel-transition aethel-cursor-pointer group">
                    {useCase.preview && (
                      <div className="aethel-w-full aethel-h-32 aethel-bg-slate-700 aethel-rounded-lg aethel-mb-4 aethel-flex aethel-items-center aethel-justify-center">
                        <svg className="w-8 h-8 aethel-text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                      <span className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded-full aethel-bg-indigo-500/20 aethel-text-indigo-400">
                        {useCase.category}
                      </span>
                      <div className="aethel-flex aethel-items-center aethel-gap-3 aethel-text-xs aethel-text-slate-400">
                        <span className="aethel-flex aethel-items-center aethel-gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {useCase.views}
                        </span>
                        <span className="aethel-flex aethel-items-center aethel-gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                          </svg>
                          {useCase.likes}
                        </span>
                      </div>
                    </div>
                    <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2 group-hover:aethel-text-indigo-400 aethel-transition">
                      {useCase.title}
                    </h3>
                    <p className="aethel-text-slate-400 aethel-text-sm aethel-mb-3">
                      {useCase.description}
                    </p>
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-3">
                      <span className="aethel-text-xs aethel-text-slate-500">by {useCase.sharedBy}</span>
                      <div className="aethel-flex aethel-gap-1">
                        {useCase.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded aethel-bg-slate-700 aethel-text-slate-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="aethel-button aethel-button-secondary aethel-w-full group-hover:aethel-bg-slate-600 aethel-transition">
                      View Case Study
                    </button>
                  </div>
                ))}
              </div>

              <div className="aethel-text-center aethel-mt-8">
                <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-6 aethel-max-w-2xl aethel-mx-auto">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Share Your Success</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">
                    Built something amazing with Aethel? Share your use case with the community and inspire others!
                  </p>
                  <button className="aethel-button aethel-button-primary">Share Your Use Case</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <AdminPanel />
          )}

          {/* Toast Notifications */}
          {showToast && (
            <div className={`fixed bottom-4 right-4 z-50 aethel-flex aethel-items-center aethel-gap-3 aethel-px-4 aethel-py-3 aethel-rounded-lg aethel-shadow-lg aethel-transition aethel-max-w-sm ${
              showToast.type === 'success' ? 'aethel-bg-green-500/20 aethel-border aethel-border-green-500/30 aethel-text-green-400' :
              showToast.type === 'error' ? 'aethel-bg-red-500/20 aethel-border aethel-border-red-500/30 aethel-text-red-400' :
              'aethel-bg-blue-500/20 aethel-border aethel-border-blue-500/30 aethel-text-blue-400'
            }`}>
              <div className={`aethel-w-5 aethel-h-5 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center ${
                showToast.type === 'success' ? 'aethel-bg-green-500' :
                showToast.type === 'error' ? 'aethel-bg-red-500' :
                'aethel-bg-blue-500'
              }`}>
                {showToast.type === 'success' ? (
                  <svg className="w-3 h-3 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : showToast.type === 'error' ? (
                  <svg className="w-3 h-3 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <span className="aethel-text-sm aethel-font-medium">{showToast.message}</span>
              <button
                onClick={() => setShowToast(null)}
                className="aethel-ml-auto aethel-hover:opacity-70 aethel-transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}