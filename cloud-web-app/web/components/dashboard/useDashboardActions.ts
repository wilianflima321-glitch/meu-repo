'use client'

import type { FormEvent } from 'react'
import { useCallback } from 'react'
import {
  AethelAPIClient,
  type ChatMessage,
  type CopilotWorkflowSummary,
  type PurchaseIntentResponse,
  type TransferResponse,
} from '@/lib/api'
import { analytics } from '@/lib/analytics'
import {
  AdvancedChatRequestError,
  isProviderSetupError,
  requestAdvancedChat,
} from '@/lib/ai-chat-advanced-client'
import {
  buildLivePreviewContextPayload,
  buildLivePreviewPrompt,
  buildLivePreviewSuggestionMessage,
  buildLivePreviewSystemMessage,
  extractPrimaryAssistantContent,
} from './aethel-dashboard-livepreview-ai-utils'
import { extractApiContent, getAuthHeaders } from './aethel-dashboard-location-utils'
import {
  buildCopilotContextPatch,
  buildWorkflowTitle,
} from './aethel-dashboard-copilot-utils'
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
} from './aethel-dashboard-billing-utils'
import {
  DASHBOARD_DEFAULT_SETTINGS,
  type Point3,
} from './aethel-dashboard-core-types'
import {
  DEFAULT_MODEL,
  ONBOARDING_WIZARD_DISMISSED_KEY,
} from './aethel-dashboard-constants'
import type {
  ActiveTab,
  DashboardSettings,
  Project,
  SessionFilter,
  ToastType,
  UseCase,
  WorkflowTemplate,
} from './aethel-dashboard-model'
import { STORAGE_KEYS, clearStoredDashboardState } from './aethel-dashboard-model'
import { createInitialSessionEntry } from './aethel-dashboard-session-utils'
import { createProjectEntry, removeProjectEntry } from './aethel-dashboard-project-utils'
import { DEFAULT_PROJECTS, CURRENT_PLAN_KEY } from './aethel-dashboard-defaults'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type DashboardActionsInput = {
  trackEvent: (category: any, action: any, metadata?: Record<string, unknown>) => void
  showToastMessage: (message: string, type?: ToastType) => void
  persistCopilotScope: (workflowId: string | null, threadId: string | null) => void
  navigateToIdeWithContext: (source: string, entry: string) => void
  startDownload: (platform: string) => void
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
  useCases: UseCase[]
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
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.activeTab, tab)
    }
    trackEvent('user', 'settings_change', { section: 'dashboard-tab', tab })
  }, [setActiveTab, trackEvent])

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
  }, [chatAbortRef, setIsStreaming, showToastMessage, trackEvent])

  const handleOpenIdeLivePreview = useCallback(() => {
    setFirstValueOpenedIde(true)
    navigateToIdeWithContext('dashboard-first-value', 'live-preview')
  }, [setFirstValueOpenedIde, navigateToIdeWithContext])

  const handleOpenAIChatFromGuide = useCallback(() => {
    setActiveTab('ai-chat')
    setChatMode('chat')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.activeTab, 'ai-chat')
    }
    trackEvent('ai', 'ai_chat', { source: 'first-value-guide', action: 'open-ai-chat' })
  }, [setActiveTab, setChatMode, trackEvent])

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
    setFullAccessBusy,
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
  }, [
    setSessionHistory,
    setSessionFilter,
    setActiveTab,
    setChatHistory,
    setChatMessage,
    setLivePreviewSuggestions,
    setSettings,
    setProjects,
    setActiveWorkflowId,
    setActiveChatThreadId,
    setConnectFromWorkflowId,
    persistCopilotScope,
    showToastMessage,
  ])

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }))
  }, [setSettings])

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
  }, [
    setSessionHistory,
    settings,
    setChatHistory,
    setLivePreviewSuggestions,
    setChatMessage,
    setActiveWorkflowId,
    setActiveChatThreadId,
    setConnectFromWorkflowId,
    persistCopilotScope,
    showToastMessage,
    trackEvent,
  ])

  const handleCreateProject = useCallback(() => {
    const value = newProjectName.trim()
    if (!value) {
      showToastMessage('Defina um nome de projeto antes de criar.', 'error')
      return
    }

    const project = createProjectEntry(projects, value, newProjectType)
    setProjects((prev) => [project, ...prev])
    setNewProjectName('')
    showToastMessage('Projeto criado com sucesso.', 'success')
    trackEvent('project', 'project_create', { type: newProjectType })
  }, [newProjectName, newProjectType, projects, setProjects, setNewProjectName, showToastMessage, trackEvent])

  const handleDeleteProject = useCallback((id: number) => {
    setProjects((prev) => removeProjectEntry(prev, id))
    showToastMessage('Projeto removido.', 'info')
    trackEvent('project', 'project_delete', { projectId: id })
  }, [setProjects, showToastMessage, trackEvent])

  const handleProjectVersionChange = useCallback((versionId: string) => {
    if (!versionId) return
    showToastMessage(`Snapshot ${versionId} aplicado no workspace.`, 'info')
  }, [showToastMessage])

  const handleApplyDirectorNote = useCallback((title: string) => {
    setChatMessage(`Aplique a diretriz no projeto atual: ${title}`)
    setActiveTab('ai-chat')
    showToastMessage('Diretriz enviada para o Chat IA.', 'success')
  }, [setChatMessage, setActiveTab, showToastMessage])

  const handleDownload = useCallback((platform: string) => {
    startDownload(platform)
    showToastMessage(`Download iniciado para ${platform}.`, 'info')
  }, [startDownload, showToastMessage])

  const handleSubscribe = useCallback(async (planId: string, interval: 'month' | 'year' = 'month') => {
    setSubscribingPlan(planId)
    setSubscribeError(null)

    try {
      const response = await AethelAPIClient.subscribe(planId, interval)
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
  }, [mutate, setSubscribingPlan, setSubscribeError, showToastMessage])

  const handleManageSubscription = useCallback(() => {
    handleTabChange('billing')
  }, [handleTabChange])

  const handlePurchase = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
  }, [
    hasToken,
    purchaseForm.amount,
    purchaseForm.currency,
    purchaseForm.reference,
    setWalletSubmitting,
    setWalletActionError,
    setWalletActionMessage,
    setLastPurchaseIntent,
    formatCurrencyLabel,
    mutateWallet,
    mutateCredits,
  ])

  const handleTransfer = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
  }, [
    hasToken,
    transferForm.amount,
    transferForm.currency,
    transferForm.reference,
    transferForm.targetUserId,
    setWalletSubmitting,
    setWalletActionError,
    setWalletActionMessage,
    setLastTransferReceipt,
    formatCurrencyLabel,
    mutateWallet,
    mutateCredits,
  ])

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
  }, [workflowTemplates, setChatMessage, setActiveTab, showToastMessage])

  const persistOnboardingProgress = useCallback((action: 'complete_step' | 'skip', step?: string) => {
    if (!hasToken) return

    void (async () => {
      try {
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(step ? { action, step } : { action }),
        })

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        await mutateOnboarding()
      } catch (error) {
        trackEvent('onboarding', 'wizard_sync_error', {
          action,
          step: step || null,
          error: error instanceof Error ? error.message : 'unknown',
        })
      }
    })()
  }, [hasToken, mutateOnboarding, trackEvent])

  const handleDismissOnboardingWizard = useCallback((reason: 'skip' | 'complete') => {
    setShowOnboardingWizard(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_WIZARD_DISMISSED_KEY, '1')
    }
    trackEvent('onboarding', 'wizard_dismiss', { reason })
  }, [setShowOnboardingWizard, trackEvent])

  const handleOnboardingComplete = useCallback((data: { template: string; name: string; description: string }) => {
    handleDismissOnboardingWizard('complete')
    persistOnboardingProgress('complete_step', 'welcome')
    if (data?.name?.trim()) {
      setNewProjectName(data.name.trim())
    }
    if (data?.template) {
      handleTemplateSelect(data.template)
    }
  }, [handleDismissOnboardingWizard, handleTemplateSelect, persistOnboardingProgress, setNewProjectName])

  const handleOnboardingSkip = useCallback(() => {
    handleDismissOnboardingWizard('skip')
    persistOnboardingProgress('skip')
  }, [handleDismissOnboardingWizard, persistOnboardingProgress])

  const handleUseCaseSelect = useCallback((useCaseId: string) => {
    const selected = useCases.find((item) => item.id === useCaseId)
    if (!selected) return
    setChatMessage(`Iniciar caso de uso "${selected.name}" focando em: ${selected.features.join(', ')}.`)
    setActiveTab('ai-chat')
    showToastMessage(`Caso de uso "${selected.name}" preparado.`, 'success')
  }, [useCases, setChatMessage, setActiveTab, showToastMessage])

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
  }, [
    setConnectBusy,
    copilotProjectId,
    setCopilotWorkflows,
    setActiveWorkflowId,
    setActiveChatThreadId,
    setConnectFromWorkflowId,
    persistCopilotScope,
    showToastMessage,
  ])

  const handleSelectWorkflow = useCallback((workflowId: string) => {
    const workflow = copilotWorkflows.find((item) => String(item.id) === String(workflowId))
    const threadId = workflow?.chatThreadId ? String(workflow.chatThreadId) : null
    setActiveWorkflowId(workflowId)
    setActiveChatThreadId(threadId)
    persistCopilotScope(workflowId, threadId)
  }, [copilotWorkflows, setActiveWorkflowId, setActiveChatThreadId, persistCopilotScope])

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
  }, [activeWorkflowId, setConnectBusy, setCopilotWorkflows, showToastMessage])

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
  }, [
    activeWorkflowId,
    setConnectBusy,
    copilotWorkflows,
    setCopilotWorkflows,
    setActiveWorkflowId,
    setActiveChatThreadId,
    persistCopilotScope,
    showToastMessage,
  ])

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
  }, [
    activeWorkflowId,
    connectFromWorkflowId,
    copilotProjectId,
    setConnectBusy,
    showToastMessage,
  ])

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
  }, [
    chatMessage,
    isStreaming,
    chatHistory,
    copilotProjectId,
    chatAbortRef,
    setChatMessage,
    setChatHistory,
    setIsStreaming,
    setFirstValueAiSuccess,
    setAiProviderGate,
    trackEvent,
  ])

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
  }, [setSelectedPreviewPoint, activeWorkflowId, copilotProjectId])

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
  }, [
    isGenerating,
    selectedPreviewPoint,
    copilotProjectId,
    setIsGenerating,
    setLivePreviewSuggestions,
    setChatHistory,
  ])

  const dismissFirstValueGuide = useCallback(() => {
    setShowFirstValueGuide(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('aethel.dashboard.first-value.dismissed', '1')
    }
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
    handleDismissOnboardingWizard,
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
  }
}
