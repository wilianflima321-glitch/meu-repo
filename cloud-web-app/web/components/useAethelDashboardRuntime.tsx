'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { getAuthHeaders, getProjectIdFromLocation } from './dashboard/aethel-dashboard-location-utils'
import { resolveIdeHandoffParams } from './dashboard/aethel-dashboard-ide-handoff'
import {
  extractCopilotWorkflowList,
  mapApiMessagesToChatHistory,
} from './dashboard/aethel-dashboard-copilot-utils'
import {
  PREVIEW_RUNTIME_URL_STORAGE_KEY,
  coerceActiveTab,
  type FullAccessResponse,
  type Point3,
} from './dashboard/aethel-dashboard-core-types'
import { useFirstValueTracking } from './dashboard/useFirstValueTracking'
import { useDashboardMissionSeed } from './dashboard/useDashboardMissionSeed'
import { useDashboardStoragePersistence } from './dashboard/useDashboardStoragePersistence'
import {
  FIRST_VALUE_GUIDE_DISMISSED_KEY,
  ONBOARDING_WIZARD_DISMISSED_KEY,
} from './dashboard/aethel-dashboard-constants'
import {
  getInitialActiveTab,
  getInitialChatHistory,
  getInitialFirstValueGuideState,
  getInitialSessionHistory,
  getInitialSettings,
} from './dashboard/aethel-dashboard-initial-state'
import { useDashboardActions } from './dashboard/useDashboardActions'
import { useDashboardDerivedState } from './dashboard/useDashboardDerivedState'

