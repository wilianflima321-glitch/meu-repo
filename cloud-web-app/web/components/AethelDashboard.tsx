'use client'
import { AethelAPIClient } from '@/lib/api'
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
import {
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { isAuthenticated } from '@/lib/auth'
import { useAssetDownload, useJobQueue, useRenderProgress } from '@/hooks/useAethelGateway'
import { RenderQueue, type RenderJob } from './dashboard/RenderProgress'
import {
  type ActiveTab,
  type DashboardSettings,
  type Project,
  type SessionEntry,
  type SessionFilter,
  type ToastState,
  type ToastType,
  type UseCase,
  type WorkflowTemplate,
  STORAGE_KEYS,
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
} from './dashboard/aethel-dashboard-defaults'
import {
  createInitialSessionEntry,
  createSavedSessionEntry,
  toggleSessionFavorite,
  toggleSessionScheduled,
} from './dashboard/aethel-dashboard-session-utils'
import { createProjectEntry, removeProjectEntry } from './dashboard/aethel-dashboard-project-utils'
import {
  computeReceivableSummary,
  computeWalletUsageStats,
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
  mapPurchaseIntentError,
  mapSubscribeError,
  mapTransferError,
  validatePurchaseInput,
  validateTransferInput,
} from './dashboard/aethel-dashboard-billing-utils'

// Importação dos subcomponentes extraídos
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

export default function AethelDashboard() {
  const { mutate } = useSWRConfig()

  // State
  const [workflowTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES)
  const [useCases] = useState<UseCase[]>(DEFAULT_USE_CASES)
  const [showToast, setShowToast] = useState<ToastState | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>(() => {
    if (typeof window === 'undefined') return []
    return resolveStoredSessions(window.localStorage.getItem(STORAGE_KEYS.sessionHistory))
  })
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window === 'undefined') return 'overview'
    return resolveStoredActiveTab(window.localStorage.getItem(STORAGE_KEYS.activeTab))
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
  const [chatMessage, setChatMessage] = useState('')
  const [livePreviewSuggestions, setLivePreviewSuggestions] = useState<string[]>([])
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
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)
  const [isTrialActive, setIsTrialActive] = useState(true)
  const trialDaysLeft = 14
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [hasToken, setHasToken] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  // Hooks
  const { startDownload } = useAssetDownload()
  const { renders, cancelRender } = useRenderProgress()
  const { jobs: queueJobs } = useJobQueue()

  // SWR Data
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

  const { data: walletData } = useSWR<WalletSummary>(walletKey, () => AethelAPIClient.getWalletSummary(), {
    refreshInterval: 30000,
  })

  const { data: currentPlan } = useSWR(currentPlanKey, () => AethelAPIClient.getCurrentPlan())
  const { data: creditsData } = useSWR(creditsKey, () => AethelAPIClient.getCredits())

  // Memos
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
        name: render.message || \`Renderização \${index + 1}\`,
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

  const walletStats = useMemo(() => computeWalletUsageStats(walletData), [walletData])
  const receivableSummary = useMemo(() => computeReceivableSummary(walletData), [walletData])

  const billingPlansForUI = useMemo(() => {
    if (!billingData) return []
    return billingData.map(plan => ({
      id: String(plan.id),
      name: plan.name,
      price: plan.priceBRL ?? plan.price ?? 0,
      currency: plan.currency ?? 'BRL',
      interval: plan.interval ?? 'mês',
      features: plan.features ?? [],
      description: plan.description ?? '',
      isPopular: plan.popular ?? false
    }))
  }, [billingData])

  // Callbacks
  const showToastMessage = useCallback((message: string, type: ToastType = 'info') => {
    setShowToast({ message, type })
    const timeoutId = window.setTimeout(() => setShowToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab)
    window.localStorage.setItem(STORAGE_KEYS.activeTab, tab)
  }, [])

  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const project = createProjectEntry(newProjectName, newProjectType)
    setProjects(prev => [project, ...prev])
    setNewProjectName('')
    showToastMessage('Projeto criado com sucesso!', 'success')
  }, [newProjectName, newProjectType, showToastMessage])

  const handleDeleteProject = useCallback((id: string) => {
    setProjects(prev => removeProjectEntry(prev, id))
    showToastMessage('Projeto removido', 'info')
  }, [showToastMessage])

  const handleDownload = useCallback((platform: string) => {
    startDownload(platform)
    showToastMessage(\`Iniciando download para \${platform}...\`, 'info')
  }, [startDownload, showToastMessage])

  const handleSubscribe = useCallback(async (planId: string) => {
    setSubscribingPlan(planId)
    setSubscribeError(null)
    setSubscribeMessage(null)

    try {
      const response = await AethelAPIClient.subscribe(planId)
      setSubscribeMessage(\`Assinatura do plano \${planId} iniciada com sucesso!\`)
      showToastMessage('Assinatura processada!', 'success')
      mutate(CURRENT_PLAN_KEY)
    } catch (err) {
      setSubscribeError(mapSubscribeError(err))
    } finally {
      setSubscribingPlan(null)
    }
  }, [mutate, showToastMessage])

  const handleManageSubscription = useCallback(() => {
    window.open('https://billing.aethel.ai', '_blank')
  }, [])

  const handlePurchase = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setWalletSubmitting(true)
    setWalletActionError(null)
    setWalletActionMessage(null)

    const validation = validatePurchaseInput(purchaseForm.amount)
    if (!validation.valid) {
      setWalletActionError(validation.error)
      setWalletSubmitting(false)
      return
    }

    try {
      const response = await AethelAPIClient.createPurchaseIntent(
        Number(purchaseForm.amount),
        purchaseForm.currency,
        purchaseForm.reference
      )
      setLastPurchaseIntent(response)
      setWalletActionMessage('Intenção de compra criada com sucesso!')
      mutate(WALLET_KEY)
    } catch (err) {
      setWalletActionError(mapPurchaseIntentError(err))
    } finally {
      setWalletSubmitting(false)
    }
  }, [purchaseForm, mutate])

  const handleTransfer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setWalletSubmitting(true)
    setWalletActionError(null)
    setWalletActionMessage(null)

    const validation = validateTransferInput(transferForm.targetUserId, transferForm.amount)
    if (!validation.valid) {
      setWalletActionError(validation.error)
      setWalletSubmitting(false)
      return
    }

    try {
      const response = await AethelAPIClient.transferCredits(
        transferForm.targetUserId,
        Number(transferForm.amount),
        transferForm.currency,
        transferForm.reference
      )
      setLastTransferReceipt(response)
      setWalletActionMessage('Transferência realizada com sucesso!')
      mutate(WALLET_KEY)
    } catch (err) {
      setWalletActionError(mapTransferError(err))
    } finally {
      setWalletSubmitting(false)
    }
  }, [transferForm, mutate])

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])

  // Effects
  useEffect(() => {
    setAuthReady(true)
    setHasToken(isAuthenticated())
  }, [])

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

  if (!authReady) return null

  return (
    <div className="aethel-min-h-screen aethel-bg-slate-950 aethel-text-slate-50 aethel-flex aethel-flex-column">
      {isTrialActive && (
        <TrialBanner daysLeft={trialDaysLeft} onUpgrade={() => handleTabChange('billing')} />
      )}

      <DashboardHeader
        healthData={healthData}
        aiActivity={aiActivity}
        onSettingsClick={() => handleTabChange('settings')}
      />

      <div className="aethel-flex aethel-flex-1 aethel-overflow-hidden">
        <AethelDashboardSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="aethel-flex-1 aethel-overflow-y-auto aethel-relative">
          {activeTab === 'overview' && (
            <DashboardOverviewTab
              walletData={walletData}
              creditsData={creditsData}
              healthData={healthData}
              sessionHistory={sessionHistory}
              onStartProject={() => handleTabChange('projects')}
              onViewWallet={() => handleTabChange('wallet')}
            />
          )}

          {activeTab === 'projects' && (
            <DashboardProjectsTab
              projects={projects}
              newProjectName={newProjectName}
              setNewProjectName={setNewProjectName}
              newProjectType={newProjectType}
              setNewProjectType={setNewProjectType}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {activeTab === 'chat' && (
            <DashboardAIChatTab
              chatHistory={chatHistory}
              chatMessage={chatMessage}
              setChatMessage={setChatMessage}
              isGenerating={isGenerating}
              chatMode={chatMode}
              setChatMode={setChatMode}
              suggestions={livePreviewSuggestions}
              onSendMessage={() => {}}
            />
          )}

          {activeTab === 'wallet' && (
            <DashboardWalletTab
              walletData={walletData}
              creditsData={creditsData}
              walletStats={walletStats}
              receivableSummary={receivableSummary}
              purchaseForm={purchaseForm}
              setPurchaseForm={setPurchaseForm}
              transferForm={transferForm}
              setTransferForm={setTransferForm}
              onPurchase={handlePurchase}
              onTransfer={handleTransfer}
              submitting={walletSubmitting}
              actionMessage={walletActionMessage}
              actionError={walletActionError}
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
            </div>
          )}

          {activeTab === 'connectivity' && (
            <DashboardConnectivityTab connectivityData={null} />
          )}

          {activeTab === 'content-creation' && (
            <DashboardContentCreationTab
              renderJobs={renderJobs}
              exportJobs={exportJobs}
              onCancelRender={cancelRender}
            />
          )}

          {activeTab === 'unreal' && (
            <DashboardUnrealTab />
          )}

          {activeTab === 'download' && (
            <DownloadTab onDownload={handleDownload} />
          )}

          {activeTab === 'templates' && (
            <TemplatesTab templates={workflowTemplates} onSelect={() => {}} />
          )}

          {activeTab === 'use-cases' && (
            <UseCasesTab useCases={useCases} onSelect={() => {}} />
          )}

          {activeTab === 'admin' && (
            <AdminTab />
          )}

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
        <div className={\`aethel-fixed aethel-bottom-6 aethel-right-6 aethel-px-4 aethel-py-2 aethel-rounded-lg aethel-shadow-lg aethel-z-50 aethel-animate-in aethel-slide-in-from-bottom-4 \${
          showToast.type === 'success' ? 'aethel-bg-emerald-600' : 
          showToast.type === 'error' ? 'aethel-bg-red-600' : 'aethel-bg-blue-600'
        }\`}>
          {showToast.message}
        </div>
      )}
    </div>
  )
}
