'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';

import { getAuthHeaders } from '@/components/ide/fullscreen/workbench-helpers';
import { createComponentLogger } from '@/lib/observability/logger';

type FullAccessGrant = {
  id: string
  userId: string
  projectId?: string | null
  scope: string[]
  expiresAt: string
  status: 'active' | 'expired' | 'revoked'
}

type FullAccessResponse = {
  error?: string
  message?: string
  metadata?: {
    grants?: FullAccessGrant[]
  }
}

type UseWorkbenchFullAccessParams = {
  hasToken: boolean
  projectId: string
}

const log = createComponentLogger('ide.fullscreen.useWorkbenchFullAccess')

export function useWorkbenchFullAccess({
  hasToken,
  projectId,
}: UseWorkbenchFullAccessParams) {
  const [fullAccessBusy, setFullAccessBusy] = useState(false)

  const { data: fullAccessData, mutate: mutateFullAccess } = useSWR<FullAccessResponse>(
    hasToken ? '/api/studio/access/full' : null,
    async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      })
      const payload = (await response.json().catch(() => ({}))) as FullAccessResponse
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Falha na requisicao: ${response.status}`)
      }
      return payload
    },
    {
      refreshInterval: 30000,
    },
  )

  const fullAccessActiveGrant = useMemo(() => {
    const grants = fullAccessData?.metadata?.grants || []
    return grants.find((grant) => grant.status === 'active') ?? null
  }, [fullAccessData?.metadata?.grants])

  const fullAccessExpiryLabel = useMemo(() => {
    if (!fullAccessActiveGrant?.expiresAt) return null
    return new Date(fullAccessActiveGrant.expiresAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [fullAccessActiveGrant?.expiresAt])

  const toggleFullAccess = useCallback(() => {
    if (!hasToken || fullAccessBusy) return

    void (async () => {
      setFullAccessBusy(true)
      try {
        if (fullAccessActiveGrant?.id) {
          const response = await fetch(`/api/studio/access/full/${encodeURIComponent(fullAccessActiveGrant.id)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
          })
          const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Falha na requisicao: ${response.status}`)
          }
        } else {
          const response = await fetch('/api/studio/access/full', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              projectId: projectId || undefined,
              durationMinutes: 15,
              reason: `ide_full_access:${projectId || 'workspace'}`,
              scope: projectId ? [`project:${projectId}`, 'workspace:apply'] : ['workspace:apply'],
            }),
          })
          const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Falha na requisicao: ${response.status}`)
          }
        }

        await mutateFullAccess()
      } catch (error) {
        log.error('Failed to toggle workbench full access', error, {
          action: 'toggleFullAccess',
          projectId,
          hasActiveGrant: Boolean(fullAccessActiveGrant?.id),
        })
      } finally {
        setFullAccessBusy(false)
      }
    })()
  }, [fullAccessActiveGrant?.id, fullAccessBusy, hasToken, mutateFullAccess, projectId])

  return {
    fullAccessActiveGrant,
    fullAccessBusy,
    fullAccessExpiryLabel,
    toggleFullAccess,
  }
}

export type { FullAccessGrant };
