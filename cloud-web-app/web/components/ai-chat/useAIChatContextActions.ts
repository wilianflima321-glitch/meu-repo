'use client'

import { useCallback } from 'react'
import type { MentionContextPreviewBlock } from '@/components/ide/AIChatPanelPro.types'

export function useAIChatContextActions() {
  const handleCopy = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content)
  }, [])

  const handleOpenCodeContextResult = useCallback(
    (filePath: string, startLine?: number, endLine?: number) => {
      if (typeof window === 'undefined') return

      window.dispatchEvent(
        new CustomEvent('aethel.ide.openFileFromContext', {
          detail: {
            path: filePath,
            startLine,
            endLine,
            source: 'ai-codebase-context',
          },
        })
      )
    },
    []
  )

  const handleOpenMentionContextBlock = useCallback((block: MentionContextPreviewBlock) => {
    if (block.kind !== 'file') return

    const normalizedPath = block.tag.replace(/^@file:/i, '').trim()
    if (!normalizedPath || typeof window === 'undefined') return

    window.dispatchEvent(
      new CustomEvent('aethel.ide.openFileFromContext', {
        detail: {
          path: normalizedPath,
          source: 'ai-mention-context',
        },
      })
    )
  }, [])

  return {
    handleCopy,
    handleOpenCodeContextResult,
    handleOpenMentionContextBlock,
  }
}
