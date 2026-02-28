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
import BillingTab, { type Plan as BillingPlanCard } from './dashboard/tabs/BillingTab'
import * as THREE from 'three'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { isAuthenticated } from '@/lib/auth'
import { useAssetDownload, useJobQueue, useRenderProgress } from '@/hooks/useAethelGateway'
import { RenderQueue, type RenderJob } from './dashboard/RenderProgress'
import { AIThinkingPanel } from './ai/AIThinkingPanel'
import { DirectorNotePanel } from './ai/DirectorNotePanel'
import { TimeMachineSlider } from './collaboration/TimeMachineSlider'
import { openConfirmDialog, openPromptDialog } from '@/lib/ui/non-blocking-dialogs'
import {
  type ActiveTab,
  type DashboardSettings,
  type Project,
  type SessionEntry,
  type SessionFilter,
  type ToastState,
  type UseCase,
  type WorkflowTemplate,
  clearStoredDashboardState,
  DEFAULT_SETTINGS,
  DASHBOARD_TABS,
  resolveStoredActiveTab,
  resolveStoredChatHistory,
  resolveStoredSessions,
  resolveStoredSettings,
  STORAGE_KEYS,
} from './dashboard/aethel-dashboard-model'
import {
  BILLING_PLANS_KEY,
  CONNECTIVITY_KEY,
  CREDITS_KEY,
  CURRENT_PLAN_KEY,
  DEFAULT_PROJECTS,
  DEFAULT_USE_CASES,
  DEFAULT_WORKFLOW_TEMPLATES,
  HEALTH_KEY,
  INITIAL_EDGES,
  INITIAL_NODES,
  WALLET_KEY,
  formatConnectivityStatus,
  formatCurrencyLabel,
  formatStatusLabel,
  getScopedKeys,
} from './dashboard/aethel-dashboard-defaults'
import {
  createInitialSessionEntry,
  createSavedSessionEntry,
  filterSessionHistory,
  toggleSessionFavorite,
  toggleSessionScheduled,
} from './dashboard/aethel-dashboard-session-utils'
import { createProjectEntry, removeProjectEntry } from './dashboard/aethel-dashboard-project-utils'
import {
  computeReceivableSummary,
  computeWalletUsageStats,
  getCreditEntries,
  getLastWalletUpdate,
} from './dashboard/aethel-dashboard-wallet-utils'
import {
  buildLivePreviewContextPayload,
  buildLivePreviewPrompt,
  buildLivePreviewSuggestionMessage,
  buildLivePreviewSystemMessage,
  extractPrimaryAssistantContent,
} from './dashboard/aethel-dashboard-livepreview-ai-utils'
import {
  buildCopilotContextPatch,
  buildWorkflowTitle,
  extractCopilotWorkflowList,
  mapApiMessagesToChatHistory,
} from './dashboard/aethel-dashboard-copilot-utils'
import {
  buildPurchaseSuccessMessage,
  buildTransferSuccessMessage,
  mapPurchaseIntentError,
  mapSubscribeError,
  mapTransferError,
  normalizeCurrencyCode,
  parsePositiveInteger,
  validatePurchaseInput,
  validateTransferInput,
} from './dashboard/aethel-dashboard-billing-utils'
import { TrialBanner } from './dashboard/TrialBanner'
import { DashboardHeader } from './dashboard/DashboardHeader'
import { AethelDashboardSidebar } from './dashboard/AethelDashboardSidebar'

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
  const [aiActivity, setAiActivity] = useState('Ocioso')
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
  const [isStreaming, setIsStreaming] = useState(false)
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
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [hasToken, setHasToken] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState<Error | null>(null)

  const { downloads, startDownload, cancelDownload } = useAssetDownload()
  const { renders, cancelRender } = useRenderProgress()
  const { jobs: queueJobs } = useJobQueue()

  const renderJobs = useMemo<RenderJob[]>(() => {
    return renders.map((render, index) => {
      const totalFrames = render.totalFrames && render.totalFrames > 0 ? render.totalFrames : 1
      const currentFrame = render.currentFrame && render.currentFrame > 0 ? render.currentFrame : 0
      const statusMap: Record<string, RenderJob['status']> = {
        pending: 'queued',
        rendering: 'rendering',
        complete: 'completed',
        failed: 'failed',
        cancelled: 'cancelled'
      }

      return {
        id: render.jobId,
        name: render.message || `Renderização ${index + 1}`,
        type: totalFrames > 1 ? 'sequence' : 'image',
        status: statusMap[render.status] || 'queued',
        progress: render.progress ?? 0,
        currentFrame,
        totalFrames,
        estimatedTimeRemaining: render.eta,
        output: render.output,
        error: render.error,
        resolution: { width: 1920, height: 1080 },
        samples: render.totalSamples ?? 0,
        engine: 'cycles',
        peakMemory: render.memory,
        frames: []
      }
    })
  }, [renders])

  const exportJobs = useMemo(() => {
    return queueJobs.filter(job => job.type.toLowerCase().includes('export'))
  }, [queueJobs])

  const formatBytes = useCallback((bytes: number) => {
    if (!Number.isFinite(bytes)) return '-'
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }, [])

  const formatCurrency = useCallback((value: number, currency: string) => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `${currency} ${value.toFixed(2)}`
    }
  }, [])

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

  const billingPlansForUI = useMemo<BillingPlanCard[]>(() => {
    if (!billingData || billingData.length === 0) return []
    return billingData.map((plan) => ({
      id: String(plan.id),
      name: plan.name ?? String(plan.id),
      description: plan.description ?? '',
      price: Number(plan.priceBRL ?? plan.price ?? 0),
      currency: plan.currency ?? 'BRL',
      interval: (plan.interval as BillingPlanCard['interval']) ?? 'month',
      popular: plan.popular ?? false,
      features: plan.features ?? [],
      limits: {
        requests: (plan.limits as any)?.tokensPerMonth ?? (plan.limits as any)?.requests ?? 'unlimited',
        projects: (plan.limits as any)?.projects ?? 'unlimited',
        storage: (plan.limits as any)?.storage ?? '—',
        collaborators: (plan.limits as any)?.collaborators ?? 'unlimited',
      },
    }))
  }, [billingData])

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
      setAuthError(error instanceof Error ? error : new Error('Falha ao verificar estado de autenticação'))
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
        const restored = mapApiMessagesToChatHistory(data)

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
    setChatHistory(mapApiMessagesToChatHistory(data))
  }, [])

  const refreshCopilotWorkflows = useCallback(async () => {
    setCopilotWorkflowsLoading(true)
    try {
      const res = await AethelAPIClient.listCopilotWorkflows().catch(() => ({ workflows: [] as any[] }))
      const list = extractCopilotWorkflowList(res)
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
    const title = buildWorkflowTitle('Workflow')
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
    const nextTitle = await openPromptDialog({
      title: 'Renomear trabalho',
      message: 'Informe o novo nome do workflow.',
      defaultValue: current?.title || 'Workflow',
      placeholder: 'Nome do workflow',
      confirmText: 'Salvar',
      cancelText: 'Cancelar',
    })
    if (!nextTitle || !nextTitle.trim()) return
    await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { title: nextTitle.trim() }).catch(() => null)
    await refreshCopilotWorkflows().catch(() => null)
    showToastMessage('Trabalho renomeado.', 'success')
  }, [activeWorkflowId, copilotWorkflows, refreshCopilotWorkflows, showToastMessage])

  const archiveCopilotWorkflow = useCallback(async () => {
    if (!activeWorkflowId) return
    const ok = await openConfirmDialog({
      title: 'Arquivar trabalho',
      message: 'Arquivar este trabalho (workflow)?',
      confirmText: 'Arquivar',
      cancelText: 'Cancelar',
    })
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

      const patch = buildCopilotContextPatch(activeWorkflowId, source?.context)
      if (patch) {
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
    const patch = buildCopilotContextPatch(activeWorkflowId, source?.context)
    if (!patch) {
      showToastMessage('Esse trabalho não tem contexto salvo para importar.', 'error')
      return
    }

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
        setAuthError(error instanceof Error ? error : new Error('Falha ao verificar estado de autenticação'))
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


  const handleSelectTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }, [])

  // Create new session
  const createNewSession = useCallback(() => {
    setSessionHistory(prev => {
      const newSession = createInitialSessionEntry(prev.length, settings)
      return [newSession, ...prev]
    })
    setChatHistory([])
    setLivePreviewSuggestions([])
    setActiveTab('ai-chat')
    showToastMessage('Sessão criada!', 'success')

    // Também cria uma nova thread persistida para a conta.
    if (typeof window !== 'undefined' && isAuthenticated()) {
      void (async () => {
        try {
          const created = await AethelAPIClient.createChatThread({ title: buildWorkflowTitle('Sessao') })
          const threadId = (created as any)?.thread?.id
          if (typeof threadId === 'string' && threadId) {
            const keys = getScopedKeys(copilotProjectId)
            window.localStorage.setItem(keys.chatThreadKey, threadId)
            setActiveChatThreadId(threadId)

            const createdWf = await AethelAPIClient.createCopilotWorkflow({
              title: buildWorkflowTitle('Fluxo'),
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
    setSessionHistory((prev) => toggleSessionFavorite(prev, sessionId))
  }

  // Toggle scheduled on session
  const toggleScheduled = (sessionId: string) => {
    setSessionHistory((prev) => toggleSessionScheduled(prev, sessionId))
  }

  // Filtered sessions
  const filteredSessions = useMemo(
    () => filterSessionHistory(sessionHistory, sessionFilter),
    [sessionHistory, sessionFilter]
  )

  // Function to save current session
  const saveCurrentSession = useCallback(() => {
    setSessionHistory(prev => {
      const currentSession = createSavedSessionEntry(
        prev.length,
        chatHistory,
        livePreviewSuggestions,
        settings
      )
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

  const downloadUrls = useMemo(() => ({
    windows: process.env.NEXT_PUBLIC_IDE_DOWNLOAD_URL_WINDOWS,
    mac: process.env.NEXT_PUBLIC_IDE_DOWNLOAD_URL_MAC,
    linux: process.env.NEXT_PUBLIC_IDE_DOWNLOAD_URL_LINUX,
  }), [])

  const handleDownload = useCallback(async (platform: 'windows' | 'mac' | 'linux') => {
    const url = downloadUrls[platform]
    if (!url) {
      showToastMessage(`URL de download para ${platform} não configurada.`, 'error')
      return
    }

    showToastMessage(`Iniciando download para ${platform}...`, 'info')
    try {
      await startDownload(url, {
        filename: `aethel-ide-${platform}-v2.1.0${platform === 'windows' ? '.exe' : platform === 'mac' ? '.dmg' : '.tar.gz'}`,
      })
    } catch (error) {
      showToastMessage(`Falha ao iniciar download para ${platform}.`, 'error')
    }
  }, [downloadUrls, showToastMessage, startDownload])

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

    setAiActivity('Enviando mensagem para a IA...')
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
      setAiActivity('A IA está pensando...')
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

      setAiActivity('IA respondeu')
      showToastMessage('Resposta da IA recebida!', 'success');

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
        content: 'Falha ao conectar ao backend. Verifique se o servidor está em execução.'
      }
      setChatHistory(prev =>
        prev.map(msg =>
          msg === aiMessage ? errorMessage : msg
        )
      )
      setAiActivity('Falha de conexão')
      showToastMessage('Falha ao conectar ao backend de IA', 'error');
    }
  }

  const createProject = () => {
    if (!newProjectName.trim()) return
    const newProject = createProjectEntry(projects, newProjectName, newProjectType)
    setProjects(prev => [...prev, newProject])
    setNewProjectName('')
    setNewProjectType('code')
  }

  const deleteProject = (id: number) => {
    setProjects(prev => removeProjectEntry(prev, id))
  }

  const handleMagicWandSelect = async (position: THREE.Vector3) => {
    setAiActivity('Analisando área selecionada...')
    setIsGenerating(true)

    try {
      // Atualiza contexto do Copilot (snapshot mínimo do Live Preview).
      // MVP: em memória no server; sem isso a IA perde precisão.
      await fetch('/api/copilot/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildLivePreviewContextPayload(activeWorkflowId, position)),
      })
    } catch (e) {
      // Não bloqueia o fluxo de sugestão; apenas mantém real-or-fail.
      console.warn('Failed to update copilot context', e)
    }

    const prompt = buildLivePreviewPrompt(position)

    try {
      const messages: ChatMessage[] = [
        buildLivePreviewSystemMessage(),
        { role: 'user', content: prompt },
      ]

      const data = await AethelAPIClient.chat({ model: 'openai:gpt-4', messages })
      const content = extractPrimaryAssistantContent(data)

      const suggestion = String(content).trim()
      if (!suggestion) {
        setAiActivity('Nenhuma sugestão retornada')
        showToastMessage('AI não retornou sugestão para a área selecionada.', 'info')
        return
      }

      setLivePreviewSuggestions(prev => [...prev, suggestion])
      setAiActivity('Sugestão gerada para a área selecionada')
    } catch (error) {
      console.error('Error generating live preview suggestion:', error)
      setAiActivity('Sugestão indisponível')
      showToastMessage('Sugestão indisponível (IA não configurada ou sem créditos).', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendSuggestion = async (suggestion: string) => {
    setAiActivity('Processando sugestão do usuário...')
    setIsGenerating(true)
    // Add to chat history and send to AI
    const userMessage: ChatMessage = buildLivePreviewSuggestionMessage(suggestion)
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
        setAiActivity('Sugestão aplicada na prévia ao vivo')
      }
    } catch (error) {
      console.error('Error sending suggestion:', error)
      setAiActivity('Erro ao processar sugestão')
    }
    setIsGenerating(false)
  }

  const handleAcceptSuggestion = (suggestion: string) => {
    handleSendSuggestion(`Aceite e aplique: ${suggestion}`)
  }

  const walletTransactions = useMemo(() => walletData?.transactions ?? [], [walletData?.transactions])
  const connectivityServices = useMemo(() => connectivityData?.services ?? [], [connectivityData?.services])
  const lastWalletUpdate = useMemo(() => getLastWalletUpdate(walletTransactions), [walletTransactions])

  const creditEntries = useMemo(() => getCreditEntries(walletTransactions), [walletTransactions])

  const {
    creditsUsedToday,
    creditsUsedThisMonth,
    creditsReceivedThisMonth,
  } = useMemo(() => computeWalletUsageStats(walletTransactions), [walletTransactions])

  const receivableSummary = useMemo(() => computeReceivableSummary(creditEntries), [creditEntries])

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
    const validationError = validatePurchaseInput(hasToken, purchaseForm.amount)
    if (validationError) {
      setWalletActionError(validationError)
      return
    }
    const amountInt = parsePositiveInteger(purchaseForm.amount)!
    setWalletSubmitting(true)
    setWalletActionMessage(null)
    setWalletActionError(null)
    try {
      const intent = await AethelAPIClient.createPurchaseIntent({
        amount: amountInt,
        currency: normalizeCurrencyCode(purchaseForm.currency),
        reference: purchaseForm.reference || undefined,
      })
      setLastPurchaseIntent(intent)
      setWalletActionMessage(buildPurchaseSuccessMessage(intent, formatCurrencyLabel))
      setPurchaseForm(prev => ({ ...prev, amount: '', reference: '' }))
      await refreshWallet()
      if (creditsKey) {
        await mutate(creditsKey)
      }
    } catch (error) {
      setWalletActionError(mapPurchaseIntentError(error))
    } finally {
      setWalletSubmitting(false)
    }
  }

  const handleTransferSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateTransferInput(hasToken, transferForm.amount, transferForm.targetUserId)
    if (validationError) {
      setWalletActionError(validationError)
      return
    }
    const amountInt = parsePositiveInteger(transferForm.amount)!
    const target = transferForm.targetUserId.trim()
    setWalletSubmitting(true)
    setWalletActionMessage(null)
    setWalletActionError(null)
    try {
      const receipt = await AethelAPIClient.transferCredits({
        target_user_id: target,
        amount: amountInt,
        currency: normalizeCurrencyCode(transferForm.currency),
        reference: transferForm.reference || undefined,
      })
      setLastTransferReceipt(receipt)
      setWalletActionMessage(buildTransferSuccessMessage(receipt, formatCurrencyLabel))
      setTransferForm(prev => ({ ...prev, amount: '', reference: '' }))
      await refreshWallet()
      if (creditsKey) {
        await mutate(creditsKey)
      }
    } catch (error) {
      setWalletActionError(mapTransferError(error))
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
      setSubscribeError(mapSubscribeError(error))
    } finally {
      setSubscribingPlan(null)
    }
  }

  const handleManageSubscription = useCallback(async () => {
    if (!hasToken) {
      setSubscribeError('Faça login para gerenciar sua assinatura.')
      return
    }

    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Falha ao abrir portal')
      }
      window.location.assign(data.url)
    } catch (error) {
      setSubscribeError('Não foi possível abrir o portal de cobrança.')
    }
  }, [hasToken])

  return (
    <div className="min-h-screen aethel-container">
      {/* Trial Banner */}
      {isTrialActive && (
        <TrialBanner trialDaysLeft={trialDaysLeft} onDismiss={() => setIsTrialActive(false)} />
      )}

      {/* Header */}
      <DashboardHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onResetDashboard={clearDashboardState}
        onToggleTheme={toggleTheme}
        theme={settings.theme}
        backendOnline={Boolean(healthData)}
        authErrorText={authError ? String(authError) : null}
        billingErrorText={billingError ? String(billingError) : null}
      />

      <div className="aethel-flex aethel-gap-0">
        {/* Sidebar */}
        <AethelDashboardSidebar
          sidebarOpen={sidebarOpen}
          activeTab={activeTab}
          sessionFilter={sessionFilter}
          onCreateNewSession={createNewSession}
          onSelectSessionFilter={setSessionFilter}
          onSelectTab={handleSelectTab}
        />

        {/* Main Content */}
        <main className="aethel-flex-1 aethel-min-h-screen aethel-bg-slate-900 aethel-text-slate-100">
          {/* Content based on active tab */}
          {activeTab === 'overview' && (
            <div className="aethel-p-6 aethel-space-y-6">
              {/* Status Cards */}
              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Atividade de IA</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-blue-400">{aiActivity}</p>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Projetos ativos</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-green-400">{projects.filter(p => p.status === 'active').length}</p>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Prévia ao vivo</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-cyan-400">{livePreviewSuggestions.length} sugestões</p>
                </div>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <div className="aethel-flex aethel-items-center aethel-justify-between">
                    <h3 className="aethel-text-lg aethel-font-semibold">Saldo da carteira</h3>
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
                          {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
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
                                  {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                                </span>
                              </div>
                              <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                                <span className="aethel-text-xs aethel-text-slate-400">
                                  Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
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
                    <h3 className="aethel-text-lg aethel-font-semibold">Status de conectividade</h3>
                    {connectivityData && (
                      <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 aethel-border ${
                        connectivityData.overall_status === 'healthy'
                          ? 'aethel-border-emerald-500/30 aethel-bg-emerald-500/20 aethel-text-emerald-300'
                          : connectivityData.overall_status === 'degraded'
                          ? 'aethel-border-amber-500/30 aethel-bg-amber-500/20 aethel-text-amber-300'
                          : 'aethel-border-red-500/30 aethel-bg-red-500/20 aethel-text-red-300'
                      }`}>
                        {formatConnectivityStatus(connectivityData.overall_status).toUpperCase()}
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
                                {formatConnectivityStatus(service.status).toUpperCase()}
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
                  <h3 className="aethel-text-xl aethel-font-semibold">Prévia ao vivo</h3>
                  <button
                    onClick={() => setMiniPreviewExpanded(!miniPreviewExpanded)}
                    className="aethel-button aethel-button-ghost aethel-text-sm"
                  >
                    {miniPreviewExpanded ? 'Recolher' : 'Expandir'}
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
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
                <h2 className="aethel-text-2xl aethel-font-bold">Projetos</h2>
                
                {/* TimeMachine Slider para histórico do projeto */}
                {projects.length > 0 && (
                  <div className="aethel-w-96">
                    <TimeMachineSlider
                      versions={[]}
                      onVersionChange={(versionId) => {
                        showToastMessage(`Navegando para versão: ${versionId}`, 'info');
                      }}
                      variant="compact"
                    />
                  </div>
                )}
              </div>
              
              {/* Director Note Panel - Feedback artístico da IA */}
              {projects.length > 0 && (
                <div className="aethel-mb-6">
                  <DirectorNotePanel
                    projectId={String(projects[0].id)}
                    position="floating"
                    onApplyFix={async (note) => {
                      showToastMessage(`Aplicando sugestão: ${note.title}`, 'success');
                    }}
                  />
                </div>
              )}
              
              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6 aethel-mb-6">
                {projects.map(project => (
                  <div key={project.id} className="aethel-card aethel-p-4">
                    <h3 className="aethel-font-semibold aethel-mb-2">{project.name}</h3>
                    <p className="aethel-text-sm aethel-text-slate-400 aethel-mb-2">Tipo: {project.type}</p>
                    <p className="aethel-text-sm aethel-mb-4">Status: <span className={`aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs ${project.status === 'active' ? 'aethel-bg-green-500/20 aethel-text-green-400' : 'aethel-bg-gray-500/20 aethel-text-gray-400'}`}>{project.status}</span></p>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="aethel-button aethel-button-danger aethel-text-xs"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <div className="aethel-card aethel-p-6 aethel-max-w-md">
                <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Criar novo projeto</h3>
                <div className="aethel-space-y-4">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nome do projeto"
                    className="aethel-input aethel-w-full"
                  />
                  <select
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value)}
                    className="aethel-input aethel-w-full"
                  >
                    <option value="code">Projeto de código</option>
                    <option value="unreal">Unreal Engine</option>
                    <option value="web">Aplicação web</option>
                  </select>
                  <button
                    onClick={createProject}
                    className="aethel-button aethel-button-primary aethel-w-full"
                  >
                    Criar projeto
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-6">
                <h2 className="aethel-text-2xl aethel-font-bold">Chat IA</h2>
                <div className="aethel-flex aethel-gap-2">
                  <button
                    onClick={() => setChatMode('chat')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'chat' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setChatMode('agent')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'agent' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
                  >
                    Modo agente
                  </button>
                  <button
                    onClick={() => setChatMode('canvas')}
                    className={`aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-text-sm aethel-font-medium ${chatMode === 'canvas' ? 'aethel-bg-blue-500 aethel-text-white' : 'aethel-bg-slate-700 aethel-text-slate-300 hover:aethel-bg-slate-600'}`}
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
                      {wf.title || 'Fluxo'}
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
                        {wf.title || 'Fluxo'}
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
                    Chat conversacional padrão com os agentes avançados do Aethel.
                  </div>
                  <div className="aethel-space-y-4 aethel-mb-4 aethel-max-h-96 aethel-overflow-y-auto">
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`aethel-p-3 aethel-rounded-lg ${msg.role === 'user' ? 'aethel-bg-blue-500/20 aethel-ml-12' : 'aethel-bg-slate-700/50 aethel-mr-12'}`}>
                        <p className="aethel-text-sm aethel-font-medium aethel-mb-1">{msg.role === 'user' ? 'Você' : 'IA'}</p>
                        <p className="aethel-text-sm">{msg.content}</p>
                      </div>
                    ))}
                    
                    {/* AI Thinking Panel - Mostra quando IA está processando */}
                    {isStreaming && (
                      <AIThinkingPanel 
                        isStreaming={isStreaming}
                        position="floating"
                      />
                    )}
                  </div>
                  <div className="aethel-flex aethel-gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Digite sua mensagem..."
                      className="aethel-input aethel-flex-1"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="aethel-button aethel-button-primary"
                      disabled={isStreaming}
                    >
                      {isStreaming ? 'Processando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}

              {chatMode === 'agent' && (
                <div className="aethel-card aethel-p-6 aethel-max-w-4xl aethel-mx-auto">
                  <div className="aethel-mb-4 aethel-text-sm aethel-text-slate-400">
                    Modo de agente autônomo — inspirado na plataforma Manus. A IA executará tarefas passo a passo e entregará resultados.
                  </div>
                  <div className="aethel-space-y-4 aethel-mb-4">
                    <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-4">
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Pesquisa e análise</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Coletar informações, analisar dados e gerar insights</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Criação de conteúdo</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Gerar artigos, código, documentação e conteúdo criativo</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Automação</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Criar fluxos, scripts e processos automatizados</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Resolução de problemas</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Depurar código, otimizar performance e resolver issues complexas</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Geração de código</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Gerar, depurar e otimizar código em várias linguagens</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Análise de dados</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Analisar datasets, criar visualizações e extrair insights</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Design criativo</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Desenhar UI/UX, gráficos e conceitos criativos</p>
                      </button>
                      <button className="aethel-card aethel-p-4 aethel-text-left hover:aethel-bg-slate-700/50 aethel-transition">
                        <h3 className="aethel-font-semibold aethel-mb-2">Estratégia de negócios</h3>
                        <p className="aethel-text-sm aethel-text-slate-400">Planejamento estratégico, análise de mercado e desenvolvimento de negócios</p>
                      </button>
                    </div>
                  </div>
                  <div className="aethel-flex aethel-gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Descreva a tarefa para o agente..."
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
                    Canvas visual para trabalho colaborativo com IA. Desenhe, esboce ideias e colabore em tempo real.
                  </div>
                  <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-4 aethel-min-h-96 aethel-border aethel-border-slate-700 aethel-relative">
                    <div className="aethel-absolute aethel-top-4 aethel-left-4 aethel-flex aethel-gap-2">
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Desenhar</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Formas</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Texto</button>
                      <button className="aethel-button aethel-button-ghost aethel-text-xs">Melhorar com IA</button>
                    </div>
                    <div className="aethel-text-center aethel-text-slate-500 aethel-py-32">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">Canvas interativo</p>
                      <p className="text-sm">Em breve com recursos completos de desenho e colaboração</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'content-creation' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Criação de conteúdo</h2>
              <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Conteúdo com IA</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">Gere código, documentação e conteúdo criativo com assistência de IA.</p>
                  <button className="aethel-button aethel-button-primary">Começar a criar</button>
                </div>
                <div className="aethel-card aethel-p-6">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Modelos</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">Use modelos pré-prontos para tarefas comuns de desenvolvimento.</p>
                  <button className="aethel-button aethel-button-secondary">Ver modelos</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'unreal' && (
            <div className="aethel-p-6">
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Integração com Unreal Engine</h2>
              <div className="aethel-card aethel-p-6">
                <p className="aethel-text-slate-400 aethel-mb-4">Integre-se ao Unreal Engine para VR e desenvolvimento de jogos.</p>
                <div className="aethel-flex aethel-gap-4">
                  <button className="aethel-button aethel-button-primary">Conectar à Unreal</button>
                  <button className="aethel-button aethel-button-secondary">Prévia VR</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <h2 className="aethel-text-2xl aethel-font-bold">Carteira</h2>
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
                            {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                          </div>
                          {creditsInfo && (
                            <p className="aethel-text-xs aethel-text-slate-400">
                              Créditos faturáveis: {creditsInfo.credits.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
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
                                {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                              </p>
                            </div>
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Gasto no mês</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                                {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                              </p>
                            </div>
                            <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-3">
                              <p className="aethel-text-xs aethel-text-slate-500">Recebido no mês</p>
                              <p className="aethel-text-lg aethel-font-semibold aethel-text-emerald-300">
                                {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                              </p>
                            </div>
                          </div>
                          {lastPurchaseIntent && (
                            <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-2">
                              Última intenção #{lastPurchaseIntent.intent_id} • +
                              {lastPurchaseIntent.entry.amount.toLocaleString()} {formatCurrencyLabel(lastPurchaseIntent.entry.currency)}{' '}
                              em {new Date(lastPurchaseIntent.entry.created_at).toLocaleString()}
                            </p>
                          )}
                          {lastTransferReceipt && (
                            <p className="aethel-text-xs aethel-text-slate-400">
                              Última transferência #{lastTransferReceipt.transfer_id} • -
                              {lastTransferReceipt.sender_entry.amount.toLocaleString()} {formatCurrencyLabel(lastTransferReceipt.sender_entry.currency)}{' '}
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
                          <option value="credits">Créditos</option>
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
                        placeholder="ID do usuário ou e-mail do destinatário"
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
                          <option value="credits">Créditos</option>
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
                                {entry.entry_type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                              </span>
                            </div>
                            <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                              <span className="aethel-text-xs aethel-text-slate-400">
                                Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
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
                          {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                        </p>
                      </div>
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-blue-300">
                          {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                        </p>
                      </div>
                      <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                        <p className="aethel-text-xs aethel-text-slate-500">Pendente de conciliação</p>
                        <p className="aethel-text-lg aethel-font-semibold aethel-text-amber-300">
                          {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
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
                            const statusLabel = formatStatusLabel(rawStatus)
                            const invoice = entry.metadata?.['invoice_id'] as unknown
                            const invoiceLabel = typeof invoice === 'string' ? invoice : entry.reference
                            const amountLabel = `+${entry.amount.toLocaleString()} ${formatCurrencyLabel(entry.currency)}`
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
                                  {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
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
                <h2 className="aethel-text-2xl aethel-font-bold">Monitor de conectividade</h2>
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
                        {formatConnectivityStatus(connectivityData.overall_status).toUpperCase()}
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
                            {formatConnectivityStatus(service.status).toUpperCase()}
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
              <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Canvas de agentes</h2>
              <div className="aethel-card aethel-p-6">
                <div className="aethel-mb-4">
                  <p className="aethel-text-slate-400 aethel-mb-4">Construa e visualize fluxos de agentes de IA. Inspirado em plataformas avançadas como Manus para execução autônoma.</p>
                  <div className="aethel-flex aethel-gap-4 aethel-mb-4">
                    <button className="aethel-button aethel-button-primary">Novo fluxo</button>
                    <button className="aethel-button aethel-button-secondary">Carregar template</button>
                    <button className="aethel-button aethel-button-ghost">Executar agente</button>
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
                  <h2 className="aethel-text-3xl aethel-font-bold">Faturamento &amp; Créditos</h2>
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
                    {currentPlan?.priceBRL !== undefined
                      ? `${formatCurrency(currentPlan.priceBRL, 'BRL')}/mês`
                      : currentPlan?.price !== undefined
                        ? `${formatCurrency(currentPlan.price, 'USD')}/mês`
                        : 'Valor conforme consumo'}
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
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-blue-300">
                    {walletData ? `${walletData.balance.toLocaleString()} ${formatCurrencyLabel(walletData.currency)}` : '—'}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">
                    {creditsInfo
                      ? `Créditos faturáveis: ${creditsInfo.credits.toLocaleString()} ${formatCurrencyLabel(walletData?.currency)}`
                      : 'Sincronize após login para detalhar faturamento.'}
                  </p>
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Consumo mensal</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-rose-300">
                    {creditsUsedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                  </h3>
                  <p className="aethel-text-xs aethel-text-slate-400">Inclui débitos e transferências realizadas desde o início do mês.</p>
                </div>

                <div className="aethel-card aethel-p-5 aethel-space-y-3">
                  <p className="aethel-text-xs aethel-text-slate-500">Recebíveis pendentes</p>
                  <h3 className="aethel-text-2xl aethel-font-semibold aethel-text-amber-300">
                    {receivableSummary.pending.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
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
                      {creditsReceivedThisMonth.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                    </p>
                  </div>
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Gasto hoje</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-rose-300">
                      {creditsUsedToday.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
                    </p>
                  </div>
                  <div className="aethel-bg-slate-900/40 aethel-rounded-lg aethel-p-4">
                    <p className="aethel-text-xs aethel-text-slate-500">Total creditado</p>
                    <p className="aethel-text-lg aethel-font-semibold aethel-text-blue-300">
                      {receivableSummary.total.toLocaleString()} {formatCurrencyLabel(walletData?.currency)}
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
                        const statusLabel = formatStatusLabel(rawStatus)
                        const invoice = entry.metadata?.['invoice_id'] as unknown
                        const invoiceLabel = typeof invoice === 'string' ? invoice : entry.reference
                        const amountLabel = `+${entry.amount.toLocaleString()} ${formatCurrencyLabel(entry.currency)}`
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
                              {entry.balance_after != null ? entry.balance_after.toLocaleString() : '—'} {formatCurrencyLabel(entry.currency)}
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

              <div className="aethel-card aethel-p-6 aethel-space-y-4">
                <div className="aethel-flex aethel-items-center aethel-justify-between">
                  <h3 className="aethel-text-lg aethel-font-semibold">Planos e assinatura</h3>
                  <button
                    type="button"
                    onClick={handleManageSubscription}
                    className="aethel-button aethel-button-ghost aethel-text-xs"
                  >
                    Gerenciar assinatura
                  </button>
                </div>
                <BillingTab
                  plans={billingPlansForUI}
                  currentPlan={currentPlan?.id ?? ''}
                  loading={!billingData && !billingError}
                  onSelectPlan={handleSubscribe}
                  onManageSubscription={handleManageSubscription}
                  showHeader={false}
                  showHighlights={false}
                  showFaq={false}
                  showCurrentPlanInfo={false}
                />
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
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Baixar Aethel IDE</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Experimente todo o poder do Aethel com a nossa IDE local. Inclui integração com IA,
                  ferramentas avançadas de código e conectividade total com o backend.
                  <br /><br />
                  <strong>Gratuito para uso pessoal • Recursos profissionais disponíveis</strong>
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-8 aethel-max-w-6xl aethel-mx-auto">
                <div className="aethel-card aethel-p-6">
                  <div className="aethel-text-center aethel-mb-6">
                    <div className="aethel-w-16 aethel-h-16 aethel-bg-gradient-to-r aethel-from-blue-500 aethel-to-cyan-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-4">
                    <svg className="w-8 h-8 aethel-text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Instalador Windows</h3>
                    <p className="aethel-text-slate-400">Instalação completa para Windows 10/11</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Tamanho:</span>
                    <span>~250 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Versão:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('windows')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    Baixar para Windows
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
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Instalador macOS</h3>
                    <p className="aethel-text-slate-400">App nativo para macOS 11+</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Tamanho:</span>
                    <span>~220 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Versão:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('mac')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    🍎 Baixar para macOS
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
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Instalador Linux</h3>
                    <p className="aethel-text-slate-400">Pacote Linux universal</p>
                  </div>
                  <div className="aethel-space-y-3">
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Tamanho:</span>
                    <span>~200 MB</span>
                    </div>
                    <div className="aethel-flex aethel-justify-between aethel-text-sm">
                    <span>Versão:</span>
                    <span>v2.1.0</span>
                    </div>
                    <button
                      onClick={() => handleDownload('linux')}
                      className="aethel-button aethel-button-primary aethel-w-full aethel-mt-4"
                    >
                    🐧 Baixar para Linux
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
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2">Requisitos do sistema</h3>
                    <p className="aethel-text-slate-400">Compatibilidade multiplataforma</p>
                  </div>
                  <div className="aethel-space-y-4">
                    <div className="aethel-border-b aethel-border-slate-700 aethel-pb-3">
                      <h4 className="aethel-text-sm aethel-font-medium aethel-text-slate-300 aethel-mb-2">Todas as plataformas</h4>
                      <ul className="aethel-space-y-1 aethel-text-sm">
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mínimo de 8GB RAM
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        2GB de espaço livre
                        </li>
                        <li className="aethel-flex aethel-items-center aethel-gap-2">
                        <svg className="w-4 h-4 aethel-text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Conexão com a internet para recursos de IA
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="aethel-text-sm aethel-font-medium aethel-text-slate-300 aethel-mb-2">Específico por plataforma</h4>
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

              <div className="aethel-space-y-6">
                <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
                  <div className="aethel-card aethel-p-6">
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                      <h3 className="aethel-text-lg aethel-font-semibold">Downloads em andamento</h3>
                      <span className="aethel-text-xs aethel-text-slate-400">{downloads.length} ativos</span>
                    </div>
                    {downloads.length === 0 ? (
                      <p className="aethel-text-sm aethel-text-slate-500">Nenhum download ativo no momento.</p>
                    ) : (
                      <div className="aethel-space-y-4">
                        {downloads.map(download => (
                          <div key={download.id} className="aethel-rounded-lg aethel-bg-slate-900/60 aethel-p-4">
                            <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                              <div className="aethel-flex aethel-flex-col">
                                <span className="aethel-text-sm aethel-font-medium aethel-text-white">
                                  {download.filename || download.url}
                                </span>
                                <span className="aethel-text-xs aethel-text-slate-400">
                                  {formatBytes(download.downloaded)} / {formatBytes(download.total)}
                                </span>
                              </div>
                              <div className="aethel-flex aethel-items-center aethel-gap-3">
                                <span className="aethel-text-xs aethel-text-slate-400">{download.status}</span>
                                {download.status === 'downloading' && (
                                  <button
                                    onClick={() => cancelDownload(download.id)}
                                    className="aethel-button aethel-button-ghost aethel-text-xs"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="aethel-h-2 aethel-bg-slate-800 aethel-rounded-full">
                              <div
                                className="aethel-h-2 aethel-rounded-full aethel-bg-blue-500"
                                style={{ width: `${Math.min(100, Math.max(0, download.progress))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="aethel-card aethel-p-6">
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                      <h3 className="aethel-text-lg aethel-font-semibold">Exportações</h3>
                      <span className="aethel-text-xs aethel-text-slate-400">{exportJobs.length} jobs</span>
                    </div>
                    {exportJobs.length === 0 ? (
                      <p className="aethel-text-sm aethel-text-slate-500">Nenhum job de exportação ativo.</p>
                    ) : (
                      <div className="aethel-space-y-4">
                        {exportJobs.map(job => (
                          <div key={job.id} className="aethel-rounded-lg aethel-bg-slate-900/60 aethel-p-4">
                            <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-2">
                              <div>
                                <div className="aethel-text-sm aethel-font-medium aethel-text-white">{job.type}</div>
                                <div className="aethel-text-xs aethel-text-slate-400">
                                  {new Date(job.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                              <span className="aethel-text-xs aethel-text-slate-400">{job.status}</span>
                            </div>
                            <div className="aethel-h-2 aethel-bg-slate-800 aethel-rounded-full">
                              <div
                                className="aethel-h-2 aethel-rounded-full aethel-bg-emerald-500"
                                style={{ width: `${Math.min(100, Math.max(0, job.progress ?? 0))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-3">Fila de renderização</h3>
                  <RenderQueue jobs={renderJobs} onCancel={cancelRender} />
                </div>
              </div>

              <div className="aethel-text-center aethel-mt-8">
                <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-6 aethel-max-w-2xl aethel-mx-auto">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-3">Início rápido</h3>
                  <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-4 aethel-text-sm">
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-blue-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">1</div>
                    Baixar e instalar
                    </div>
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-blue-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">2</div>
                    Conectar ao backend
                    </div>
                    <div className="aethel-text-center">
                    <div className="aethel-w-8 aethel-h-8 aethel-bg-blue-600 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center aethel-mx-auto aethel-mb-2 aethel-text-white aethel-font-bold">3</div>
                    Começar a criar
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Modelos de workflow</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Acelere seus projetos com modelos de workflow prontos. Arraste e solte para personalizar seus pipelines com IA.
                </p>
              </div>

              <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 lg:aethel-grid-cols-3 aethel-gap-6">
                {workflowTemplates.map(template => {
                  const category = String(template.category || '').toLowerCase()
                  const categoryClass =
                    category.includes('desenvolvimento') || category.includes('development')
                      ? 'aethel-bg-blue-500/20 aethel-text-blue-400'
                      : category.includes('ciência') || category.includes('data')
                      ? 'aethel-bg-green-500/20 aethel-text-green-400'
                      : category.includes('criativo') || category.includes('creative')
                      ? 'aethel-bg-cyan-500/20 aethel-text-cyan-400'
                      : 'aethel-bg-orange-500/20 aethel-text-orange-400'

                  return (
                  <div key={template.id} className="aethel-card aethel-p-6 hover:aethel-shadow-xl aethel-transition aethel-cursor-pointer group">
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
                      <div className={`aethel-w-12 aethel-h-12 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center ${categoryClass}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded-full aethel-bg-slate-700 aethel-text-slate-300">
                        {template.category}
                      </span>
                    </div>
                    <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-2 group-hover:aethel-text-blue-400 aethel-transition">
                      {template.name}
                    </h3>
                    <p className="aethel-text-slate-400 aethel-text-sm aethel-mb-4">
                      {template.description}
                    </p>
                    <button className="aethel-button aethel-button-primary aethel-w-full group-hover:aethel-bg-blue-600 aethel-transition">
                      Usar template
                    </button>
                  </div>
                )})}
              </div>
            </div>
          )}

          {activeTab === 'use-cases' && (
            <div className="aethel-p-6 aethel-space-y-6">
              <div className="aethel-text-center">
                <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Casos de uso da comunidade</h2>
                <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
                  Veja como a comunidade Aethel está criando coisas incríveis. Inspire-se e compartilhe suas criações.
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
                      <span className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded-full aethel-bg-blue-500/20 aethel-text-blue-400">
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
                    <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2 group-hover:aethel-text-blue-400 aethel-transition">
                      {useCase.title}
                    </h3>
                    <p className="aethel-text-slate-400 aethel-text-sm aethel-mb-3">
                      {useCase.description}
                    </p>
                    <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-3">
                      <span className="aethel-text-xs aethel-text-slate-500">por {useCase.sharedBy}</span>
                      <div className="aethel-flex aethel-gap-1">
                        {useCase.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="aethel-text-xs aethel-px-2 aethel-py-1 aethel-rounded aethel-bg-slate-700 aethel-text-slate-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="aethel-button aethel-button-secondary aethel-w-full group-hover:aethel-bg-slate-600 aethel-transition">
                      Ver estudo de caso
                    </button>
                  </div>
                ))}
              </div>

              <div className="aethel-text-center aethel-mt-8">
                <div className="aethel-bg-slate-800 aethel-rounded-lg aethel-p-6 aethel-max-w-2xl aethel-mx-auto">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Compartilhe seu sucesso</h3>
                  <p className="aethel-text-slate-400 aethel-mb-4">
                    Criou algo incrível com Aethel? Compartilhe seu caso de uso com a comunidade e inspire outras pessoas!
                  </p>
                  <button className="aethel-button aethel-button-primary">Compartilhar caso de uso</button>
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
