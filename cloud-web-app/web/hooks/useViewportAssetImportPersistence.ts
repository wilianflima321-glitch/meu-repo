'use client'

import { useCallback, useState } from 'react'

import type { ViewportAssetImportBatch } from '@/lib/viewport/viewport-asset-import'
import {
  canPersistViewportAssetImport,
  persistViewportAssetImportBatch,
  type ViewportAssetImportPersistenceResult,
  type ViewportAssetImportPersistenceStatus,
} from '@/lib/viewport/viewport-asset-import-persistence'

function getBrowserToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('aethel-token')
}

export function useViewportAssetImportPersistence(projectId?: string | null) {
  const [status, setStatus] = useState<ViewportAssetImportPersistenceStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)

  const persistBatch = useCallback(async (batch: ViewportAssetImportBatch): Promise<ViewportAssetImportPersistenceResult> => {
    if (!canPersistViewportAssetImport(projectId)) {
      setStatus('skipped')
      setLastError(null)
      return { ok: false, status: 0, error: 'No persisted project context is available for this viewport asset import.' }
    }

    setStatus('saving')
    setLastError(null)
    const result = await persistViewportAssetImportBatch({
      projectId,
      batch,
      token: getBrowserToken(),
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
    canPersist: canPersistViewportAssetImport(projectId),
    status,
    lastError,
    persistBatch,
  }
}
