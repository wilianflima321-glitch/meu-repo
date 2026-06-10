'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EditorApplyBridgeContextValue } from '@/components/ide/EditorApplyBridgeContext'
import type { AIChatOpsTab } from '@/components/agents/chat/presets'

interface UseAIChatOpsStateParams {
  editorBridge: EditorApplyBridgeContextValue | null
}

export function useAIChatOpsState({ editorBridge }: UseAIChatOpsStateParams) {
  const [opsTab, setOpsTab] = useState<AIChatOpsTab>('memory')
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)

  const openOpsTab = useCallback((tab: AIChatOpsTab) => {
    setShowAdvancedControls(true)
    setOpsTab(tab)
  }, [])

  useEffect(() => {
    if (editorBridge?.pendingDiff) {
      openOpsTab('diff')
    }
  }, [editorBridge?.pendingDiff, openOpsTab])

  useEffect(() => {
    const onOpenDiff = () => {
      openOpsTab('diff')
    }

    const onOpenExecution = () => {
      openOpsTab('execution')
    }

    window.addEventListener('aethel.ide.openChatDiff', onOpenDiff)
    window.addEventListener('aethel.ide.openChatExecution', onOpenExecution)

    return () => {
      window.removeEventListener('aethel.ide.openChatDiff', onOpenDiff)
      window.removeEventListener('aethel.ide.openChatExecution', onOpenExecution)
    }
  }, [openOpsTab])

  const handleAcceptPendingDiff = useCallback(
    (finalModified: string) => {
      if (!editorBridge) return

      const result = editorBridge.replaceEntireFile(finalModified)
      if (!result.ok) {
        window.alert(result.message)
        return
      }

      editorBridge.clearPendingDiff()
    },
    [editorBridge]
  )

  const handleRejectPendingDiff = useCallback(() => {
    editorBridge?.clearPendingDiff()
  }, [editorBridge])

  const toggleAdvancedControls = useCallback(() => {
    setShowAdvancedControls((previous) => !previous)
  }, [])

  const enableAdvancedControls = useCallback(() => {
    setShowAdvancedControls(true)
  }, [])

  return {
    enableAdvancedControls,
    handleAcceptPendingDiff,
    handleRejectPendingDiff,
    opsTab,
    setOpsTab,
    showAdvancedControls,
    toggleAdvancedControls,
  }
}
