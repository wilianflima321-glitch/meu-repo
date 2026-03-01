'use client'

import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import useSWR, { useSWRConfig } from 'swr'
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  AethelAPIClient,
  type BillingPlan,
  type ChatMessage,
  type CopilotWorkflowSummary,
  type ConnectivityResponse,
  type PurchaseIntentResponse,
  type TransferResponse,
  type WalletSummary,
} from '@/lib/api'
import { analytics } from '@/lib/analytics'
import { isAuthenticated } from '@/lib/auth'
import { useAssetDownload } from '@/hooks/useAethelGateway'
import {
  type ActiveTab,
  type DashboardSettings,
  type Project,
  type SessionFilter,
  type ToastState,
  type ToastType,
  type UseCase,
  type WorkflowTemplate,
  STORAGE_KEYS,
  clearStoredDashboardState,
  resolveStoredActiveTab,
  resolveStoredChatHistory,
  resolveStoredSessions,
  resolveStoredSettings,
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
  formatConnectivityStatus as formatConnectivityStatusLabel,
  formatCurrencyLabel,
  formatStatusLabel,
  getScopedKeys,
} from './dashboard/aethel-dashboard-defaults'
import { createInitialSessionEntry, filterSessionHistory } from './dashboard/aethel-dashboard-session-utils'
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
import { DashboardOverviewTab } from './dashboard/DashboardOverviewTab'
import { DashboardProjectsTab } from './dashboard/DashboardProjectsTab'
import { DashboardAIChatTab } from './dashboard/DashboardAIChatTab'
import { DashboardWalletTab } from './dashboard/DashboardWalletTab'
import { DashboardConnectivityTab } from './dashboard/DashboardConnectivityTab'
import { DashboardContentCreationTab } from './dashboard/DashboardContentCreationTab'
import { DashboardUnrealTab } from './dashboard/DashboardUnrealTab'
import BillingTab from './dashboard/tabs/BillingTab'
import DownloadTab from './dashboard/tabs/DownloadTab'
import TemplatesTab from './dashboard/tabs/TemplatesTab'
import UseCasesTab from './dashboard/tabs/UseCasesTab'
import AdminTab from './dashboard/tabs/AdminTab'
import AgentCanvasTab from './dashboard/tabs/AgentCanvasTab'

const DEFAULT_SETTINGS: DashboardSettings = {
  theme: 'dark',
  autoSave: true,
  notifications: true,
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const FIRST_VALUE_GUIDE_DISMISSED_KEY = 'aethel.dashboard.first-value.dismissed'

type AdvancedProfile = {
  qualityMode: 'standard' | 'delivery' | 'studio'
  agentCount: 1 | 2 | 3
  enableWebResearch: boolean
}

function getProjectIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('projectId')
  return value && value.trim() ? value.trim() : null
}

function getMissionFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('mission')
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = window.localStorage.getItem('aethel-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function coerceActiveTab(raw: string | null): ActiveTab {
  if (raw === 'chat') return 'ai-chat'
  return resolveStoredActiveTab(raw)
}

function extractApiContent(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    return (
      parsed?.message?.content ||
      parsed?.choices?.[0]?.message?.content ||
      parsed?.message ||
      parsed?.output?.text ||
      raw
    )
  } catch {
    return raw
  }
}

function extractApiError(raw: string, status: number): { code: string; message: string; capabilityStatus?: string } {
  try {
    const parsed = JSON.parse(raw)
    return {
      code: typeof parsed?.error === 'string' ? parsed.error : status === 501 ? 'NOT_IMPLEMENTED' : 'AI_REQUEST_FAILED',
      message: typeof parsed?.message === 'string' ? parsed.message : raw || `HTTP ${status}`,
      capabilityStatus: typeof parsed?.capabilityStatus === 'string' ? parsed.capabilityStatus : undefined,
    }
  } catch {
    return {
      code: status === 501 ? 'NOT_IMPLEMENTED' : 'AI_REQUEST_FAILED',
      message: raw || `HTTP ${status}`,
    }
  }
}

function isAgentGateError(code: string): boolean {
  return code === 'FEATURE_NOT_ALLOWED' || code === 'AGENTS_LIMIT_EXCEEDED'
}

function inferAdvancedProfile(message: string): AdvancedProfile {
  const lower = message.toLowerCase()
  const deepAudit = ['auditoria', 'triagem', 'benchmark', 'research', 'arquitetura', 'studio'].some((token) => lower.includes(token))
  if (deepAudit) {
    return { qualityMode: 'studio', agentCount: 3, enableWebResearch: true }
  }
  const implementation = ['implemente', 'implement', 'corrija', 'refactor', 'fix', 'build', 'deploy'].some((token) =>
    lower.includes(token)
  )
  if (implementation) {
    return { qualityMode: 'delivery', agentCount: 2, enableWebResearch: false }
  }
  return { qualityMode: 'standard', agentCount: 1, enableWebResearch: false }
}

