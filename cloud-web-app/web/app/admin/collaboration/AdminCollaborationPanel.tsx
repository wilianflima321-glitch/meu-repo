'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getToken } from '@/lib/auth'
import {
  CollaborationAdminView,
  type ProjectItem,
  type ReadinessResponse,
  type ReadinessRuntimeRow,
} from './page.parts'

function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function AdminCollaborationPanel() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingProjectId, setSubmittingProjectId] = useState<string | null>(null)
  const [submittingEvidenceKey, setSubmittingEvidenceKey] = useState<string | null>(null)
  const [stressProofUrlInput, setStressProofUrlInput] = useState('')
  const [stressProofSummaryInput, setStressProofSummaryInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projectsRes, readinessRes] = await Promise.all([
        fetch('/api/admin/collaboration', { headers: getAuthHeaders() }),
        fetch('/api/admin/collaboration/readiness', { headers: getAuthHeaders() }),
      ])

      const projectsJson = (await projectsRes.json().catch(() => ({}))) as { items?: ProjectItem[]; error?: string }
      const readinessJson = (await readinessRes.json().catch(() => ({}))) as ReadinessResponse & { error?: string }

      if (!projectsRes.ok) {
        throw new Error(projectsJson.error || 'Failed to load collaboration projects.')
      }
      if (!readinessRes.ok) {
        throw new Error(readinessJson.error || 'Failed to load collaboration readiness.')
      }

      setProjects(projectsJson.items || [])
      setReadiness(readinessJson)
      setStatusMessage('Painel de colaboracao atualizado.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load collaboration data.')
      setProjects([])
      setReadiness(null)
      setStatusMessage(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!readiness) return
    if (!stressProofUrlInput && readiness.evidence.stressProofUrl) {
      setStressProofUrlInput(readiness.evidence.stressProofUrl)
    }
    if (!stressProofSummaryInput && readiness.evidence.stressProofSummary) {
      setStressProofSummaryInput(readiness.evidence.stressProofSummary)
    }
  }, [readiness, stressProofSummaryInput, stressProofUrlInput])

  const updateStatus = useCallback(
    async (projectId: string, status: 'active' | 'paused') => {
      setSubmittingProjectId(projectId)
      setError(null)
      try {
        const response = await fetch('/api/admin/collaboration', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ projectId, status }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to update project state.')
        }
        setStatusMessage(`Project ${status === 'active' ? 'reactivated' : 'suspended'} successfully.`)
        await fetchAll()
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to update project state.')
        setStatusMessage(null)
      } finally {
        setSubmittingProjectId(null)
      }
    },
    [fetchAll]
  )

  const recordEvidence = useCallback(
    async (
      evidenceType: 'syntheticConcurrency' | 'reconnectReplay' | 'conflictReplay',
      passed: boolean
    ) => {
      const evidenceKey = `${evidenceType}:${passed ? 'pass' : 'fail'}`
      setSubmittingEvidenceKey(evidenceKey)
      setError(null)
      try {
        const response = await fetch('/api/admin/collaboration/evidence', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            evidenceType,
            passed,
            notes: passed ? 'Evidence validated in admin panel.' : 'Evidence check failed in admin panel.',
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to record evidence.')
        }
        setStatusMessage(`${evidenceType} marcado como ${passed ? 'PASS' : 'FAIL'} com trilha auditavel.`)
        await fetchAll()
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to record evidence.')
        setStatusMessage(null)
      } finally {
        setSubmittingEvidenceKey(null)
      }
    },
    [fetchAll]
  )

  const recordStressProof = useCallback(async () => {
    const proofUrl = stressProofUrlInput.trim()
    if (!proofUrl) {
      setError('Enter a stress test evidence URL before saving.')
      return
    }
    setSubmittingEvidenceKey('stress-proof')
    setError(null)
    try {
      const response = await fetch('/api/admin/collaboration/evidence/stress-proof', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          proofUrl,
          summary: stressProofSummaryInput.trim() || null,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!response.ok) {
        throw new Error(payload.error || payload.message || 'Failed to record stress proof.')
      }
      setStatusMessage('Stress proof registrado com trilha auditavel.')
      await fetchAll()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to record stress proof.')
      setStatusMessage(null)
    } finally {
      setSubmittingEvidenceKey(null)
    }
  }, [fetchAll, stressProofSummaryInput, stressProofUrlInput])

  const readinessRuntimeRows = useMemo<ReadinessRuntimeRow[]>(() => {
    if (!readiness) return []
    return [
      { label: 'Redis configurado', value: readiness.runtime.redisConfigured, stale: false },
      { label: 'WebSocket configurado', value: readiness.runtime.websocketConfigured, stale: false },
      { label: 'WebRTC signaling configurado', value: readiness.runtime.signalingConfigured, stale: false },
      {
        label: 'Teste de concorrencia',
        value: readiness.evidence.syntheticConcurrency,
        stale: readiness.evidence.stale?.syntheticConcurrency || false,
      },
      {
        label: 'Replay de reconexao',
        value: readiness.evidence.reconnectReplay,
        stale: readiness.evidence.stale?.reconnectReplay || false,
      },
      {
        label: 'Replay de conflito',
        value: readiness.evidence.conflictReplay,
        stale: readiness.evidence.stale?.conflictReplay || false,
      },
    ]
  }, [readiness])

  return (
    <CollaborationAdminView
      projects={projects}
      readiness={readiness}
      readinessRuntimeRows={readinessRuntimeRows}
      loading={loading}
      error={error}
      statusMessage={statusMessage}
      submittingProjectId={submittingProjectId}
      submittingEvidenceKey={submittingEvidenceKey}
      stressProofUrlInput={stressProofUrlInput}
      stressProofSummaryInput={stressProofSummaryInput}
      fetchAll={fetchAll}
      updateStatus={updateStatus}
      recordEvidence={recordEvidence}
      recordStressProof={recordStressProof}
      setStressProofUrlInput={setStressProofUrlInput}
      setStressProofSummaryInput={setStressProofSummaryInput}
    />
  )
}

export default AdminCollaborationPanel
