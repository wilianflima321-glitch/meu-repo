'use client'

import { useCallback } from 'react'
import {
  type ChatMessage,
  type CopilotWorkflowSummary,
  type PurchaseIntentResponse,
  type TransferResponse,
} from '@/lib/api'
import type { Point3 } from './aethel-dashboard-core-types'
import type {
  ActiveTab,
  DashboardSettings,
  Project,
  SessionFilter,
  ToastType,
  WorkflowTemplate,
} from './aethel-dashboard-model'
import { persistDashboardActiveTab, resolvePrimaryDashboardTab } from './aethel-dashboard-model'
import { useDashboardAccessActions } from './useDashboardAccessActions'
import { useDashboardBillingActions } from './useDashboardBillingActions'
import { useDashboardChatActions } from './useDashboardChatActions'
import { useDashboardOnboardingActions } from './useDashboardOnboardingActions'
import { useDashboardWorkflowActions } from './useDashboardWorkflowActions'
import { useDashboardWorkspaceActions } from './useDashboardWorkspaceActions'
import { setUiPersistence } from '@/lib/storage/ui-persistence-spine'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type DashboardActionsInput = {
  trackEvent: (category: string, action: string, metadata?: Record<string, unknown>) => void
  showToastMessage: (message: string, type?: ToastType) => void
  persistCopilotScope: (workflowId: string | null, threadId: string | null) => void
  navigateToIdeWithContext: (source: string, entry: string) => void
  chatAbortRef: React.MutableRefObject<AbortController | null>
  hasToken: boolean
  aiProviderGate: { setupUrl?: string } | null
  fullAccessBusy: boolean
  fullAccessActiveGrant: { id?: string } | null
  copilotProjectId: string | null
  copilotWorkflows: CopilotWorkflowSummary[]
  activeWorkflowId: string | null
  connectFromWorkflowId: string
  chatMessage: string
  chatHistory: ChatMessage[]
  isStreaming: boolean
  isGenerating: boolean
  selectedPreviewPoint: Point3 | null
  workflowTemplates: WorkflowTemplate[]
  projects: Project[]
  newProjectName: string
  newProjectType: Project['type']
  purchaseForm: { amount: string; currency: string; reference: string }
  transferForm: { targetUserId: string; amount: string; currency: string; reference: string }
  settings: DashboardSettings
  mutate: (key: string) => Promise<any>
  mutateWallet: () => Promise<any>
  mutateCredits: () => Promise<any>
  mutateConnectivity: () => Promise<any>
  mutateFullAccess: () => Promise<any>
  mutateOnboarding: () => Promise<any>
  formatCurrencyLabel: (currency?: string | null) => string
  setActiveTab: SetState<ActiveTab>
  setChatMode: SetState<'chat' | 'agent' | 'canvas'>
  setChatMessage: SetState<string>
  setChatHistory: SetState<ChatMessage[]>
  setIsStreaming: SetState<boolean>
  setIsGenerating: SetState<boolean>
  setActiveWorkflowId: SetState<string | null>
  setActiveChatThreadId: SetState<string | null>
  setConnectFromWorkflowId: SetState<string>
  setConnectBusy: SetState<boolean>
  setCopilotWorkflows: SetState<CopilotWorkflowSummary[]>
  setSessionHistory: SetState<any[]>
  setSessionFilter: SetState<SessionFilter>
  setLivePreviewSuggestions: SetState<string[]>
  setSettings: SetState<DashboardSettings>
  setProjects: SetState<Project[]>
  setNewProjectName: SetState<string>
  setSubscribingPlan: SetState<string | null>
  setSubscribeError: SetState<string | null>
  setWalletSubmitting: SetState<boolean>
  setWalletActionError: SetState<string | null>
  setWalletActionMessage: SetState<string | null>
  setLastPurchaseIntent: SetState<PurchaseIntentResponse | null>
  setLastTransferReceipt: SetState<TransferResponse | null>
  setSelectedPreviewPoint: SetState<Point3 | null>
  setFirstValueAiSuccess: SetState<boolean>
  setFirstValueOpenedIde: SetState<boolean>
  setAiProviderGate: SetState<{ message: string; capabilityStatus?: string; setupUrl?: string } | null>
  setFullAccessBusy: SetState<boolean>
  setShowFirstValueGuide: SetState<boolean>
  setShowOnboardingWizard: SetState<boolean>
}

