'use client'

import { useCallback, useState } from 'react'

import type { ViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  canPersistViewportRenderJob,
  persistViewportRenderJob,
  type ViewportRenderJobPersistenceResult,
  type ViewportRenderJobPersistenceStatus,
} from '@/lib/viewport/viewport-render-persistence'

function getBrowserToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('aethel-token')
}

export function useViewportRenderJobPersistence(projectId?: string | null) {
  const [status, setStatus] = useState<ViewportRenderJobPersistenceStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)

  const persistContract = useCallback(async (
    contract: ViewportRenderJobContract,
    options: { enqueue?: boolean } = {},
  ): Promise<ViewportRenderJobPersistenceResult> => {
    if (!canPersistViewportRenderJob(projectId)) {
      setStatus('skipped')
      setLastError(null)
      return { ok: false, status: 0, error: 'No persisted project context is available for this viewport render contract.' }
    }

    setStatus('saving')
    setLastError(null)
    const result = await persistViewportRenderJob({
      projectId,
      contract,
      token: getBrowserToken(),
      enqueue: options.enqueue,
    })

    if (result.ok) {
      setStatus('saved')
      return result
    }

    setStatus('error')
    setLastError(result.error)
    return result
  }, [projectId])

  return {
    canPersist: canPersistViewportRenderJob(projectId),
    status,
    lastError,
    persistContract,
  }
}
