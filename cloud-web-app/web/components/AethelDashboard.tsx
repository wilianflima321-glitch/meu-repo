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

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { isAuthenticated } from '@/lib/auth'
import { useAssetDownload, useJobQueue, useRenderProgress } from '@/hooks/useAethelGateway'
import { RenderQueue } from './dashboard/RenderProgress'
import { AIThinkingPanel } from './ai/AIThinkingPanel'
import { DirectorNotePanel } from './ai/DirectorNotePanel'
import { TimeMachineSlider } from './collaboration/TimeMachineSlider'
import { openConfirmDialog, openPromptDialog } from '@/lib/ui/non-blocking-dialogs'
import { AethelDashboardPrimaryTabContent } from './dashboard/AethelDashboardPrimaryTabContent'
import { AethelDashboardSecondaryTabContent } from './dashboard/AethelDashboardSecondaryTabContent'
import { useAethelDashboardDerived } from './dashboard/useAethelDashboardDerived'
import { useAethelDashboardRenderData } from './dashboard/useAethelDashboardRenderData'

import {
  BILLING_PLANS_KEY,
  CONNECTIVITY_KEY,
  CREDITS_KEY,
  CURRENT_PLAN_KEY,
  DEFAULT_PROJECTS,
  DEFAULT_SETTINGS,
  DEFAULT_USE_CASES,
  DEFAULT_WORKFLOW_TEMPLATES,
  HEALTH_KEY,
  INITIAL_EDGES,
  INITIAL_NODES,
  STORAGE_KEYS,
  WALLET_KEY,
  clearStoredDashboardState,
  formatConnectivityStatus,
  formatCurrencyLabel,
  formatStatusLabel,
  getScopedKeys,
  resolveStoredActiveTab,
  resolveStoredChatHistory,
  resolveStoredSessions,
  resolveStoredSettings,
  type ActiveTab,
  type DashboardSettings,
  type Project,
  type SessionEntry,
  type SessionFilter,
  type ToastState,
  type ToastType,
  type UseCase,
  type WorkflowTemplate,
} from './dashboard/AethelDashboard.config'

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
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES)
  const [hasToken, setHasToken] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState<Error | null>(null)

  const { downloads, startDownload, cancelDownload } = useAssetDownload()
  const { renders, cancelRender } = useRenderProgress()
  const { jobs: queueJobs } = useJobQueue()

  const { renderJobs, exportJobs, formatBytes, formatCurrency } = useAethelDashboardRenderData(renders, queueJobs)

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

  const { loadChatHistoryForThread, refreshCopilotWorkflows, switchCopilotWorkflow, createCopilotWorkflow, renameCopilotWorkflow, archiveCopilotWorkflow, copyHistoryFromWorkflow, mergeFromWorkflow, importContextFromWorkflow, toggleTheme, createNewSession, toggleFavorite, toggleScheduled, filteredSessions, saveCurrentSession, clearDashboardState, downloadUrls, handleDownload, loadSession, sendChatMessage, createProject, deleteProject, handleMagicWandSelect, handleSendSuggestion, handleAcceptSuggestion, walletTransactions, connectivityServices, lastWalletUpdate, creditEntries, receivableSummary, refreshWallet, refreshConnectivity, handlePurchaseIntentSubmit, handleTransferSubmit, handleSubscribe, handleManageSubscription } = useAethelDashboardDerived({ APIError, AethelAPIClient, DEFAULT_SETTINGS, THREE, activeChatThreadId, activeWorkflowId, chatHistory, chatMessage, clearStoredDashboardState, connectBusy, connectFromWorkflowId, connectivityData, copilotProjectId, copilotWorkflows, creditsKey, currentPlanKey, formatCurrencyLabel, getScopedKeys, hasToken, isAuthenticated, livePreviewSuggestions, mutate, newProjectName, newProjectType, openConfirmDialog, openPromptDialog, projects, purchaseForm, sessionFilter, sessionHistory, setActiveChatThreadId, setActiveTab, setActiveWorkflowId, setAiActivity, setAuthError, setChatHistory, setChatMessage, setConnectBusy, setConnectFromWorkflowId, setCopilotProjectId, setCopilotWorkflows, setCopilotWorkflowsLoading, setHasToken, setIsGenerating, setLastPurchaseIntent, setLastTransferReceipt, setLivePreviewSuggestions, setNewProjectName, setNewProjectType, setProjects, setPurchaseForm, setSessionFilter, setSessionHistory, setSettings, setSidebarOpen, setSubscribeError, setSubscribeMessage, setSubscribingPlan, setTransferForm, setWalletActionError, setWalletActionMessage, setWalletSubmitting, settings, showToastMessage, sidebarOpen, startDownload, transferForm, walletData, walletKey })

  const dashboardTabContentProps = { AIThinkingPanel, APIError, AdminPanel, Background, BillingTab, Controls, DirectorNotePanel, Link, LivePreview, MiniMap, ReactFlow, RenderQueue, TimeMachineSlider, activeTab, activeWorkflowId, aiActivity, applyEdgeChanges, applyNodeChanges, archiveCopilotWorkflow, authReady, billingData, billingError, billingPlansForUI, cancelDownload, cancelRender, chatHistory, chatMessage, chatMode, connectBusy, connectFromWorkflowId, connectivityData, connectivityError, connectivityLoading, connectivityServices, copilotWorkflows, copilotWorkflowsLoading, copyHistoryFromWorkflow, createCopilotWorkflow, createProject, creditEntries, creditsError, creditsInfo, currentPlan, currentPlanError, deleteProject, downloads, edges, exportJobs, formatBytes, formatConnectivityStatus, formatCurrency, formatCurrencyLabel, formatStatusLabel, handleDownload, handleMagicWandSelect, handleManageSubscription, handlePurchaseIntentSubmit, handleSendSuggestion, handleSubscribe, handleTransferSubmit, hasToken, importContextFromWorkflow, isGenerating, isStreaming, lastPurchaseIntent, lastTransferReceipt, lastWalletUpdate, livePreviewSuggestions, mergeFromWorkflow, miniPreviewExpanded, newProjectName, newProjectType, nodes, projects, purchaseForm, receivableSummary, refreshConnectivity, refreshWallet, renameCopilotWorkflow, renderJobs, sendChatMessage, setChatMessage, setChatMode, setConnectFromWorkflowId, setEdges, setMiniPreviewExpanded, setNewProjectName, setNewProjectType, setNodes, setPurchaseForm, setShowToast, setTransferForm, showToast, showToastMessage, subscribeError, subscribeMessage, switchCopilotWorkflow, transferForm, useCases, walletActionError, walletActionMessage, walletData, walletError, walletLoading, walletSubmitting, walletTransactions, workflowTemplates }

  return (
    <div className="min-h-screen aethel-container">
      {/* Trial Banner */}
      {isTrialActive && (
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Teste Pro: {trialDaysLeft} dias restantes — faça upgrade para acesso completo</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-white underline text-xs hover:text-gray-200">Fazer upgrade</button>
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
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
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
              Abrir IDE Desktop
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
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded aethel-flex aethel-items-center aethel-justify-center">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="font-semibold text-sm">Navegação</span>
            </div>
          </div>

          {/* New Task Button - Inspired by Manus */}
          <div className="px-3 py-3">
            <button
              onClick={createNewSession}
              className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors active:opacity-80 bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 h-9 px-3 rounded-lg gap-2 text-sm min-w-9 w-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nova tarefa</span>
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
                    ? 'bg-blue-600 text-white outline-none outline-0'
                    : 'border border-slate-600 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSessionFilter('favorites')}
                className={`flex justify-center items-center clickable rounded-full px-3 py-1.5 border-none outline-offset-0 outline-slate-600 text-xs leading-4 ${
                  sessionFilter === 'favorites'
                    ? 'bg-blue-600 text-white outline-none outline-0'
                    : 'border border-slate-600 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Favoritas
              </button>
              <button
                onClick={() => setSessionFilter('scheduled')}
                className={`flex justify-center items-center clickable rounded-full px-3 py-1.5 border-none outline-offset-0 outline-slate-600 text-xs leading-4 ${
                  sessionFilter === 'scheduled'
                    ? 'bg-blue-600 text-white outline-none outline-0'
                    : 'border border-slate-600 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Agendadas
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
              Visão geral
            </button>

            <button
              onClick={() => { setActiveTab('projects'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'projects' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0" />
              </svg>
              Projetos
            </button>

            <button
              onClick={() => { setActiveTab('ai-chat'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'ai-chat' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Chat IA
            </button>

            <button
              onClick={() => { setActiveTab('agent-canvas'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'agent-canvas' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Canvas de agentes
            </button>

            <button
              onClick={() => { setActiveTab('content-creation'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'content-creation' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l2 2-2 2" />
              </svg>
              Criação de conteúdo
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
              Carteira
            </button>

            <button
              onClick={() => { setActiveTab('billing'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'billing' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Faturamento
            </button>

            <button
              onClick={() => { setActiveTab('connectivity'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'connectivity' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.866 0-7 3.134-7 7m7-11c5.523 0 10 4.477 10 10m-5 0a5 5 0 00-10 0" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19h.01" />
              </svg>
              Conectividade
            </button>

            <button
              onClick={() => { setActiveTab('templates'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'templates' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Modelos
            </button>

            <button
              onClick={() => { setActiveTab('use-cases'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'use-cases' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Casos de uso
            </button>

            <button
              onClick={() => { setActiveTab('download'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'download' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar IDE
            </button>

            <button
              onClick={() => { setActiveTab('admin'); setSidebarOpen(false); }}
              className={`aethel-sidebar-item aethel-w-full ${activeTab === 'admin' ? 'active' : ''}`}
            >
              <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Painel admin
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="aethel-flex-1 aethel-min-h-screen aethel-bg-slate-900 aethel-text-slate-100">
          {/* Content based on active tab */}
          <AethelDashboardPrimaryTabContent {...dashboardTabContentProps} />
          <AethelDashboardSecondaryTabContent {...dashboardTabContentProps} />
        </main>
      </div>
    </div>
  )
}
