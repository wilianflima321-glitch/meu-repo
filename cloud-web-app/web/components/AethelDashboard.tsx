'use client'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
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
import {
  AdvancedChatRequestError,
  isProviderSetupError,
  requestAdvancedChat,
} from '@/lib/ai-chat-advanced-client'
import {
  buildAiProviderGateMessage,
  fetchAiProviderStatus,
} from '@/lib/ai-provider-status-client'
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
  extractApiContent,
  getAuthHeaders,
  getProjectIdFromLocation,
} from './dashboard/aethel-dashboard-location-utils'
import { resolveIdeHandoffParams } from './dashboard/aethel-dashboard-ide-handoff'
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
import { DashboardMainContent } from './dashboard/DashboardMainContent'
import {
  DASHBOARD_DEFAULT_SETTINGS,
  PREVIEW_RUNTIME_URL_STORAGE_KEY,
  type FullAccessResponse,
  type Point3,
} from './dashboard/aethel-dashboard-core-types'
import { DashboardLoadingScreen } from './dashboard/DashboardLoadingScreen'
import { DashboardToast } from './dashboard/DashboardToast'
import { useFirstValueTracking } from './dashboard/useFirstValueTracking'
import { useDashboardMissionSeed } from './dashboard/useDashboardMissionSeed'
import { useDashboardStoragePersistence } from './dashboard/useDashboardStoragePersistence'
import {
  getInitialActiveTab,
  getInitialChatHistory,
  getInitialFirstValueGuideState,
  getInitialSessionHistory,
  getInitialSettings,
} from './dashboard/aethel-dashboard-initial-state'
const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite-preview'
const FIRST_VALUE_GUIDE_DISMISSED_KEY = 'aethel.dashboard.first-value.dismissed'

