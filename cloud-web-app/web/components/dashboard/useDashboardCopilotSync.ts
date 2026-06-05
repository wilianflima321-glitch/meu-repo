'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { AethelAPIClient, type ChatMessage, type CopilotWorkflowSummary } from '@/lib/api'
import {
  extractCopilotWorkflowList,
  mapApiMessagesToChatHistory,
} from './aethel-dashboard-copilot-utils'

type UseDashboardCopilotSyncInput = {
  activeChatThreadId: string | null
  activeWorkflowId: string | null
  copilotProjectId: string | null
  hasToken: boolean
  persistCopilotScope: (workflowId: string | null, threadId: string | null) => void
  setActiveChatThreadId: Dispatch<SetStateAction<string | null>>
  setActiveWorkflowId: Dispatch<SetStateAction<string | null>>
  setChatHistory: Dispatch<SetStateAction<ChatMessage[]>>
  setCopilotWorkflows: Dispatch<SetStateAction<CopilotWorkflowSummary[]>>
  showToastMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
}

export function useDashboardCopilotSync({
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
}: UseDashboardCopilotSyncInput) {
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
      } catch {
        showToastMessage('Failed to load Copilot workflows.', 'error')
      }
    })()
  }, [
    activeWorkflowId,
    copilotProjectId,
    hasToken,
    persistCopilotScope,
    setActiveChatThreadId,
    setActiveWorkflowId,
    setCopilotWorkflows,
    showToastMessage,
  ])

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
  }, [activeChatThreadId, setChatHistory])
}
