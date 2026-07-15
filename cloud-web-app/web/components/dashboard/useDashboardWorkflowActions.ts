'use client'

import { useCallback } from 'react'
import { AethelAPIClient, type CopilotWorkflowSummary } from '@/lib/api'
import {
  buildCopilotContextPatch,
  buildWorkflowTitle,
} from './aethel-dashboard-copilot-utils'
import { getAuthHeaders } from './aethel-dashboard-location-utils'
import type { ToastType } from './aethel-dashboard-model'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

type DashboardWorkflowActionsInput = {
  showToastMessage: (message: string, type?: ToastType) => void
  persistCopilotScope: (workflowId: string | null, threadId: string | null) => void
  copilotProjectId: string | null
  copilotWorkflows: CopilotWorkflowSummary[]
  activeWorkflowId: string | null
  connectFromWorkflowId: string
  setActiveWorkflowId: SetState<string | null>
  setActiveChatThreadId: SetState<string | null>
  setConnectFromWorkflowId: SetState<string>
  setConnectBusy: SetState<boolean>
  setCopilotWorkflows: SetState<CopilotWorkflowSummary[]>
}

export function useDashboardWorkflowActions({
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
}: DashboardWorkflowActionsInput) {
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
      } catch {
        showToastMessage('Failed to create workflow.', 'error')
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
        showToastMessage('Workflow renamed successfully.', 'success')
      } catch {
        showToastMessage('Failed to rename workflow.', 'error')
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
      } catch {
        showToastMessage('Failed to archive workflow.', 'error')
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
    void showToastMessage('Copy history remains available in advanced IDE mode.', 'info')
  }, [showToastMessage])

  const handleImportContext = useCallback(() => {
    if (!activeWorkflowId || !connectFromWorkflowId) {
      showToastMessage('Select source and destination workflows to import context.', 'info')
      return
    }
    void (async () => {
      setConnectBusy(true)
      try {
        const source = await AethelAPIClient.getCopilotWorkflow(connectFromWorkflowId)
        const patch = buildCopilotContextPatch(activeWorkflowId, source?.workflow?.context)
        if (!patch) {
          showToastMessage('Source workflow has no useful context to import.', 'info')
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
          throw new Error(await response.text().catch(() => 'Failed to import context.'))
        }
        showToastMessage('Context imported into the active workflow.', 'success')
      } catch {
        showToastMessage('Failed to import context.', 'error')
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
      showToastMessage('Select source and destination workflows to merge.', 'info')
      return
    }
    void (async () => {
      await Promise.all([Promise.resolve(handleCopyHistory()), Promise.resolve(handleImportContext())])
    })()
  }, [activeWorkflowId, connectFromWorkflowId, handleCopyHistory, handleImportContext, showToastMessage])

  return {
    handleCreateWorkflow,
    handleSelectWorkflow,
    handleRenameWorkflow,
    handleArchiveWorkflow,
    handleCopyHistory,
    handleImportContext,
    handleMergeWorkflow,
  }
}