export default function AethelDashboard() {
  const { mutate } = useSWRConfig()

  const [workflowTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES)
  const [useCases] = useState<UseCase[]>(DEFAULT_USE_CASES)
  const [showToast, setShowToast] = useState<ToastState | null>(null)
  const [sessionHistory, setSessionHistory] = useState(getInitialSessionHistory)
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialActiveTab)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(getInitialChatHistory)
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null)
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null)
  const [copilotProjectId, setCopilotProjectId] = useState<string | null>(null)
  const [copilotWorkflows, setCopilotWorkflows] = useState<CopilotWorkflowSummary[]>([])
  const [copilotWorkflowsLoading, setCopilotWorkflowsLoading] = useState(false)
  const [connectFromWorkflowId, setConnectFromWorkflowId] = useState('')
  const [connectBusy, setConnectBusy] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [livePreviewSuggestions, setLivePreviewSuggestions] = useState<string[]>([])
  const [selectedPreviewPoint, setSelectedPreviewPoint] = useState<Point3 | null>(null)
  const [settings, setSettings] = useState<DashboardSettings>(getInitialSettings)
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
  const [aiProviderGate, setAiProviderGate] = useState<{ message: string; capabilityStatus?: string; setupUrl?: string } | null>(null)
  const [firstValueAiSuccess, setFirstValueAiSuccess] = useState(false)
  const [firstValueOpenedIde, setFirstValueOpenedIde] = useState(false)
  const [fullAccessBusy, setFullAccessBusy] = useState(false)
  const [showFirstValueGuide, setShowFirstValueGuide] = useState(() =>
    getInitialFirstValueGuideState(FIRST_VALUE_GUIDE_DISMISSED_KEY)
  )
  const chatAbortRef = useRef<AbortController | null>(null)
  const [isTrialActive] = useState(true)
  const [showTrialBanner, setShowTrialBanner] = useState(true)
  const trialDaysLeft = 14
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

  const { data: fullAccessData, mutate: mutateFullAccess } = useSWR<FullAccessResponse>(
    hasToken ? '/api/studio/access/full' : null,
    async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      })
      const payload = (await response.json().catch(() => ({}))) as FullAccessResponse
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
      }
      return payload
    },
    {
      refreshInterval: 30000,
    }
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
  const aiActivity = useMemo(() => (isStreaming ? 'Processando' : filteredSessions.length > 0 ? 'Ativo' : 'Ocioso'), [isStreaming, filteredSessions.length])
  const fullAccessActiveGrant = useMemo(() => {
    const grants = fullAccessData?.metadata?.grants || []
    return grants.find((grant) => grant.status === 'active') ?? null
  }, [fullAccessData?.metadata?.grants])
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
      interval:
        String(plan.interval).toLowerCase().includes('year') || String(plan.interval).toLowerCase().includes('ano')
          ? ('year' as const)
          : ('month' as const),
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

  useDashboardStoragePersistence({
    sessionHistory,
    chatHistory,
    settings,
  })

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
    trackEvent('user', 'settings_change', { section: 'first-value-guide', action: 'dismiss' })
  }, [trackEvent])

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
    const setupTarget = aiProviderGate?.setupUrl || '/settings?tab=api'
    if (typeof window !== 'undefined') {
      window.location.assign(setupTarget)
    }
    trackEvent('ai', 'ai_error', { source: 'provider-gate', action: 'open-settings-api-tab', setupTarget })
  }, [aiProviderGate?.setupUrl, trackEvent])

  const handleStopDashboardChat = useCallback(() => {
    chatAbortRef.current?.abort()
    chatAbortRef.current = null
    setIsStreaming(false)
    showToastMessage('Execucao interrompida pelo usuario.', 'info')
    trackEvent('ai', 'ai_error', { source: 'dashboard-chat', action: 'abort' })
  }, [showToastMessage, trackEvent])
  const navigateToIdeWithContext = useCallback((source: string, entry: string) => {
    if (typeof window === 'undefined') return
    trackEvent('engine', 'editor_open', { source, entry, projectId: copilotProjectId })

    void resolveIdeHandoffParams({
      entry,
      projectId: copilotProjectId,
      previewRuntimeStorageKey: PREVIEW_RUNTIME_URL_STORAGE_KEY,
    }).then(({ params, runtimeUrl, discoveryStatus }) => {
      if (discoveryStatus !== 'stored') {
        trackEvent('engine', 'render_time', { source: 'dashboard-handoff-runtime-discovery', status: discoveryStatus, runtimeUrl })
      }
      window.location.assign(`/ide?${params.toString()}`)
    })
  }, [copilotProjectId, trackEvent])
  const handleOpenIdeLivePreview = useCallback(() => {
    setFirstValueOpenedIde(true)
    navigateToIdeWithContext('dashboard-first-value', 'live-preview')
  }, [navigateToIdeWithContext])
  const handleOpenAIChatFromGuide = useCallback(() => {
    setActiveTab('ai-chat')
    setChatMode('chat')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.activeTab, 'ai-chat')
    }
    trackEvent('ai', 'ai_chat', { source: 'first-value-guide', action: 'open-ai-chat' })
  }, [trackEvent])
  const handleOpenIdeFromHeader = useCallback(() => {
    navigateToIdeWithContext('dashboard-header', 'quick-open')
  }, [navigateToIdeWithContext])
  const handleToggleFullAccess = useCallback(() => {
    if (!hasToken || fullAccessBusy) {
      if (!hasToken) showToastMessage('Autentique-se para alterar Full Access.', 'error')
      return
    }

    void (async () => {
      setFullAccessBusy(true)
      try {
        if (fullAccessActiveGrant?.id) {
          const response = await fetch(`/api/studio/access/full/${encodeURIComponent(fullAccessActiveGrant.id)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
          })
          const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
          }
          showToastMessage('Full Access revogado.', 'success')
          trackEvent('security', 'full_access_revoke', {
            source: 'dashboard-header',
            projectId: copilotProjectId,
          })
        } else {
          const response = await fetch('/api/studio/access/full', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              projectId: copilotProjectId || undefined,
              durationMinutes: 15,
              reason: `dashboard_header_full_access:${copilotProjectId || 'workspace'}`,
              scope: copilotProjectId ? [`project:${copilotProjectId}`, 'workspace:apply'] : ['workspace:apply'],
            }),
          })
          const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
          }
          showToastMessage('Full Access temporario ativado (15 min).', 'success')
          trackEvent('security', 'full_access_grant', {
            source: 'dashboard-header',
            projectId: copilotProjectId,
            durationMinutes: 15,
          })
        }

        await mutateFullAccess()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao atualizar Full Access.'
        showToastMessage(message, 'error')
      } finally {
        setFullAccessBusy(false)
      }
    })()
  }, [
    hasToken,
    fullAccessBusy,
    fullAccessActiveGrant?.id,
    showToastMessage,
    trackEvent,
    copilotProjectId,
    mutateFullAccess,
  ])

  const handleResetDashboard = useCallback(() => {
    clearStoredDashboardState()
    setSessionHistory([])
    setSessionFilter('all')
    setActiveTab('overview')
    setChatHistory([])
    setChatMessage('')
    setLivePreviewSuggestions([])
    setSettings({ ...DASHBOARD_DEFAULT_SETTINGS })
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
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      setAiProviderGate(null)
      const nextMessages = [...chatHistory, { role: 'user', content: message } as ChatMessage].slice(-200)
      setChatMessage('')
      setChatHistory(nextMessages)
      setIsStreaming(true)
      try {
        const controller = new AbortController()
        chatAbortRef.current = controller
        const result = await requestAdvancedChat({
          message,
          model: DEFAULT_MODEL,
          messages: nextMessages.map((item) => ({ role: item.role, content: item.content })),
          projectId: copilotProjectId ?? undefined,
          headers: getAuthHeaders(),
          signal: controller.signal,
        })
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: extractApiContent(result.raw) || 'Resposta vazia do modelo.',
        }
        const latencyMs = Math.max(
          0,
          Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
        )
        setChatHistory((prev) => [...prev, assistantMessage].slice(-200))
        setFirstValueAiSuccess(true)
        setAiProviderGate(null)
        trackEvent('ai', 'ai_chat', { source: 'dashboard-chat', status: 'success', latencyMs })
        analytics?.trackPerformance?.('ai_chat_latency', latencyMs, 'ms', {
          surface: 'dashboard',
          status: 'success',
        })
        analytics?.track?.('ai', 'ai_stream', {
          metadata: {
            source: 'dashboard-chat',
            latencyMs,
            status: 'success',
            usedFallback: result.usedFallback,
          },
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Request interrupted by user.' } as ChatMessage].slice(-200))
          return
        }
        let errorMessage = error instanceof Error ? error.message : 'Falha na chamada de IA.'
        if (error instanceof AdvancedChatRequestError) {
          const providerGate = isProviderSetupError(error)
          if (providerGate) {
            setAiProviderGate({
              message: error.message,
              capabilityStatus: error.capabilityStatus,
              setupUrl: error.setupUrl,
            })
            const setupTarget = error.setupUrl || '/settings?tab=api'
            errorMessage = `${error.message} Configure um provider em ${setupTarget} para liberar o chat.`
          } else {
            errorMessage = `${error.code}: ${error.message}`
          }
        }
        const latencyMs = Math.max(
          0,
          Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
        )
        setChatHistory((prev) => [...prev, { role: 'assistant', content: errorMessage } as ChatMessage].slice(-200))
        trackEvent('ai', 'ai_error', { source: 'dashboard-chat', latencyMs, error: errorMessage })
        analytics?.trackPerformance?.('ai_chat_latency', latencyMs, 'ms', {
          surface: 'dashboard',
          status: 'error',
        })
      } finally {
        chatAbortRef.current = null
        setIsStreaming(false)
      }
    })()
  }, [chatMessage, isStreaming, chatHistory, copilotProjectId, trackEvent])

  const handleMagicWandSelect = useCallback((position: Point3) => {
    setSelectedPreviewPoint(position)
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
      const result = await requestAdvancedChat({
        message: prompt,
        model: DEFAULT_MODEL,
        messages: [buildLivePreviewSystemMessage(), { role: 'user', content: prompt }],
        projectId: copilotProjectId ?? undefined,
        headers: getAuthHeaders(),
        profileOverride: {
          qualityMode: 'delivery',
          agentCount: 1,
          enableWebResearch: false,
        },
      })
      const parsed = extractPrimaryAssistantContent(JSON.parse(result.raw)) || extractApiContent(result.raw)
      const finalSuggestion = parsed.trim() || normalized
      setLivePreviewSuggestions((prev) => [finalSuggestion, ...prev].slice(0, 10))
      setChatHistory((prev) => [...prev, buildLivePreviewSuggestionMessage(finalSuggestion)].slice(-200))
    } catch (error) {
      const message =
        error instanceof AdvancedChatRequestError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Falha ao gerar sugestao.'
      setLivePreviewSuggestions((prev) => [`Erro: ${message}`, ...prev].slice(0, 10))
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, selectedPreviewPoint, copilotProjectId])

  const firstValueSessionSummary = useFirstValueTracking({
    projectsCount: projects.length,
    defaultProjectsCount: DEFAULT_PROJECTS.length,
    firstValueAiSuccess,
    firstValueOpenedIde,
    trackEvent,
  })

  useDashboardMissionSeed({
    trackEvent,
    showToastMessage,
    setShowFirstValueGuide,
    setActiveTab,
    setChatMessage,
  })

  useEffect(() => {
    setAuthReady(true)
    setHasToken(isAuthenticated())
    setCopilotProjectId(getProjectIdFromLocation())
    trackEvent('engine', 'editor_open', { surface: 'dashboard' })
    analytics?.trackPageLoad?.('dashboard')
  }, [trackEvent])

  useEffect(() => {
    if (!authReady || !hasToken) return
    const controller = new AbortController()

    ;(async () => {
      try {
        const status = await fetchAiProviderStatus(controller.signal)
        if (status.configured || status.demoModeEnabled) {
          setAiProviderGate(null)
          return
        }
        setAiProviderGate({
          message: buildAiProviderGateMessage(status),
          capabilityStatus: status.capabilityStatus,
          setupUrl: status.setupUrl,
        })
        trackEvent('ai', 'ai_error', {
          source: 'dashboard-provider-preflight',
          error: 'AI_PROVIDER_NOT_CONFIGURED',
        })
      } catch {
        // best-effort preflight only
      }
    })()

    return () => controller.abort()
  }, [authReady, hasToken, trackEvent])

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

  if (!authReady) {
    return <DashboardLoadingScreen theme={settings.theme} />
  }

  return (
    <div className={`aethel-min-h-screen aethel-flex aethel-flex-column ${settings.theme === 'dark' ? 'aethel-bg-slate-950 aethel-text-slate-50' : 'aethel-bg-slate-100 aethel-text-slate-900'}`}>
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-white focus:ring-2 focus:ring-blue-500"
      >
        Pular para o conteudo principal
      </a>
      <div className="sr-only" role="status" aria-live="polite" />
      {isTrialActive && showTrialBanner && (
        <TrialBanner
          trialDaysLeft={trialDaysLeft}
          onDismiss={() => setShowTrialBanner(false)}
          onUpgrade={() => handleTabChange('billing')}
        />
      )}

      <DashboardHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onResetDashboard={handleResetDashboard}
        onToggleTheme={handleToggleTheme}
        onOpenIde={handleOpenIdeFromHeader}
        onToggleFullAccess={handleToggleFullAccess}
        theme={settings.theme}
        backendOnline={backendOnline}
        aiProviderConfigured={!aiProviderGate}
        onOpenProviderSettings={handleOpenProviderSettings}
        fullAccessActive={Boolean(fullAccessActiveGrant)}
        fullAccessExpiresAt={fullAccessActiveGrant?.expiresAt || null}
        fullAccessBusy={fullAccessBusy}
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
        <main id="dashboard-main-content" className="aethel-flex-1 aethel-overflow-y-auto aethel-relative">
          <DashboardMainContent
            activeTab={activeTab}
            showFirstValueGuide={showFirstValueGuide}
            firstProjectCreated={projects.length > DEFAULT_PROJECTS.length}
            firstValueAiSuccess={firstValueAiSuccess}
            firstValueOpenedIde={firstValueOpenedIde}
            firstValueSessionSummary={firstValueSessionSummary}
            onFirstValueStartTemplate={handleTemplateSelect}
            onFirstValueCreateProject={() => {
              trackEvent('project', 'project_open', { source: 'first-value-guide', action: 'open-project-tab' })
              handleTabChange('projects')
            }}
            onFirstValueConfigureAI={() => {
              trackEvent('ai', 'ai_error', { source: 'first-value-guide', action: 'open-provider-setup' })
              handleOpenProviderSettings()
            }}
            onFirstValueOpenAIChat={handleOpenAIChatFromGuide}
            onFirstValueOpenIdePreview={handleOpenIdeLivePreview}
            onFirstValueDismiss={dismissFirstValueGuide}
            overviewProps={{
              aiActivity,
              projects,
              livePreviewSuggestions,
              authReady,
              hasToken,
              onRefreshWallet: handleRefreshWallet,
              lastWalletUpdate,
              walletLoading,
              walletError: walletError as Error | null | undefined,
              walletData,
              walletTransactions,
              formatCurrencyLabel,
              connectivityData,
              connectivityLoading,
              connectivityError: connectivityError as Error | null | undefined,
              connectivityServices,
              formatConnectivityStatus: formatConnectivityStatusLabel,
              miniPreviewExpanded,
              onToggleMiniPreviewExpanded: () => setMiniPreviewExpanded((prev) => !prev),
              onMagicWandSelect: handleMagicWandSelect,
              onSendSuggestion: handleSendLivePreviewSuggestion,
              isGenerating,
            }}
            projectsProps={{
              projects,
              newProjectName,
              newProjectType,
              onDeleteProject: handleDeleteProject,
              onCreateProject: handleCreateProject,
              onProjectNameChange: setNewProjectName,
              onProjectTypeChange: setNewProjectType,
              onProjectVersionChange: handleProjectVersionChange,
              onApplyDirectorNote: handleApplyDirectorNote,
            }}
            aiChatProps={{
              chatMode,
              onChatModeChange: setChatMode,
              chatHistory,
              chatMessage,
              onChatMessageChange: setChatMessage,
              onSendChatMessage: handleSendChatMessage,
              onStopStreaming: handleStopDashboardChat,
              isStreaming,
              activeWorkflowId,
              copilotWorkflows,
              copilotWorkflowsLoading,
              connectBusy,
              connectFromWorkflowId,
              onCreateWorkflow: handleCreateWorkflow,
              onSelectWorkflow: handleSelectWorkflow,
              onRenameWorkflow: handleRenameWorkflow,
              onArchiveWorkflow: handleArchiveWorkflow,
              onConnectFromWorkflowChange: setConnectFromWorkflowId,
              onCopyHistory: handleCopyHistory,
              onImportContext: handleImportContext,
              onMergeWorkflow: handleMergeWorkflow,
              providerSetupGate: aiProviderGate,
              onOpenProviderSettings: handleOpenProviderSettings,
            }}
            walletProps={{
              authReady,
              hasToken,
              walletLoading,
              walletError,
              walletData,
              walletTransactions,
              creditsInfo: creditsData,
              creditsUsedToday: walletStats.creditsUsedToday,
              creditsUsedThisMonth: walletStats.creditsUsedThisMonth,
              creditsReceivedThisMonth: walletStats.creditsReceivedThisMonth,
              lastWalletUpdate,
              lastPurchaseIntent,
              lastTransferReceipt,
              walletActionMessage,
              walletActionError,
              purchaseForm,
              transferForm,
              walletSubmitting,
              creditEntries,
              receivableSummary,
              onRefreshWallet: handleRefreshWallet,
              onPurchaseIntentSubmit: handlePurchase,
              onTransferSubmit: handleTransfer,
              setPurchaseForm,
              setTransferForm,
              formatCurrencyLabel,
              formatStatusLabel,
            }}
            billingProps={{
              plans: billingPlansForUI,
              currentPlan: currentPlan?.id,
              loading: !billingData && !billingError,
              onSelectPlan: handleSubscribe,
              onManageSubscription: handleManageSubscription,
            }}
            billingError={subscribeError}
            subscribingPlan={subscribingPlan}
            connectivityProps={{
              connectivityLoading,
              connectivityError,
              connectivityData,
              connectivityServices,
              onRefreshConnectivity: handleRefreshConnectivity,
              formatConnectivityStatus: formatConnectivityStatusLabel,
            }}
            workflowTemplates={workflowTemplates}
            useCases={useCases}
            onDownload={handleDownload}
            onTemplateSelect={handleTemplateSelect}
            onUseCaseSelect={handleUseCaseSelect}
          />
        </main>
      </div>

      {showToast ? <DashboardToast message={showToast.message} type={showToast.type} /> : null}
    </div>
  )
}
