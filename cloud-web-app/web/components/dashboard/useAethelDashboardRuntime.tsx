'use client'
import { useCallback } from 'react'
import { useSWRConfig } from 'swr'
import { analytics, type EventAction, type EventCategory } from '@/lib/analytics'
import {
  type ToastType,
} from './aethel-dashboard-model'
import {
  DEFAULT_PROJECTS,
  formatConnectivityStatus as formatConnectivityStatusLabel,
  formatCurrencyLabel,
  formatStatusLabel,
  getScopedKeys,
} from './aethel-dashboard-defaults'
import { resolveIdeHandoffParams } from './aethel-dashboard-ide-handoff'
import {
  PREVIEW_RUNTIME_URL_STORAGE_KEY,
} from './aethel-dashboard-core-types'
import { useFirstValueTracking } from './useFirstValueTracking'
import { useDashboardMissionSeed } from './useDashboardMissionSeed'
import { useDashboardStoragePersistence } from './useDashboardStoragePersistence'
import { useDashboardEntryIntent } from './useDashboardEntryIntent'
import { useDashboardUiState } from './useDashboardUiState'
import { useDashboardActions } from './useDashboardActions'
import { useDashboardDerivedState } from './useDashboardDerivedState'
import { useDashboardRemoteData } from './useDashboardRemoteData'
import { useDashboardCopilotSync } from './useDashboardCopilotSync'
import { useDashboardRuntimeLifecycle } from './useDashboardRuntimeLifecycle'