export function useAethelDashboardRuntime() {
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
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)
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

  const {
    walletTransactions,
    creditEntries,
    walletStats,
    receivableSummary,
    connectivityServices,
    lastWalletUpdate,
    walletLoading,
    connectivityLoading,
    filteredSessions,
    aiActivity,
    fullAccessActiveGrant,
    backendOnline,
    authErrorText,
    billingErrorText,
    billingPlansForUI,
  } = useDashboardDerivedState({
    authReady,
    hasToken,
    walletData,
    walletError,
    connectivityData,
    connectivityError,
    sessionHistory,
    sessionFilter,
    isStreaming,
    fullAccessData,
    healthData,
    healthError,
    billingData,
    billingError,
  })

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

  const persistCopilotScope = useCallback((workflowId: string | null, threadId: string | null) => {
    if (typeof window === 'undefined') return
    const keys = getScopedKeys(copilotProjectId)
    if (workflowId) window.localStorage.setItem(keys.workflowKey, workflowId)
    else window.localStorage.removeItem(keys.workflowKey)
    if (threadId) window.localStorage.setItem(keys.chatThreadKey, threadId)
    else window.localStorage.removeItem(keys.chatThreadKey)
  }, [copilotProjectId])

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
  const {
    handleTabChange,
    handleOpenProviderSettings,
    handleStopDashboardChat,
    handleOpenIdeLivePreview,
    handleOpenAIChatFromGuide,
    handleOpenIdeFromHeader,
    handleToggleFullAccess,
    handleResetDashboard,
    handleToggleTheme,
    handleCreateNewSession,
    handleCreateProject,
    handleDeleteProject,
    handleProjectVersionChange,
    handleApplyDirectorNote,
    handleDownload,
    handleSubscribe,
    handleManageSubscription,
    handlePurchase,
    handleTransfer,
    handleRefreshWallet,
    handleRefreshConnectivity,
    handleTemplateSelect,
    handleOnboardingComplete,
    handleOnboardingSkip,
    handleUseCaseSelect,
    handleCreateWorkflow,
    handleSelectWorkflow,
    handleRenameWorkflow,
    handleArchiveWorkflow,
    handleCopyHistory,
    handleImportContext,
    handleMergeWorkflow,
    handleSendChatMessage,
    handleMagicWandSelect,
    handleSendLivePreviewSuggestion,
    dismissFirstValueGuide,
  } = useDashboardActions({
    trackEvent,
    showToastMessage,
    persistCopilotScope,
    navigateToIdeWithContext,
    startDownload,
    chatAbortRef,
    hasToken,
    aiProviderGate,
    fullAccessBusy,
    fullAccessActiveGrant,
    copilotProjectId,
    copilotWorkflows,
    activeWorkflowId,
    connectFromWorkflowId,
    chatMessage,
    chatHistory,
    isStreaming,
    isGenerating,
    selectedPreviewPoint,
    workflowTemplates,
    useCases,
    projects,
    newProjectName,
    newProjectType,
    purchaseForm,
    transferForm,
    settings,
    mutate,
    mutateWallet,
    mutateCredits,
    mutateConnectivity,
    mutateFullAccess,
    formatCurrencyLabel,
    setActiveTab,
    setChatMode,
    setChatMessage,
    setChatHistory,
    setIsStreaming,
    setIsGenerating,
    setActiveWorkflowId,
    setActiveChatThreadId,
    setConnectFromWorkflowId,
    setConnectBusy,
    setCopilotWorkflows,
    setSessionHistory,
    setSessionFilter,
    setLivePreviewSuggestions,
    setSettings,
    setProjects,
    setNewProjectName,
    setSubscribingPlan,
    setSubscribeError,
    setWalletSubmitting,
    setWalletActionError,
    setWalletActionMessage,
    setLastPurchaseIntent,
    setLastTransferReceipt,
    setSelectedPreviewPoint,
    setFirstValueAiSuccess,
    setFirstValueOpenedIde,
    setAiProviderGate,
    setFullAccessBusy,
    setShowFirstValueGuide,
    setShowOnboardingWizard,
  })

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
    if (!authReady || !hasToken) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const forced = params.get('onboarding') === '1'
    const dismissed = window.localStorage.getItem(ONBOARDING_WIZARD_DISMISSED_KEY) === '1'
    if (forced || (!dismissed && showFirstValueGuide)) {
      setShowOnboardingWizard(true)
    }
  }, [authReady, hasToken, showFirstValueGuide])

  useEffect(() => {
    setAuthReady(true)
    setHasToken(isAuthenticated())
    setCopilotProjectId(getProjectIdFromLocation())
    trackEvent('engine', 'editor_open', { surface: 'dashboard' })
    analytics?.trackPageLoad?.('dashboard')
  }, [trackEvent])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (!tab) return
    const nextTab = coerceActiveTab(tab)
    setActiveTab(nextTab)
    window.localStorage.setItem(STORAGE_KEYS.activeTab, nextTab)
  }, [])

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

  const dashboardMainProps = {
    activeTab, showFirstValueGuide, firstProjectCreated: projects.length > DEFAULT_PROJECTS.length, firstValueAiSuccess, firstValueOpenedIde, firstValueSessionSummary, onFirstValueStartTemplate: handleTemplateSelect,
    onFirstValueCreateProject: () => {
      trackEvent('project', 'project_open', { source: 'first-value-guide', action: 'open-project-tab' })
      handleTabChange('projects')
    },
    onFirstValueConfigureAI: () => {
      trackEvent('ai', 'ai_error', { source: 'first-value-guide', action: 'open-provider-setup' })
      handleOpenProviderSettings()
    },
    onFirstValueOpenAIChat: handleOpenAIChatFromGuide,
    onFirstValueOpenIdePreview: handleOpenIdeLivePreview,
    onFirstValueDismiss: dismissFirstValueGuide,
    overviewProps: {
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
    },
    projectsProps: {
      projects, newProjectName, newProjectType,
      onDeleteProject: handleDeleteProject,
      onCreateProject: handleCreateProject,
      onProjectNameChange: setNewProjectName,
      onProjectTypeChange: setNewProjectType,
      onProjectVersionChange: handleProjectVersionChange,
      onApplyDirectorNote: handleApplyDirectorNote,
    },
    aiChatProps: {
      chatMode, onChatModeChange: setChatMode, chatHistory, chatMessage, onChatMessageChange: setChatMessage,
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
    },
    walletProps: {
      authReady, hasToken, walletLoading, walletError, walletData, walletTransactions,
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
    },
    billingProps: {
      plans: billingPlansForUI, currentPlan: currentPlan?.id, loading: !billingData && !billingError,
      onSelectPlan: handleSubscribe,
      onManageSubscription: handleManageSubscription,
    },
    billingError: subscribeError,
    subscribingPlan,
    connectivityProps: {
      connectivityLoading, connectivityError, connectivityData, connectivityServices,
      onRefreshConnectivity: handleRefreshConnectivity,
      formatConnectivityStatus: formatConnectivityStatusLabel,
    },
    workflowTemplates,
    useCases,
    onDownload: handleDownload,
    onTemplateSelect: handleTemplateSelect,
    onUseCaseSelect: handleUseCaseSelect,
  }

  const dashboardShellProps = {
    theme: settings.theme,
    isTrialActive,
    showTrialBanner,
    trialDaysLeft,
    onDismissTrialBanner: () => setShowTrialBanner(false),
    onUpgradeTrial: () => handleTabChange('billing'),
    authErrorText,
    billingErrorText,
    sidebarOpen,
    activeTab,
    sessionFilter,
    onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    onCloseSidebar: () => setSidebarOpen(false),
    onResetDashboard: handleResetDashboard,
    onToggleTheme: handleToggleTheme,
    backendOnline,
    aiProviderConfigured: !aiProviderGate,
    onOpenProviderSettings: handleOpenProviderSettings,
    fullAccessActive: Boolean(fullAccessActiveGrant),
    fullAccessExpiresAt: fullAccessActiveGrant?.expiresAt || null,
    fullAccessBusy,
    onToggleFullAccess: handleToggleFullAccess,
    onOpenIde: handleOpenIdeFromHeader,
    onCreateNewSession: handleCreateNewSession,
    onSelectSessionFilter: setSessionFilter,
    onSelectTab: handleTabChange,
    showOnboardingWizard,
    onOnboardingComplete: handleOnboardingComplete,
    onOnboardingSkip: handleOnboardingSkip,
    dashboardMainProps,
    toast: showToast,
  }

  return {
    authReady,
    theme: settings.theme,
    dashboardShellProps,
  }
}
