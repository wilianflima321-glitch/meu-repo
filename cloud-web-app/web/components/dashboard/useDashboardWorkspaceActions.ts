'use client'

import { useCallback } from 'react'
import type { ChatMessage } from '@/lib/api'
import { DASHBOARD_DEFAULT_SETTINGS } from './aethel-dashboard-core-types'
import type {
  ActiveTab,
  DashboardSettings,
  Project,
  SessionFilter,
  ToastType,
} from './aethel-dashboard-model'
import { STORAGE_KEYS, clearStoredDashboardState } from './aethel-dashboard-model'
import { createProjectEntry, removeProjectEntry } from './aethel-dashboard-project-utils'
import { DEFAULT_PROJECTS } from './aethel-dashboard-defaults'
import { createInitialSessionEntry } from './aethel-dashboard-session-utils'
import { hasRestorableWorkspaceSession } from '@/lib/ide/workspace-session-resume'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

type DashboardWorkspaceActionsInput = {
  trackEvent: (category: string, action: string, metadata?: Record<string, unknown>) => void
  showToastMessage: (message: string, type?: ToastType) => void
  persistCopilotScope: (workflowId: string | null, threadId: string | null) => void
  navigateToIdeWithContext: (source: string, entry: string) => void
  settings: DashboardSettings
  projects: Project[]
  newProjectName: string
  newProjectType: Project['type']
  setActiveTab: SetState<ActiveTab>
  setChatMode: SetState<'chat' | 'agent' | 'canvas'>
  setChatMessage: SetState<string>
  setChatHistory: SetState<ChatMessage[]>
  setActiveWorkflowId: SetState<string | null>
  setActiveChatThreadId: SetState<string | null>
  setConnectFromWorkflowId: SetState<string>
  setSessionHistory: SetState<any[]>
  setSessionFilter: SetState<SessionFilter>
  setLivePreviewSuggestions: SetState<string[]>
  setSettings: SetState<DashboardSettings>
  setProjects: SetState<Project[]>
  setNewProjectName: SetState<string>
  setFirstValueOpenedIde: SetState<boolean>
}

export function useDashboardWorkspaceActions({
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
}: DashboardWorkspaceActionsInput) {
  const handleOpenIdeLivePreview = useCallback(() => {
    setFirstValueOpenedIde(true)
    navigateToIdeWithContext('dashboard-first-value', 'live-preview')
  }, [setFirstValueOpenedIde, navigateToIdeWithContext])

  const handleOpenAIChatFromGuide = useCallback(() => {
    setActiveTab('activity')
    setChatMode('chat')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.activeTab, 'activity')
    }
    navigateToIdeWithContext('dashboard-agent-handoff', 'agents')
    trackEvent('ai', 'ai_chat', { source: 'first-value-guide', action: 'open-agents-in-ide' })
  }, [navigateToIdeWithContext, setActiveTab, setChatMode, trackEvent])

  const handleOpenIdeFromHeader = useCallback(() => {
    const entry = typeof window !== 'undefined' && hasRestorableWorkspaceSession() ? 'resume' : 'quick-open'
    navigateToIdeWithContext('dashboard-header', entry)
  }, [navigateToIdeWithContext])

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
    showToastMessage('Panel reset to baseline.', 'info')
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
    showToastMessage('New session started.', 'success')
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
      showToastMessage('Set a project name before creating it.', 'error')
      return
    }

    const project = createProjectEntry(projects, value, newProjectType)
    setProjects((prev) => [project, ...prev])
    setNewProjectName('')
    showToastMessage('Project created successfully.', 'success')
    trackEvent('project', 'project_create', { type: newProjectType })
  }, [newProjectName, newProjectType, projects, setProjects, setNewProjectName, showToastMessage, trackEvent])

  const handleDeleteProject = useCallback((id: number) => {
    setProjects((prev) => removeProjectEntry(prev, id))
    showToastMessage('Project removed.', 'info')
    trackEvent('project', 'project_delete', { projectId: id })
  }, [setProjects, showToastMessage, trackEvent])

  return {
    handleOpenIdeLivePreview,
    handleOpenAIChatFromGuide,
    handleOpenIdeFromHeader,
    handleResetDashboard,
    handleToggleTheme,
    handleCreateNewSession,
    handleCreateProject,
    handleDeleteProject,
  }
}

