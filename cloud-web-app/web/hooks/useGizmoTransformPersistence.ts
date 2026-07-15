'use client'

import { useCallback, useState } from 'react'

import type { GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import { summarizeGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import {
  canPersistGizmoTransform,
  persistGizmoTransformOperation,
  type GizmoTransformPersistenceResult,
  type GizmoTransformPersistenceStatus,
} from '@/lib/viewport/gizmo-transform-persistence'

function getBrowserToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('aethel-token')
}

export function useGizmoTransformPersistence(projectId?: string | null) {
  const [status, setStatus] = useState<GizmoTransformPersistenceStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastOperationLabel, setLastOperationLabel] = useState<string | null>(null)

  const persistOperation = useCallback(async (operation: GizmoTransformOperation): Promise<GizmoTransformPersistenceResult> => {
    const operationLabel = summarizeGizmoTransformOperation(operation)
    setLastOperationLabel(operationLabel)

    if (!canPersistGizmoTransform(projectId)) {
      setStatus('skipped')
      setLastError(null)
      return { ok: false, status: 0, error: 'No persisted project context is available for this viewport transform.' }
    }

    setStatus('saving')
    setLastError(null)
    const result = await persistGizmoTransformOperation({
      projectId,
      operation,
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
    canPersist: canPersistGizmoTransform(projectId),
    status,
    lastError,
    lastOperationLabel,
    persistOperation,
  }
}