export function useAethelDashboardRuntime() {
  const { mutate } = useSWRConfig()
  const { mission: entryMission, source: entrySource, dismissEntryIntent } = useDashboardEntryIntent()
  const {
    workflowTemplates,
    showToast,
    setShowToast,
    sessionHistory,
    setSessionHistory,
    sessionFilter,
    setSessionFilter,
    sidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab,
    chatHistory,
    setChatHistory,
    activeChatThreadId,
    setActiveChatThreadId,
    activeWorkflowId,
    setActiveWorkflowId,
    copilotProjectId,
    setCopilotProjectId,
    copilotWorkflows,
    setCopilotWorkflows,
    copilotWorkflowsLoading,
    setCopilotWorkflowsLoading,
    connectFromWorkflowId,
    setConnectFromWorkflowId,
    connectBusy,
    setConnectBusy,
    chatMessage,
    setChatMessage,
    livePreviewSuggestions,
    setLivePreviewSuggestions,
    selectedPreviewPoint,
    setSelectedPreviewPoint,
    settings,
    setSettings,
    projects,
    setProjects,
    newProjectName,
    setNewProjectName,
    newProjectType,
    setNewProjectType,
    isGenerating,
    setIsGenerating,
    isStreaming,
    setIsStreaming,
    miniPreviewExpanded,
    setMiniPreviewExpanded,
    chatMode,
    setChatMode,
    walletActionMessage,
    setWalletActionMessage,
    walletActionError,
    setWalletActionError,
    walletSubmitting,
    setWalletSubmitting,
    purchaseForm,
    setPurchaseForm,
    transferForm,
    setTransferForm,
    lastPurchaseIntent,
    setLastPurchaseIntent,
    lastTransferReceipt,
    setLastTransferReceipt,
    subscribeError,
    setSubscribeError,
    subscribingPlan,
    setSubscribingPlan,
    aiProviderGate,
    setAiProviderGate,
    firstValueAiSuccess,
    setFirstValueAiSuccess,
    firstValueOpenedIde,
    setFirstValueOpenedIde,
    fullAccessBusy,
    setFullAccessBusy,
    showFirstValueGuide,
    setShowFirstValueGuide,
    showOnboardingWizard,
    setShowOnboardingWizard,
    chatAbortRef,
    isTrialActive,
    showTrialBanner,
    setShowTrialBanner,
    trialDaysLeft,
    hasToken,
    setHasToken,
    authReady,
    setAuthReady,
  } = useDashboardUiState()

  const {
    healthData,
    healthError,
    billingData,
    billingError,
    walletData,
    walletError,
    mutateWallet,
    currentPlan,
    creditsData,
    mutateCredits,
    connectivityData,
    connectivityError,
    mutateConnectivity,
    fullAccessData,
    mutateFullAccess,
    mutateOnboarding,
    shouldShowFirstRunOnboarding,
  } = useDashboardRemoteData(hasToken)

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

  const trackEvent = useCallback((category: string, action: string, metadata?: Record<string, unknown>) => {
    analytics?.track?.(category as EventCategory, action as EventAction, { metadata })
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
  }, [setShowToast])

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
      source,
      mission: entryMission,
    }).then(({ params, runtimeUrl, discoveryStatus }) => {
      if (discoveryStatus !== 'stored') {
        trackEvent('engine', 'render_time', { source: 'dashboard-handoff-runtime-discovery', status: discoveryStatus, runtimeUrl })
      }
      window.location.assign(`/ide?${params.toString()}`)
    })
  }, [copilotProjectId, entryMission, trackEvent])
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
    handleApplyDirectorNote,
    handleSubscribe,
    handleManageSubscription,
    handlePurchase,
    handleTransfer,
    handleRefreshWallet,
    handleRefreshConnectivity,
    handleTemplateSelect,
    handleOnboardingComplete,
    handleOnboardingSkip,
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
    mutateOnboarding,
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

  useDashboardRuntimeLifecycle({
    authReady,
    copilotProjectId,
    hasToken,
    setActiveChatThreadId,
    setActiveTab,
    setActiveWorkflowId,
    setAiProviderGate,
    setAuthReady,
    setCopilotProjectId,
    setHasToken,
    setShowOnboardingWizard,
    settingsTheme: settings.theme,
    shouldShowFirstRunOnboarding,
    trackEvent,
  })

  useDashboardCopilotSync({
    activeChatThreadId,
    activeWorkflowId,
    copilotProjectId,
    hasToken,
    persistCopilotScope,
    setActiveChatThreadId,
    setActiveWorkflowId,
    setChatHistory,
    setCopilotWorkflows,
    showToastMessage,
  })

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
      backendOnline,
      aiProviderConfigured: !aiProviderGate,
      currentPlanName: currentPlan?.name || currentPlan?.id || null,
      onOpenProjects: () => handleTabChange('projects'),
      onOpenAiChat: (missionDraft?: string) => {
        const normalized = missionDraft?.trim()
        if (normalized) {
          setChatMessage((previous) => (previous.trim() ? previous : normalized))
        }
        handleOpenAIChatFromGuide()
      },
      onOpenIde: handleOpenIdeFromHeader,
      onOpenBilling: () => {
        if (typeof window !== 'undefined') {
          window.location.assign('/billing')
        }
      },
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
      projects, newProjectName, newProjectType, entryMission,
      onDeleteProject: handleDeleteProject,
      onCreateProject: handleCreateProject,
      onProjectNameChange: setNewProjectName,
      onProjectTypeChange: setNewProjectType,
      onApplyDirectorNote: handleApplyDirectorNote,
      onOpenAiChat: handleOpenAIChatFromGuide,
      onOpenIde: handleOpenIdeFromHeader,
    },
    aiChatProps: {
      chatMode, onChatModeChange: setChatMode, entryMission, chatHistory, chatMessage, onChatMessageChange: setChatMessage,
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
      onOpenProjects: () => handleTabChange('projects'),
      onOpenIde: handleOpenIdeFromHeader,
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
    onTemplateSelect: handleTemplateSelect,
  }

  const dashboardShellProps = {
    theme: settings.theme,
    isTrialActive,
    showTrialBanner,
    trialDaysLeft,
    onDismissTrialBanner: () => setShowTrialBanner(false),
    onUpgradeTrial: () => {
      if (typeof window !== 'undefined') {
        window.location.assign('/billing')
      }
    },
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
    entryMission,
    entrySource,
    // 7B.2 / critique #21 — Resume Workspace restores IDE session, not AI chat tunnel
    onResumeEntryMission: handleOpenIdeFromHeader,
    onDismissEntryIntent: dismissEntryIntent,
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