export function useDashboardActions({
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
}: DashboardActionsInput) {
  const handleTabChange = useCallback((tab: ActiveTab) => {
    const nextTab = resolvePrimaryDashboardTab(tab)
    setActiveTab(nextTab)
    if (typeof window !== 'undefined') {
      persistDashboardActiveTab(nextTab)
    }
    trackEvent('user', 'settings_change', { section: 'dashboard-tab', tab: nextTab, requestedTab: tab })
  }, [setActiveTab, trackEvent])

  const { handleToggleFullAccess } = useDashboardAccessActions({
    trackEvent,
    showToastMessage,
    hasToken,
    fullAccessBusy,
    fullAccessActiveGrant,
    copilotProjectId,
    mutateFullAccess,
    setFullAccessBusy,
  })

  const {
    handleOpenIdeLivePreview,
    handleOpenAIChatFromGuide,
    handleOpenIdeFromHeader,
    handleResetDashboard,
    handleToggleTheme,
    handleCreateNewSession,
    handleCreateProject,
    handleDeleteProject,
  } = useDashboardWorkspaceActions({
    trackEvent,
    showToastMessage,
    persistCopilotScope,
    navigateToIdeWithContext,
    settings,
    projects,
    newProjectName,
    newProjectType,
    setActiveTab,
    setChatMode,
    setChatMessage,
    setChatHistory,
    setActiveWorkflowId,
    setActiveChatThreadId,
    setConnectFromWorkflowId,
    setSessionHistory,
    setSessionFilter,
    setLivePreviewSuggestions,
    setSettings,
    setProjects,
    setNewProjectName,
    setFirstValueOpenedIde,
  })

  const {
    handleOpenProviderSettings,
    handleStopDashboardChat,
    handleApplyDirectorNote,
    handleSendChatMessage,
    handleMagicWandSelect,
    handleSendLivePreviewSuggestion,
  } = useDashboardChatActions({
    trackEvent,
    showToastMessage,
    chatAbortRef,
    aiProviderGate,
    copilotProjectId,
    activeWorkflowId,
    chatMessage,
    chatHistory,
    isStreaming,
    isGenerating,
    selectedPreviewPoint,
    setActiveTab,
    setChatMessage,
    setChatHistory,
    setIsStreaming,
    setIsGenerating,
    setLivePreviewSuggestions,
    setSelectedPreviewPoint,
    setFirstValueAiSuccess,
    setAiProviderGate,
  })

  const {
    handleSubscribe,
    handleManageSubscription,
    handlePurchase,
    handleTransfer,
    handleRefreshWallet,
  } = useDashboardBillingActions({
    hasToken,
    purchaseForm,
    transferForm,
    mutate,
    mutateWallet,
    mutateCredits,
    formatCurrencyLabel,
    showToastMessage,
    handleTabChange,
    setSubscribingPlan,
    setSubscribeError,
    setWalletSubmitting,
    setWalletActionError,
    setWalletActionMessage,
    setLastPurchaseIntent,
    setLastTransferReceipt,
  })

  const handleRefreshConnectivity = useCallback(() => {
    if (!hasToken) return
    void mutateConnectivity()
  }, [hasToken, mutateConnectivity])

  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = workflowTemplates.find((item) => item.id === templateId)
    if (!template) return
    setChatMessage(`Apply template "${template.name}" with steps:\n- ${template.steps.join('\n- ')}`)
    setActiveTab('activity')
    navigateToIdeWithContext('dashboard-template', `template:${template.id}`)
    showToastMessage(`Template "${template.name}" prepared for IDE agents.`, 'success')
  }, [workflowTemplates, setChatMessage, setActiveTab, navigateToIdeWithContext, showToastMessage])

  const {
    handleDismissOnboardingWizard,
    handleOnboardingComplete,
    handleOnboardingSkip,
  } = useDashboardOnboardingActions({
    hasToken,
    mutateOnboarding,
    trackEvent,
    handleTemplateSelect,
    setNewProjectName,
    setShowOnboardingWizard,
  })

  const {
    handleCreateWorkflow,
    handleSelectWorkflow,
    handleRenameWorkflow,
    handleArchiveWorkflow,
    handleCopyHistory,
    handleImportContext,
    handleMergeWorkflow,
  } = useDashboardWorkflowActions({
    showToastMessage,
    persistCopilotScope,
    copilotProjectId,
    copilotWorkflows,
    activeWorkflowId,
    connectFromWorkflowId,
    setActiveWorkflowId,
    setActiveChatThreadId,
    setConnectFromWorkflowId,
    setConnectBusy,
    setCopilotWorkflows,
  })

  const dismissFirstValueGuide = useCallback(() => {
    setShowFirstValueGuide(false)
    setUiPersistence('dashboard.firstValueDismissed', '1')
    trackEvent('user', 'settings_change', { section: 'first-value-guide', action: 'dismiss' })
  }, [setShowFirstValueGuide, trackEvent])

  return {
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
    handleDismissOnboardingWizard,
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
  }
}
