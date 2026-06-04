'use client'

import { useCallback } from 'react'
import { getAuthHeaders } from './aethel-dashboard-location-utils'
import type { ToastType } from './aethel-dashboard-model'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

type DashboardAccessActionsInput = {
  trackEvent: (category: string, action: string, metadata?: Record<string, unknown>) => void
  showToastMessage: (message: string, type?: ToastType) => void
  hasToken: boolean
  fullAccessBusy: boolean
  fullAccessActiveGrant: { id?: string } | null
  copilotProjectId: string | null
  mutateFullAccess: () => Promise<any>
  setFullAccessBusy: SetState<boolean>
}

async function parseAccessResponse(response: Response): Promise<{ error?: string; message?: string }> {
  return (await response.json().catch(() => ({}))) as { error?: string; message?: string }
}

export function useDashboardAccessActions({
  trackEvent,
  showToastMessage,
  hasToken,
  fullAccessBusy,
  fullAccessActiveGrant,
  copilotProjectId,
  mutateFullAccess,
  setFullAccessBusy,
}: DashboardAccessActionsInput) {
  const handleToggleFullAccess = useCallback(() => {
    if (!hasToken || fullAccessBusy) {
      if (!hasToken) showToastMessage('Sign in to change Full Access.', 'error')
      return
    }

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
          const payload = await parseAccessResponse(response)
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
          }
          showToastMessage('Full Access revoked.', 'success')
          trackEvent('security', 'full_access_revoke', {
            source: 'dashboard-header',
            projectId: copilotProjectId,
          })
        } else {
          const response = await fetch('/api/studio/access/full', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              projectId: copilotProjectId || undefined,
              durationMinutes: 15,
              reason: `dashboard_header_full_access:${copilotProjectId || 'workspace'}`,
              scope: copilotProjectId ? [`project:${copilotProjectId}`, 'workspace:apply'] : ['workspace:apply'],
            }),
          })
          const payload = await parseAccessResponse(response)
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
          }
          showToastMessage('Temporary Full Access enabled for 15 minutes.', 'success')
          trackEvent('security', 'full_access_grant', {
            source: 'dashboard-header',
            projectId: copilotProjectId,
            durationMinutes: 15,
          })
        }

        await mutateFullAccess()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update Full Access.'
        showToastMessage(message, 'error')
      } finally {
        setFullAccessBusy(false)
      }
    })()
  }, [
    hasToken,
    fullAccessBusy,
    fullAccessActiveGrant?.id,
    showToastMessage,
    trackEvent,
    copilotProjectId,
    mutateFullAccess,
    setFullAccessBusy,
  ])

  return { handleToggleFullAccess }
}
