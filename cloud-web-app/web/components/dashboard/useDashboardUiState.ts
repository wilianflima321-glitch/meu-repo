'use client'

import { useRef, useState } from 'react'
import type {
  ActiveTab,
  DashboardSettings,
  Project,
  SessionFilter,
  ToastState,
  UseCase,
  WorkflowTemplate,
} from './aethel-dashboard-model'
import type { BillingPlan, ChatMessage, CopilotWorkflowSummary, PurchaseIntentResponse, TransferResponse } from '@/lib/api'
import type { Point3 } from './aethel-dashboard-core-types'
import {
  DEFAULT_PROJECTS,
  DEFAULT_USE_CASES,
  DEFAULT_WORKFLOW_TEMPLATES,
} from './aethel-dashboard-defaults'
import {
  FIRST_VALUE_GUIDE_DISMISSED_KEY,
} from './aethel-dashboard-constants'
import {
  getInitialActiveTab,
  getInitialChatHistory,
  getInitialFirstValueGuideState,
  getInitialSessionHistory,
  getInitialSettings,
} from './aethel-dashboard-initial-state'

export function useDashboardUiState() {
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

  return {
    workflowTemplates,
    useCases,
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
  }
}
