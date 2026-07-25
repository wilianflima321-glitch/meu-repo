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
    async (finalModified: string) => {
      if (!editorBridge) return
      if (applyBusy) return

      const pending = editorBridge.pendingDiff
      const filePath = pending?.path || editorBridge.activeFilePath
      if (!filePath) {
        const message = 'Open a file before applying the pending edit.'
        setLastApplyDeny(message)
        announceApplyDeny('Apply blocked', message)
        return
      }

      const original = pending?.oldContent ?? ''
      setApplyBusy(true)
      setLastApplyDeny(null)

      try {
        const governed = await runGovernedChangeApply({
          filePath,
          original,
          modified: finalModified,
        })

        if (!governed.ok) {
          const receipt = toGovernedApplyReceipt(filePath, governed)
          pushReceipt(receipt)
          setLastApplyDeny(
            `${receipt.code || 'APPLY_DENIED'}: ${receipt.detail || governed.banner}`,
          )
          announceApplyDeny(governed.copy.title, governed.copy.detail)
          log.warn('chat_diff_apply_denied', {
            code: receipt.code,
            runId: receipt.runId,
            filePath,
            outcome: receipt.outcome,
            marketingAllowed: receipt.marketingAllowed,
          })
          // Fail-closed: keep pendingDiff so the user can fix / reject
          return
        }

        const applied = toGovernedApplyReceipt(filePath, governed)
        pushReceipt(applied)
        log.info('chat_diff_apply_receipt', {
          outcome: applied.outcome,
          runId: applied.runId,
          filePath,
          marketingAllowed: applied.marketingAllowed,
        })

        const result = editorBridge.replaceEntireFile(finalModified)
        if (!result.ok) {
          const editorDeny: GovernedApplyReceipt = {
            outcome: 'denied',
            filePath,
            touchedPaths: [filePath],
            taskDependencies: [],
            fileValidation: [],
            code: 'EDITOR_REPLACE_FAILED',
            detail: result.message,
            at: new Date().toISOString(),
            marketingAllowed: false,
            composerSurpassClaim: false,
          }
          pushReceipt(editorDeny)
          setLastApplyDeny(result.message)
          announceApplyDeny('Editor update failed', result.message)
          return
        }

        editorBridge.clearPendingDiff()
        setLastApplyDeny(null)
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
      } finally {
        setApplyBusy(false)
      }
    },
    [applyBusy, editorBridge, pushReceipt]
  )

  const handleRejectPendingDiff = useCallback(() => {
    setLastApplyDeny(null)
    editorBridge?.clearPendingDiff()
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