export default function AethelDashboard() {
  const { mutate } = useSWRConfig()

  const [workflowTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES)
  const [useCases] = useState<UseCase[]>(DEFAULT_USE_CASES)
  const [showToast, setShowToast] = useState<ToastState | null>(null)
  const [sessionHistory, setSessionHistory] = useState(() => {
    if (typeof window === 'undefined') return []
    return resolveStoredSessions(window.localStorage.getItem(STORAGE_KEYS.sessionHistory))
  })
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window === 'undefined') return 'overview'
    return coerceActiveTab(window.localStorage.getItem(STORAGE_KEYS.activeTab))
  })
  const [aiActivity, setAiActivity] = useState('Ocioso')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return []
    return resolveStoredChatHistory(window.localStorage.getItem(STORAGE_KEYS.chatHistory))
  })
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null)
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null)
  const [copilotProjectId, setCopilotProjectId] = useState<string | null>(null)
  const [copilotWorkflows, setCopilotWorkflows] = useState<CopilotWorkflowSummary[]>([])
  const [copilotWorkflowsLoading, setCopilotWorkflowsLoading] = useState(false)
  const [connectFromWorkflowId, setConnectFromWorkflowId] = useState('')
  const [connectBusy, setConnectBusy] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [livePreviewSuggestions, setLivePreviewSuggestions] = useState<string[]>([])
  const [selectedPreviewPoint, setSelectedPreviewPoint] = useState<THREE.Vector3 | null>(null)
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }
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
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)
  const [aiProviderGate, setAiProviderGate] = useState<{ message: string; capabilityStatus?: string } | null>(null)
  const [missionSeedLoaded, setMissionSeedLoaded] = useState(false)
  const [firstValueAiSuccess, setFirstValueAiSuccess] = useState(false)
  const [firstValueOpenedIde, setFirstValueOpenedIde] = useState(false)
  const [showFirstValueGuide, setShowFirstValueGuide] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(FIRST_VALUE_GUIDE_DISMISSED_KEY) !== '1'
  })
  const [isTrialActive] = useState(true)
  const trialDaysLeft = 14
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [hasToken, setHasToken] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  const { startDownload } = useAssetDownload()

  const walletKey = hasToken ? WALLET_KEY : null
  const currentPlanKey = hasToken ? CURRENT_PLAN_KEY : null
  const creditsKey = hasToken ? CREDITS_KEY : null
  const connectivityKey = hasToken ? CONNECTIVITY_KEY : null

  const { data: healthData, error: healthError } = useSWR(HEALTH_KEY, () => AethelAPIClient.health(), {
    revalidateOnFocus: false,
  })

  const { data: billingData, error: billingError } = useSWR<BillingPlan[]>(
    BILLING_PLANS_KEY,
    () => AethelAPIClient.getBillingPlans(),
    { revalidateOnFocus: false }
  )

  const { data: walletData, error: walletError, mutate: mutateWallet } = useSWR<WalletSummary>(walletKey, () => AethelAPIClient.getWalletSummary(), {
    refreshInterval: 30000,
  })

  const { data: currentPlan } = useSWR(currentPlanKey, () => AethelAPIClient.getCurrentPlan())
  const { data: creditsData, mutate: mutateCredits } = useSWR(creditsKey, () => AethelAPIClient.getCredits())
  const { data: connectivityData, error: connectivityError, mutate: mutateConnectivity } = useSWR<ConnectivityResponse>(
    connectivityKey,
    () => AethelAPIClient.getConnectivityStatus(),
    { refreshInterval: 30000 }
  )

  const walletTransactions = useMemo(() => walletData?.transactions ?? [], [walletData])
  const creditEntries = useMemo(() => getCreditEntries(walletTransactions), [walletTransactions])
  const walletStats = useMemo(() => computeWalletUsageStats(walletTransactions), [walletTransactions])
  const receivableSummary = useMemo(() => computeReceivableSummary(creditEntries), [creditEntries])
  const connectivityServices = useMemo(() => connectivityData?.services ?? [], [connectivityData])
  const lastWalletUpdate = useMemo(() => getLastWalletUpdate(walletTransactions), [walletTransactions])
  const walletLoading = hasToken && !walletData && !walletError
  const connectivityLoading = hasToken && !connectivityData && !connectivityError
  const filteredSessions = useMemo(() => filterSessionHistory(sessionHistory, sessionFilter), [sessionHistory, sessionFilter])
  const backendOnline = useMemo(() => {
    if (healthError) return false
    if (!healthData) return true
    const status = String((healthData as { status?: string }).status ?? '').toLowerCase()
    return status === '' || status === 'ok' || status === 'healthy' || status === 'online'
  }, [healthData, healthError])
  const authErrorText = authReady && !hasToken ? 'Sessao nao autenticada para recursos privados.' : null
  const billingErrorText = billingError ? mapSubscribeError(billingError) : null

  const billingPlansForUI = useMemo(() => {
    if (!billingData) return []
    return billingData.map(plan => ({
      id: String(plan.id),
      name: plan.name,
      description: plan.description ?? '',
      price: plan.priceBRL ?? plan.price ?? 0,
      currency: plan.currency ?? 'BRL',
      interval: String(plan.interval).toLowerCase().includes('year') || String(plan.interval).toLowerCase().includes('ano') ? 'year' : 'month',
      features: plan.features ?? [],
      popular: plan.popular ?? false,
      limits: {
        requests: 'unlimited' as const,
        projects: 'unlimited' as const,
        storage: '100GB',
        collaborators: 'unlimited' as const,
      },
    }))
  }, [billingData])

  const trackEvent = useCallback((category: any, action: any, metadata?: Record<string, unknown>) => {
    analytics?.track?.(category, action, { metadata })
  }, [])

  const showToastMessage = useCallback((message: string, type: ToastType = 'info') => {
    setShowToast({ message, type })
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setShowToast(null), 3000)
    }
  }, [])

  const dismissFirstValueGuide = useCallback(() => {
    setShowFirstValueGuide(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FIRST_VALUE_GUIDE_DISMISSED_KEY, '1')
    }
  }, [])

  const persistCopilotScope = useCallback((workflowId: string | null, threadId: string | null) => {
    if (typeof window === 'undefined') return
    const keys = getScopedKeys(copilotProjectId)
    if (workflowId) window.localStorage.setItem(keys.workflowKey, workflowId)
    else window.localStorage.removeItem(keys.workflowKey)
    if (threadId) window.localStorage.setItem(keys.chatThreadKey, threadId)
    else window.localStorage.removeItem(keys.chatThreadKey)
  }, [copilotProjectId])

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.activeTab, tab)
    }
    trackEvent('user', 'settings_change', { section: 'dashboard-tab', tab })
  }, [trackEvent])

  const handleOpenProviderSettings = useCallback(() => {
    setSidebarOpen(false)
    setActiveTab('admin')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.activeTab, 'admin')
    }
    trackEvent('ai', 'ai_error', { source: 'provider-gate', action: 'open-admin-apis' })
  }, [trackEvent])

  const handleOpenIdeLivePreview = useCallback(() => {
    if (typeof window === 'undefined') return
    setFirstValueOpenedIde(true)
    const params = new URLSearchParams()
    params.set('entry', 'live-preview')
    if (copilotProjectId) params.set('projectId', copilotProjectId)
    window.location.assign(`/ide?${params.toString()}`)
  }, [copilotProjectId])

  const handleResetDashboard = useCallback(() => {
    clearStoredDashboardState()
    setSessionHistory([])
    setSessionFilter('all')
    setActiveTab('overview')
    setChatHistory([])
    setChatMessage('')
    setLivePreviewSuggestions([])
    setSettings({ ...DEFAULT_SETTINGS })
    setProjects(DEFAULT_PROJECTS)
    setActiveWorkflowId(null)
    setActiveChatThreadId(null)
    setConnectFromWorkflowId('')
    persistCopilotScope(null, null)
    showToastMessage('Painel redefinido para o baseline.', 'info')
  }, [persistCopilotScope, showToastMessage])

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }))
  }, [])

  const handleCreateNewSession = useCallback(() => {
    setSessionHistory((prev) => [createInitialSessionEntry(prev.length, settings), ...prev].slice(0, 20))
    setChatHistory([])
    setLivePreviewSuggestions([])
    setChatMessage('')
    setActiveWorkflowId(null)
    setActiveChatThreadId(null)
    setConnectFromWorkflowId('')
    persistCopilotScope(null, null)
    showToastMessage('Nova sessao iniciada.', 'success')
    trackEvent('project', 'project_open', { source: 'dashboard-session' })
  }, [settings, persistCopilotScope, showToastMessage, trackEvent])

  const handleCreateProject = useCallback(() => {
    const value = newProjectName.trim()
    if (!value) {
      showToastMessage('Defina um nome de projeto antes de criar.', 'error')
      return
    }

    const project = createProjectEntry(projects, value, newProjectType)
    setProjects(prev => [project, ...prev])
    setNewProjectName('')
    showToastMessage('Projeto criado com sucesso.', 'success')
    trackEvent('project', 'project_create', { type: newProjectType })
  }, [newProjectName, newProjectType, projects, showToastMessage, trackEvent])

  const handleDeleteProject = useCallback((id: number) => {
    setProjects(prev => removeProjectEntry(prev, id))
    showToastMessage('Projeto removido.', 'info')
    trackEvent('project', 'project_delete', { projectId: id })
  }, [showToastMessage, trackEvent])

  const handleProjectVersionChange = useCallback((versionId: string) => {
    if (!versionId) return
    showToastMessage(`Snapshot ${versionId} aplicado no workspace.`, 'info')
  }, [showToastMessage])

  const handleApplyDirectorNote = useCallback((title: string) => {
    setChatMessage(`Aplique a diretriz no projeto atual: ${title}`)
    setActiveTab('ai-chat')
    showToastMessage('Diretriz enviada para o Chat IA.', 'success')
  }, [showToastMessage])

  const handleDownload = useCallback((platform: string) => {
    startDownload(platform)
    showToastMessage(`Download iniciado para ${platform}.`, 'info')
  }, [startDownload, showToastMessage])

  const handleSubscribe = useCallback(async (planId: string) => {
    setSubscribingPlan(planId)
    setSubscribeError(null)

    try {
      const response = await AethelAPIClient.subscribe(planId)
      if (response.checkoutUrl && typeof window !== 'undefined') {
        window.open(response.checkoutUrl, '_blank', 'noopener,noreferrer')
      }
      showToastMessage(`Fluxo de assinatura iniciado para ${planId}.`, 'success')
      void mutate(CURRENT_PLAN_KEY)
    } catch (err) {
      setSubscribeError(mapSubscribeError(err))
    } finally {
      setSubscribingPlan(null)
    }
  }, [mutate, showToastMessage])

  const handleManageSubscription = useCallback(() => {
    handleTabChange('billing')
  }, [handleTabChange])

  const handlePurchase = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setWalletSubmitting(true)
    setWalletActionError(null)
    setWalletActionMessage(null)

    const validationError = validatePurchaseInput(hasToken, purchaseForm.amount)
    if (validationError) {
      setWalletActionError(validationError)
      setWalletSubmitting(false)
      return
    }
    const amount = parsePositiveInteger(purchaseForm.amount)
    if (!amount) {
      setWalletActionError('Informe um valor de creditos valido.')
      setWalletSubmitting(false)
      return
    }

    try {
      const response = await AethelAPIClient.createPurchaseIntent({
        amount,
        currency: normalizeCurrencyCode(purchaseForm.currency),
        reference: purchaseForm.reference || undefined,
      })
      setLastPurchaseIntent(response)
      setWalletActionMessage(buildPurchaseSuccessMessage(response, formatCurrencyLabel))
      await mutateWallet()
      await mutateCredits()
    } catch (err) {
      setWalletActionError(mapPurchaseIntentError(err))
    } finally {
      setWalletSubmitting(false)
    }
  }, [hasToken, purchaseForm.amount, purchaseForm.currency, purchaseForm.reference, mutateWallet, mutateCredits])

  const handleTransfer = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setWalletSubmitting(true)
    setWalletActionError(null)
    setWalletActionMessage(null)

    const validationError = validateTransferInput(hasToken, transferForm.amount, transferForm.targetUserId)
    if (validationError) {
      setWalletActionError(validationError)
      setWalletSubmitting(false)
      return
    }
    const amount = parsePositiveInteger(transferForm.amount)
    if (!amount) {
      setWalletActionError('Valor da transferencia invalido.')
      setWalletSubmitting(false)
      return
    }

    try {
      const response = await AethelAPIClient.transferCredits({
        target_user_id: transferForm.targetUserId.trim(),
        amount,
        currency: normalizeCurrencyCode(transferForm.currency),
        reference: transferForm.reference || undefined,
      })
      setLastTransferReceipt(response)
      setWalletActionMessage(buildTransferSuccessMessage(response, formatCurrencyLabel))
      await mutateWallet()
      await mutateCredits()
    } catch (err) {
      setWalletActionError(mapTransferError(err))
    } finally {
      setWalletSubmitting(false)
    }
  }, [hasToken, transferForm.amount, transferForm.currency, transferForm.reference, transferForm.targetUserId, mutateWallet, mutateCredits])

  const handleRefreshWallet = useCallback(() => {
    if (!hasToken) return
    void mutateWallet()
    void mutateCredits()
  }, [hasToken, mutateWallet, mutateCredits])

  const handleRefreshConnectivity = useCallback(() => {
    if (!hasToken) return
    void mutateConnectivity()
  }, [hasToken, mutateConnectivity])

  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = workflowTemplates.find((item) => item.id === templateId)
    if (!template) return
    setChatMessage(`Aplicar template "${template.name}" com os passos:\n- ${template.steps.join('\n- ')}`)
    setActiveTab('ai-chat')
    showToastMessage(`Template "${template.name}" carregado no chat.`, 'success')
  }, [workflowTemplates, showToastMessage])

  const handleUseCaseSelect = useCallback((useCaseId: string) => {
    const selected = useCases.find((item) => item.id === useCaseId)
    if (!selected) return
    setChatMessage(`Iniciar caso de uso "${selected.name}" focando em: ${selected.features.join(', ')}.`)
    setActiveTab('ai-chat')
    showToastMessage(`Caso de uso "${selected.name}" preparado.`, 'success')
  }, [useCases, showToastMessage])

  const handleCreateWorkflow = useCallback(() => {
    void (async () => {
      setConnectBusy(true)
      try {
        const thread = await AethelAPIClient.createChatThread({
          title: buildWorkflowTitle('Chat'),
          projectId: copilotProjectId ?? undefined,
        })
        const created = await AethelAPIClient.createCopilotWorkflow({
          title: buildWorkflowTitle('Workflow'),
          projectId: copilotProjectId ?? undefined,
          chatThreadId: thread.thread.id,
        })
        setCopilotWorkflows((prev) => [created.workflow, ...prev])
        const workflowId = String(created.workflow.id)
        const threadId = String(created.workflow.chatThreadId ?? thread.thread.id)
        setActiveWorkflowId(workflowId)
        setActiveChatThreadId(threadId)
        setConnectFromWorkflowId('')
        persistCopilotScope(workflowId, threadId)
      } catch (error) {
        showToastMessage('Falha ao criar workflow.', 'error')
      } finally {
        setConnectBusy(false)
      }
    })()
  }, [copilotProjectId, persistCopilotScope, showToastMessage])

  const handleSelectWorkflow = useCallback((workflowId: string) => {
    const workflow = copilotWorkflows.find((item) => String(item.id) === String(workflowId))
    const threadId = workflow?.chatThreadId ? String(workflow.chatThreadId) : null
    setActiveWorkflowId(workflowId)
    setActiveChatThreadId(threadId)
    persistCopilotScope(workflowId, threadId)
  }, [copilotWorkflows, persistCopilotScope])

  const handleRenameWorkflow = useCallback(() => {
    if (!activeWorkflowId) return
    void (async () => {
      setConnectBusy(true)
      try {
        const response = await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, {
          title: buildWorkflowTitle('Workflow'),
        })
        const updated = response.workflow
        setCopilotWorkflows((prev) =>
          prev.map((workflow) => (String(workflow.id) === String(activeWorkflowId) ? updated : workflow))
        )
        showToastMessage('Workflow renomeado com sucesso.', 'success')
      } catch (error) {
        showToastMessage('Falha ao renomear workflow.', 'error')
      } finally {
        setConnectBusy(false)
      }
    })()
  }, [activeWorkflowId, showToastMessage])

  const handleArchiveWorkflow = useCallback(() => {
    if (!activeWorkflowId) return
    void (async () => {
      setConnectBusy(true)
      try {
        await AethelAPIClient.updateCopilotWorkflow(activeWorkflowId, { archived: true })
        const remaining = copilotWorkflows.filter((workflow) => String(workflow.id) !== String(activeWorkflowId))
        setCopilotWorkflows(remaining)
        const next = remaining[0]
        const nextWorkflowId = next ? String(next.id) : null
        const nextThreadId = next?.chatThreadId ? String(next.chatThreadId) : null
        setActiveWorkflowId(nextWorkflowId)
        setActiveChatThreadId(nextThreadId)
        persistCopilotScope(nextWorkflowId, nextThreadId)
      } catch (error) {
        showToastMessage('Falha ao arquivar workflow.', 'error')
      } finally {
        setConnectBusy(false)
      }
    })()
  }, [activeWorkflowId, copilotWorkflows, persistCopilotScope, showToastMessage])

  const handleCopyHistory = useCallback(() => {
    void showToastMessage('Copiar historico segue disponivel no modo avancado da ide.', 'info')
  }, [showToastMessage])

  const handleImportContext = useCallback(() => {
    if (!activeWorkflowId || !connectFromWorkflowId) {
      showToastMessage('Selecione workflow origem e destino para importar contexto.', 'info')
      return
    }
    void (async () => {
      setConnectBusy(true)
      try {
        const source = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId)
        const patch = buildCopilotContextPatch(activeWorkflowId, source?.workflow?.context)
        if (!patch) {
          showToastMessage('Workflow fonte sem contexto util para importar.', 'info')
          return
        }
        const response = await fetch('/api/copilot/context', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            projectId: copilotProjectId,
            ...patch,
          }),
        })
        if (!response.ok) {
          throw new Error(await response.text().catch(() => 'Falha ao importar contexto.'))
        }
        showToastMessage('Contexto importado para o workflow ativo.', 'success')
      } catch (error) {
        showToastMessage('Falha ao importar contexto.', 'error')
      } finally {
        setConnectBusy(false)
      }
    })()
  }, [activeWorkflowId, connectFromWorkflowId, copilotProjectId, showToastMessage])

  const handleMergeWorkflow = useCallback(() => {
    if (!activeWorkflowId || !connectFromWorkflowId) {
      showToastMessage('Selecione workflow origem e destino para mesclar.', 'info')
      return
    }
    void (async () => {
      await Promise.all([Promise.resolve(handleCopyHistory()), Promise.resolve(handleImportContext())])
    })()
  }, [activeWorkflowId, connectFromWorkflowId, handleCopyHistory, handleImportContext, showToastMessage])

  const handleSendChatMessage = useCallback(() => {
    void (async () => {
      const message = chatMessage.trim()
      if (!message || isStreaming) return
      setAiProviderGate(null)
      const nextMessages = [...chatHistory, { role: 'user', content: message } as ChatMessage].slice(-200)
      setChatMessage('')
      setChatHistory(nextMessages)
      setIsStreaming(true)
      setAiActivity('Processando')
      try {
        const profile = inferAdvancedProfile(message)
        let response = await fetch('/api/ai/chat-advanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: nextMessages.map((item) => ({ role: item.role, content: item.content })),
            projectId: copilotProjectId ?? undefined,
            qualityMode: profile.qualityMode,
            agentCount: profile.agentCount,
            enableWebResearch: profile.enableWebResearch,
            includeTrace: true,
          }),
        })
        let raw = await response.text()
        if (!response.ok) {
          const parsed = extractApiError(raw, response.status)
          if (isAgentGateError(parsed.code) && profile.agentCount > 1) {
            response = await fetch('/api/ai/chat-advanced', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
              },
              body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: nextMessages.map((item) => ({ role: item.role, content: item.content })),
                projectId: copilotProjectId ?? undefined,
                qualityMode: profile.qualityMode,
                agentCount: 1,
                enableWebResearch: false,
                includeTrace: true,
              }),
            })
            raw = await response.text()
          }
        }
        if (!response.ok) {
          const parsed = extractApiError(raw, response.status)
          const isProviderGate =
            parsed.code === 'NOT_IMPLEMENTED' || parsed.capabilityStatus === 'NOT_IMPLEMENTED'
          const userMessage = isProviderGate
            ? `${parsed.message} Configure um provider em /admin/apis para liberar o chat.`
            : `${parsed.code}: ${parsed.message}`
          if (isProviderGate) {
            setAiProviderGate({
              message: parsed.message,
              capabilityStatus: parsed.capabilityStatus,
            })
          }
          throw new Error(userMessage)
        }
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: extractApiContent(raw) || 'Resposta vazia do modelo.',
        }
        setChatHistory((prev) => [...prev, assistantMessage].slice(-200))
        setFirstValueAiSuccess(true)
        setAiActivity('Ativo')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Falha na chamada de IA.'
        setChatHistory((prev) => [...prev, { role: 'assistant', content: errorMessage } as ChatMessage].slice(-200))
        setAiActivity('Erro')
      } finally {
        setIsStreaming(false)
      }
    })()
  }, [chatMessage, isStreaming, chatHistory, copilotProjectId])

  const handleMagicWandSelect = useCallback((position: THREE.Vector3) => {
    setSelectedPreviewPoint(position.clone())
    if (!activeWorkflowId) return
    const payload = buildLivePreviewContextPayload(activeWorkflowId, position)
    void fetch('/api/copilot/context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        projectId: copilotProjectId,
        ...payload,
      }),
    })
  }, [activeWorkflowId, copilotProjectId])

  const handleSendLivePreviewSuggestion = useCallback(async (suggestion: string) => {
    const normalized = suggestion.trim()
    if (!normalized || isGenerating) return
    setIsGenerating(true)
    setLivePreviewSuggestions((prev) => [normalized, ...prev].slice(0, 10))
    try {
      const prompt = selectedPreviewPoint ? `${buildLivePreviewPrompt(selectedPreviewPoint)}\n\nPedido do usuario: ${normalized}` : normalized
      const response = await fetch('/api/ai/chat-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [buildLivePreviewSystemMessage(), { role: 'user', content: prompt }],
          projectId: copilotProjectId ?? undefined,
          qualityMode: 'delivery',
          agentCount: 1,
          enableWebResearch: false,
        }),
      })
      const raw = await response.text()
      if (!response.ok) {
        throw new Error(extractApiError(raw, response.status).message)
      }
      const parsed = extractPrimaryAssistantContent(JSON.parse(raw)) || extractApiContent(raw)
      const finalSuggestion = parsed.trim() || normalized
      setLivePreviewSuggestions((prev) => [finalSuggestion, ...prev].slice(0, 10))
      setChatHistory((prev) => [...prev, buildLivePreviewSuggestionMessage(finalSuggestion)].slice(-200))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar sugestao.'
      setLivePreviewSuggestions((prev) => [`Erro: ${message}`, ...prev].slice(0, 10))
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, selectedPreviewPoint, copilotProjectId])

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])

  useEffect(() => {
    setAuthReady(true)
    setHasToken(isAuthenticated())
    setCopilotProjectId(getProjectIdFromLocation())
    trackEvent('engine', 'editor_open', { surface: 'dashboard' })
    analytics?.trackPageLoad?.('dashboard')
  }, [trackEvent])

  useEffect(() => {
    if (missionSeedLoaded || typeof window === 'undefined') return
    const mission = getMissionFromLocation()
    setMissionSeedLoaded(true)
    if (!mission) return
    setActiveTab('ai-chat')
    window.localStorage.setItem(STORAGE_KEYS.activeTab, 'ai-chat')
    setChatMessage((prev) => (prev.trim() ? prev : mission))
    setShowFirstValueGuide(true)
    trackEvent('ai', 'ai_chat', { source: 'dashboard-mission-seed' })
    showToastMessage('Missao carregada no Studio Home. Revise e envie para iniciar.', 'info')
  }, [missionSeedLoaded, showToastMessage, trackEvent])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-aethel-theme', settings.theme)
  }, [settings.theme])

  useEffect(() => {
    if (!hasToken || typeof window === 'undefined') return
    const keys = getScopedKeys(copilotProjectId)
    const storedWorkflow =
      window.localStorage.getItem(keys.workflowKey) ||
      window.localStorage.getItem(keys.legacyWorkflowKey)
    const storedThread =
      window.localStorage.getItem(keys.chatThreadKey) ||
      window.localStorage.getItem(keys.legacyChatThreadKey)

    if (storedWorkflow) {
      setActiveWorkflowId(storedWorkflow)
    }
    if (storedThread) {
      setActiveChatThreadId(storedThread)
    }
  }, [hasToken, copilotProjectId])

  useEffect(() => {
    if (!hasToken) {
      setCopilotWorkflows([])
      setActiveWorkflowId(null)
      setActiveChatThreadId(null)
      return
    }
    void (async () => {
      try {
        const response = await AethelAPIClient.listCopilotWorkflows({
          projectId: copilotProjectId ?? undefined,
          archived: false,
        })
        const workflows = extractCopilotWorkflowList(response)
        setCopilotWorkflows(workflows)
        if (workflows.length === 0) return
        const selected = workflows.find((workflow) => String(workflow.id) === String(activeWorkflowId)) ?? workflows[0]
        const selectedWorkflowId = String(selected.id)
        const selectedThreadId = selected.chatThreadId ? String(selected.chatThreadId) : null
        setActiveWorkflowId(selectedWorkflowId)
        setActiveChatThreadId(selectedThreadId)
        persistCopilotScope(selectedWorkflowId, selectedThreadId)
      } catch (error) {
        showToastMessage('Falha ao carregar workflows do Copilot.', 'error')
      }
    })()
  }, [hasToken, copilotProjectId, activeWorkflowId, persistCopilotScope, showToastMessage])

  useEffect(() => {
    if (!activeChatThreadId) return
    void (async () => {
      try {
        const result = await AethelAPIClient.getChatMessages(activeChatThreadId)
        setChatHistory(mapApiMessagesToChatHistory(result))
      } catch {
        setChatHistory([])
      }
    })()
  }, [activeChatThreadId])

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

  useEffect(() => {
    setAiActivity(isStreaming ? 'Processando' : filteredSessions.length > 0 ? 'Ativo' : 'Ocioso')
  }, [isStreaming, filteredSessions.length])

  if (!authReady) return null

  return (
    <div className={`aethel-min-h-screen aethel-flex aethel-flex-column ${settings.theme === 'dark' ? 'aethel-bg-slate-950 aethel-text-slate-50' : 'aethel-bg-slate-100 aethel-text-slate-900'}`}>
      {isTrialActive && (
        <TrialBanner daysLeft={trialDaysLeft} onUpgrade={() => handleTabChange('billing')} />
      )}

      <DashboardHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onResetDashboard={handleResetDashboard}
        onToggleTheme={handleToggleTheme}
        theme={settings.theme}
        backendOnline={backendOnline}
        authErrorText={authErrorText}
        billingErrorText={billingErrorText}
      />

      <div className="aethel-flex aethel-flex-1 aethel-overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fechar menu lateral"
            className="fixed inset-0 z-40 bg-slate-950/70 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <AethelDashboardSidebar
          sidebarOpen={sidebarOpen}
          activeTab={activeTab}
          sessionFilter={sessionFilter}
          onCreateNewSession={handleCreateNewSession}
          onSelectSessionFilter={setSessionFilter}
          onSelectTab={handleTabChange}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        <main className="aethel-flex-1 aethel-overflow-y-auto aethel-relative">
          {showFirstValueGuide && (
            <section className="aethel-m-4 aethel-p-4 aethel-rounded-lg border border-blue-500/30 bg-blue-500/10 md:aethel-m-6">
              <div className="aethel-flex aethel-flex-col md:aethel-flex md:aethel-flex-row md:aethel-items-center md:aethel-justify-between aethel-gap-3">
                <div>
                  <h3 className="aethel-text-sm aethel-font-semibold aethel-text-blue-200">Primeiro valor em menos de 2 minutos</h3>
                  <p className="aethel-text-xs aethel-text-slate-300 aethel-mt-1">
                    Crie um projeto, configure o provider de IA e abra o live preview da IDE com contexto completo.
                  </p>
                  <ul className="aethel-mt-2 aethel-space-y-1 text-[11px] text-slate-300">
                    <li>{projects.length > DEFAULT_PROJECTS.length ? '✓' : '○'} Primeiro projeto criado</li>
                    <li>{firstValueAiSuccess ? '✓' : '○'} Primeira resposta de IA recebida</li>
                    <li>{firstValueOpenedIde ? '✓' : '○'} IDE live preview aberta</li>
                  </ul>
                </div>
                <div className="aethel-flex aethel-flex-col sm:aethel-flex sm:aethel-flex-row aethel-gap-2">
                  <button type="button" onClick={() => handleTabChange('projects')} className="aethel-button aethel-button-primary aethel-text-xs">
                    Criar projeto
                  </button>
                  <button type="button" onClick={handleOpenProviderSettings} className="aethel-button aethel-button-secondary aethel-text-xs">
                    Configurar IA
                  </button>
                  <button type="button" onClick={handleOpenIdeLivePreview} className="aethel-button aethel-button-secondary aethel-text-xs">
                    Abrir IDE + Preview
                  </button>
                  <button type="button" onClick={dismissFirstValueGuide} className="aethel-button aethel-button-ghost aethel-text-xs">
                    Dispensar
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'overview' && (
            <DashboardOverviewTab
              aiActivity={aiActivity}
              projects={projects}
              livePreviewSuggestions={livePreviewSuggestions}
              authReady={authReady}
              hasToken={hasToken}
              onRefreshWallet={handleRefreshWallet}
              lastWalletUpdate={lastWalletUpdate}
              walletLoading={walletLoading}
              walletError={walletError as Error | null | undefined}
              walletData={walletData}
              walletTransactions={walletTransactions}
              formatCurrencyLabel={formatCurrencyLabel}
              connectivityData={connectivityData}
              connectivityLoading={connectivityLoading}
              connectivityError={connectivityError as Error | null | undefined}
              connectivityServices={connectivityServices}
              formatConnectivityStatus={formatConnectivityStatusLabel}
              miniPreviewExpanded={miniPreviewExpanded}
              onToggleMiniPreviewExpanded={() => setMiniPreviewExpanded((prev) => !prev)}
              onMagicWandSelect={handleMagicWandSelect}
              onSendSuggestion={handleSendLivePreviewSuggestion}
              isGenerating={isGenerating}
            />
          )}

          {activeTab === 'projects' && (
            <DashboardProjectsTab
              projects={projects}
              newProjectName={newProjectName}
              newProjectType={newProjectType}
              onDeleteProject={handleDeleteProject}
              onCreateProject={handleCreateProject}
              onProjectNameChange={setNewProjectName}
              onProjectTypeChange={setNewProjectType}
              onProjectVersionChange={handleProjectVersionChange}
              onApplyDirectorNote={handleApplyDirectorNote}
            />
          )}

          {activeTab === 'ai-chat' && (
            <DashboardAIChatTab
              chatMode={chatMode}
              onChatModeChange={setChatMode}
              chatHistory={chatHistory}
              chatMessage={chatMessage}
              onChatMessageChange={setChatMessage}
              onSendChatMessage={handleSendChatMessage}
              isStreaming={isStreaming}
              activeWorkflowId={activeWorkflowId}
              copilotWorkflows={copilotWorkflows}
              copilotWorkflowsLoading={copilotWorkflowsLoading}
              connectBusy={connectBusy}
              connectFromWorkflowId={connectFromWorkflowId}
              onCreateWorkflow={handleCreateWorkflow}
              onSelectWorkflow={handleSelectWorkflow}
              onRenameWorkflow={handleRenameWorkflow}
              onArchiveWorkflow={handleArchiveWorkflow}
              onConnectFromWorkflowChange={setConnectFromWorkflowId}
              onCopyHistory={handleCopyHistory}
              onImportContext={handleImportContext}
              onMergeWorkflow={handleMergeWorkflow}
              providerSetupGate={aiProviderGate}
              onOpenProviderSettings={handleOpenProviderSettings}
            />
          )}

          {activeTab === 'wallet' && (
            <DashboardWalletTab
              authReady={authReady}
              hasToken={hasToken}
              walletLoading={walletLoading}
              walletError={walletError}
              walletData={walletData}
              walletTransactions={walletTransactions}
              creditsInfo={creditsData}
              creditsUsedToday={walletStats.creditsUsedToday}
              creditsUsedThisMonth={walletStats.creditsUsedThisMonth}
              creditsReceivedThisMonth={walletStats.creditsReceivedThisMonth}
              lastWalletUpdate={lastWalletUpdate}
              lastPurchaseIntent={lastPurchaseIntent}
              lastTransferReceipt={lastTransferReceipt}
              walletActionMessage={walletActionMessage}
              walletActionError={walletActionError}
              purchaseForm={purchaseForm}
              transferForm={transferForm}
              walletSubmitting={walletSubmitting}
              creditEntries={creditEntries}
              receivableSummary={receivableSummary}
              onRefreshWallet={handleRefreshWallet}
              onPurchaseIntentSubmit={handlePurchase}
              onTransferSubmit={handleTransfer}
              setPurchaseForm={setPurchaseForm}
              setTransferForm={setTransferForm}
              formatCurrencyLabel={formatCurrencyLabel}
              formatStatusLabel={formatStatusLabel}
            />
          )}

          {activeTab === 'billing' && (
            <div className="aethel-p-6">
              <BillingTab
                plans={billingPlansForUI}
                currentPlan={currentPlan?.id}
                loading={!billingData && !billingError}
                onSelectPlan={handleSubscribe}
                onManageSubscription={handleManageSubscription}
              />
              {subscribeError && <p className="aethel-mt-4 aethel-text-sm aethel-text-red-400">{subscribeError}</p>}
              {subscribingPlan && <p className="aethel-mt-2 aethel-text-xs aethel-text-slate-400">Processando plano {subscribingPlan}...</p>}
            </div>
          )}

          {activeTab === 'connectivity' && (
            <DashboardConnectivityTab
              connectivityLoading={connectivityLoading}
              connectivityError={connectivityError}
              connectivityData={connectivityData}
              connectivityServices={connectivityServices}
              onRefreshConnectivity={handleRefreshConnectivity}
              formatConnectivityStatus={formatConnectivityStatusLabel}
            />
          )}

          {activeTab === 'content-creation' && <DashboardContentCreationTab />}

          {activeTab === 'unreal' && <DashboardUnrealTab />}

          {activeTab === 'download' && <DownloadTab onDownload={handleDownload} />}

          {activeTab === 'templates' && (
            <TemplatesTab templates={workflowTemplates} onSelect={handleTemplateSelect} />
          )}

          {activeTab === 'use-cases' && (
            <UseCasesTab useCases={useCases} onSelect={handleUseCaseSelect} />
          )}

          {activeTab === 'admin' && <AdminTab />}

          {activeTab === 'agent-canvas' && (
            <AgentCanvasTab
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
            />
          )}
        </main>
      </div>

      {showToast && (
        <div className={`aethel-fixed aethel-bottom-6 aethel-right-6 aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-shadow-lg aethel-z-50 aethel-animate-in aethel-slide-in-from-bottom-4 ${
          showToast.type === 'success'
            ? 'aethel-bg-emerald-600'
            : showToast.type === 'error'
              ? 'aethel-bg-red-600'
              : 'aethel-bg-blue-600'
        }`}>
          {showToast.message}
        </div>
      )}
    </div>
  )
}
