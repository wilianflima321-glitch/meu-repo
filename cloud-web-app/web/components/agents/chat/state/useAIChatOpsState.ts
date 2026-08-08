'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EditorApplyBridgeContextValue } from '@aethel/ide-ui/EditorApplyBridgeContext'
import type { AIChatOpsTab } from '@/components/agents/chat/presets'
import { runGovernedChangeApply } from '@/lib/ai/governed-change-apply-client'
import {
  appendGovernedApplyReceipt,
  toGovernedApplyReceipt,
  type GovernedApplyReceipt,
} from '@/lib/production/agents-merge-governance'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('useAIChatOpsState')

interface UseAIChatOpsStateParams {
  editorBridge: EditorApplyBridgeContextValue | null
}

/**
 * Dispatch calm deny to any UI listening (Composer / tray).
 * Avoids coupling to a specific toast package.
 */
function announceApplyDeny(title: string, detail: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('aethel.ide.applyDenied', {
      detail: { title, detail },
    })
  )
}

export function useAIChatOpsState({ editorBridge }: UseAIChatOpsStateParams) {
  const [opsTab, setOpsTab] = useState<AIChatOpsTab>('memory')
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [applyBusy, setApplyBusy] = useState(false)
  const [lastApplyDeny, setLastApplyDeny] = useState<string | null>(null)
  const [applyReceipts, setApplyReceipts] = useState<GovernedApplyReceipt[]>([])

  const pushReceipt = useCallback((receipt: GovernedApplyReceipt) => {
    setApplyReceipts((prev) => appendGovernedApplyReceipt(prev, receipt))
  }, [])

  const openOpsTab = useCallback((tab: AIChatOpsTab) => {
    setShowAdvancedControls(true)
    setOpsTab(tab)
  }, [])

  useEffect(() => {
    if (editorBridge?.pendingDiffs && editorBridge.pendingDiffs.length > 0) {
      openOpsTab('diff')
    }
  }, [editorBridge?.pendingDiffs, openOpsTab])

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
    async (targetPath?: string, finalModifiedStr?: string) => {
      if (!editorBridge) return
      if (applyBusy) return

      const pendingList = editorBridge.pendingDiffs
      if (!pendingList || pendingList.length === 0) {
        const message = 'No pending edits to apply.'
        setLastApplyDeny(message)
        announceApplyDeny('Apply blocked', message)
        return
      }

      setApplyBusy(true)
      setLastApplyDeny(null)

      let hasError = false
      let errorMessage = ''
      
      const targets = targetPath 
        ? pendingList.filter(p => p.path === targetPath)
        : pendingList

      for (const pending of targets) {
        const filePath = pending.path
        const original = pending.oldContent
        const finalModified = (targetPath === pending.path && finalModifiedStr) 
          ? finalModifiedStr 
          : pending.newContent

        try {
          const governed = await runGovernedChangeApply({
            filePath,
            original,
            modified: finalModified,
          })

          if (!governed.ok) {
            const receipt = toGovernedApplyReceipt(filePath, governed)
            pushReceipt(receipt)
            const msg = `${receipt.code || 'APPLY_DENIED'}: ${receipt.detail || governed.banner}`
            setLastApplyDeny(msg)
            announceApplyDeny(governed.copy.title, governed.copy.detail)
            log.warn('chat_diff_apply_denied', {
              code: receipt.code,
              runId: receipt.runId,
              filePath,
              outcome: receipt.outcome,
              marketingAllowed: receipt.marketingAllowed,
            })
            hasError = true
            errorMessage = msg
            break // Stop on first error
          }

          const applied = toGovernedApplyReceipt(filePath, governed)
          pushReceipt(applied)
          log.info('chat_diff_apply_receipt', {
            outcome: applied.outcome,
            runId: applied.runId,
            filePath,
            marketingAllowed: applied.marketingAllowed,
          })
          
          // NOTE: We only update the active file in the editor bridge if it matches.
          // In a real multi-file system, we would apply all to the file system or workspace.
          if (editorBridge.activeFilePath === filePath) {
            editorBridge.replaceEntireFile(finalModified)
          }

        } catch (error) {
          const message = error instanceof Error ? error.message : 'Governed apply failed.'
          const crashDeny: GovernedApplyReceipt = {
            outcome: 'denied',
            filePath,
            touchedPaths: [filePath],
            taskDependencies: [],
            fileValidation: [],
            code: 'APPLY_EXCEPTION',
            detail: message,
            at: new Date().toISOString(),
            marketingAllowed: false,
            composerSurpassClaim: false,
          }
          pushReceipt(crashDeny)
          setLastApplyDeny(message)
          announceApplyDeny('Apply failed', message)
          log.error('chat_diff_apply_failed', error instanceof Error ? error : undefined)
          hasError = true
          errorMessage = message
          break
        }
      }

      if (!hasError) {
        if (targetPath) {
          editorBridge.stageDiffs(editorBridge.pendingDiffs.filter(p => p.path !== targetPath))
        } else {
          editorBridge.clearPendingDiffs()
        }
        setLastApplyDeny(null)
      } else {
        setLastApplyDeny(errorMessage)
      }
      
      setApplyBusy(false)
    },
    [applyBusy, editorBridge, pushReceipt]
  )

  const handleRejectPendingDiff = useCallback((targetPath?: string) => {
    setLastApplyDeny(null)
    if (!editorBridge) return
    if (targetPath) {
      editorBridge.stageDiffs(editorBridge.pendingDiffs.filter(p => p.path !== targetPath))
    } else {
      editorBridge.clearPendingDiffs()
    }
  }, [editorBridge])

  const toggleAdvancedControls = useCallback(() => {
    setShowAdvancedControls((previous) => !previous)
  }, [])

  const enableAdvancedControls = useCallback(() => {
    setShowAdvancedControls(true)
  }, [])

  return {
    applyBusy,
    applyReceipts,
    enableAdvancedControls,
    handleAcceptPendingDiff,
    handleRejectPendingDiff,
    lastApplyDeny,
    opsTab,
    setOpsTab,
    showAdvancedControls,
    toggleAdvancedControls,
  }
}
