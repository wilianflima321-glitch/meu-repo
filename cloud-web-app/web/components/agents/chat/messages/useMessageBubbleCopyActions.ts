'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

type CopyHandler = (content: string) => void | Promise<void>

type CopyScope = 'message' | 'code' | null

export function useMessageBubbleCopyActions(onCopy: CopyHandler) {
  const toast = useToast()
  const [copiedScope, setCopiedScope] = useState<CopyScope>(null)
  const timeoutRef = useRef<number | null>(null)

  const scheduleReset = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setCopiedScope(null)
      timeoutRef.current = null
    }, 2000)
  }, [])

  const runCopy = useCallback(
    async (content: string, scope: Exclude<CopyScope, null>, title: string, description: string) => {
      try {
        await Promise.resolve(onCopy(content))
        setCopiedScope(scope)
        toast.success(title, description)
        scheduleReset()
      } catch {
        toast.error('Copy failed', 'Could not send the content to the clipboard.')
      }
    },
    [onCopy, scheduleReset, toast]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    copiedCode: copiedScope === 'code',
    copiedMessage: copiedScope === 'message',
    copyCode: (content: string) =>
      runCopy(content, 'code', 'Code copied', 'The block was sent to the clipboard.'),
    copyMessage: (content: string) =>
      runCopy(content, 'message', 'Response copied', 'The response was sent to the clipboard.'),
  }
}
