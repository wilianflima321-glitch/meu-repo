'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { getToken } from '@/lib/auth'
import { createComponentLogger } from '@/lib/observability/logger'
import type {
  AICall,
  AICallsResponse,
  AIMetrics,
  AIMetricsResponse,
  AIReadiness,
  ChangeRunsResponse,
  CoreLoopDrillResponse,
  CoreLoopMetricsResponse,
  CoreLoopPromotionResponse,
  EmergencyResponse,
  FullAccessAuditResponse,
  L4ReadinessDossierResponse,
  LedgerIntegrityResponse,
  ProductionProbeResponse,
} from './types'

type OperatorNotice = { tone: 'success' | 'error'; text: string }
type RequestErrorPayload = { error?: string; message?: string }
type RunSampleClass = 'all' | 'production' | 'rehearsal'

const logger = createComponentLogger('admin-ai-monitor')

async function requestWithAuth<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const payload = (await response.json().catch(() => ({}))) as T & RequestErrorPayload
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
  }

  return payload
}

function fetchWithAuth<T>(url: string): Promise<T> {
  return requestWithAuth<T>(url)
}

function postWithAuth<T>(url: string, body: unknown): Promise<T> {
  return requestWithAuth<T>(url, { method: 'POST', body: JSON.stringify(body) })
}

export function useAiMonitorPageState() {
  const [isPaused, setIsPaused] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modelFilter, setModelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRunningDrill, setIsRunningDrill] = useState(false)
  const [isRunningProductionProbe, setIsRunningProductionProbe] = useState(false)
  const [operatorNotice, setOperatorNotice] = useState<OperatorNotice | null>(null)
  const [runSampleClass, setRunSampleClass] = useState<RunSampleClass>('production')

  const { data: metricsData } = useSWR<AIMetricsResponse>('/api/admin/ai/metrics', fetchWithAuth, { refreshInterval: isPaused ? 0 : 10000 })
  const { data: readinessData, mutate: refreshReadiness } = useSWR<AIReadiness>('/api/admin/ai/readiness', fetchWithAuth, { refreshInterval: isPaused ? 0 : 15000 })
  const { data: coreLoopMetricsData, mutate: refreshCoreLoopMetrics } = useSWR<CoreLoopMetricsResponse>('/api/admin/ai/core-loop-metrics', fetchWithAuth, { refreshInterval: isPaused ? 0 : 15000 })
  const { data: ledgerIntegrityData, mutate: refreshLedgerIntegrity } = useSWR<LedgerIntegrityResponse>('/api/admin/ai/ledger-integrity?days=30', fetchWithAuth, { refreshInterval: isPaused ? 0 : 15000 })
  const { data: promotionData, mutate: refreshPromotion } = useSWR<CoreLoopPromotionResponse>('/api/admin/ai/core-loop-promotion', fetchWithAuth, { refreshInterval: isPaused ? 0 : 15000 })
  const { data: fullAccessAuditData, mutate: refreshFullAccessAudit } = useSWR<FullAccessAuditResponse>('/api/admin/ai/full-access?includeInactive=true', fetchWithAuth, { refreshInterval: isPaused ? 0 : 15000 })
  const { data: dossierData, mutate: refreshDossier } = useSWR<L4ReadinessDossierResponse>('/api/admin/ai/l4-readiness-dossier', fetchWithAuth, { refreshInterval: isPaused ? 0 : 20000 })
  const { data: callsData, mutate: refreshCalls } = useSWR<AICallsResponse>(`/api/admin/ai/calls?limit=50&model=${modelFilter}&status=${statusFilter}`, fetchWithAuth, { refreshInterval: isPaused ? 0 : 5000 })
  const { data: emergencyData } = useSWR<EmergencyResponse>('/api/admin/emergency', fetchWithAuth, { refreshInterval: isPaused ? 0 : 10000 })
  const { data: runsData, mutate: refreshRuns } = useSWR<ChangeRunsResponse>(`/api/ai/change/runs?hours=72&limit=120&sampleClass=${runSampleClass}`, fetchWithAuth, { refreshInterval: isPaused ? 0 : 15000 })

  const metrics: AIMetrics | null = metricsData?.metrics || null
  const calls: AICall[] = callsData?.calls || []
  const readiness: AIReadiness | null = readinessData || null
  const coreLoopLatest = coreLoopMetricsData?.latest || null
  const coreLoopTrend = coreLoopMetricsData?.trend || null
  const reasonPlaybook = coreLoopMetricsData?.reasonPlaybook || []
  const ledgerIntegrity = ledgerIntegrityData || null
  const dossier = dossierData || null
  const emergencyState = emergencyData?.data
  const runSummary = runsData?.metadata?.summary || null
  const runSummaryAll = runsData?.metadata?.summaryAll || null
  const runGroups = runsData?.metadata?.runGroups || []
  const unmetDossierCriteria = dossier?.exitCriteria
    ? Object.entries(dossier.exitCriteria).filter(([, criterion]) => criterion && criterion.met === false)
    : []
  const operatorBlockers = Array.from(new Set([...(readiness?.blockers || []), ...(promotionData?.blockers || []), ...(dossier?.blockers || [])]))
  const strategicGaps = [
    coreLoopLatest?.metrics.workspaceCoverage === 0 ? 'Workspace coverage is still zero; the current proof depends too much on sandbox runs.' : null,
    (coreLoopLatest?.metrics.rollbackSuccessCount || 0) === 0 ? 'Rollback still needs stronger evidence before we can claim full recovery reliability.' : null,
    readiness?.runtimeReadiness && !readiness.runtimeReadiness.probeReady ? 'Production runtime preflight remains blocked by environment or credentials.' : null,
    operatorBlockers.length > 0 ? `${operatorBlockers.length} asset blockers are preventing full core-loop promotion.` : null,
  ].filter(Boolean) as string[]
  const headerTone = emergencyState && emergencyState.level !== 'normal' ? 'emergency' : operatorBlockers.length > 0 || strategicGaps.length > 0 ? 'partial' : 'healthy'
  const headerTitle =
    headerTone === 'healthy'
      ? 'Core loop is monitored with strong signals'
      : headerTone === 'emergency'
        ? 'Monitor is in an operational emergency state'
        : 'Monitor still has gaps before an L4 reliability narrative'
  const headerDescription =
    headerTone === 'healthy'
      ? 'The surface is organized to review cost, readiness, and production evidence with clearer operational control.'
      : headerTone === 'emergency'
        ? 'Before adding more refinements, stabilize emergency mode and preserve operational governance.'
        : 'The base is alive, but preview, rollback, workspace coverage, and runtime preflight still block a complete reliability claim.'

  useEffect(() => {
    if (metrics || calls.length > 0) setLastUpdated(new Date())
  }, [metrics, calls.length])

  const refreshAllMonitorData = useCallback(async () => {
    await Promise.all([refreshCalls(), refreshPromotion(), refreshReadiness(), refreshCoreLoopMetrics(), refreshLedgerIntegrity(), refreshDossier(), refreshFullAccessAudit(), refreshRuns()])
  }, [refreshCalls, refreshCoreLoopMetrics, refreshDossier, refreshFullAccessAudit, refreshLedgerIntegrity, refreshPromotion, refreshReadiness, refreshRuns])

  const runCoreLoopDrill = useCallback(async () => {
    try {
      setIsRunningDrill(true)
      setOperatorNotice(null)
      const payload = await postWithAuth<CoreLoopDrillResponse>('/api/admin/ai/core-loop-drill', { runs: 12 })
      await refreshAllMonitorData()
      setOperatorNotice({
        tone: 'success',
        text: `Drill completed: runs=${payload?.totals?.runs || 0}, success=${payload?.totals?.applySuccess || 0}, blocked=${payload?.totals?.applyBlocked || 0}.`,
      })
    } catch (error) {
      logger.error('Core loop drill failed', error)
      setOperatorNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Failed to run core-loop drill.' })
    } finally {
      setIsRunningDrill(false)
    }
  }, [refreshAllMonitorData])

  const runProductionProbe = useCallback(async () => {
    try {
      setIsRunningProductionProbe(true)
      setOperatorNotice(null)
      const payload = await postWithAuth<ProductionProbeResponse>('/api/admin/ai/core-loop-production-probe', { runs: 6 })
      await refreshAllMonitorData()
      setOperatorNotice({
        tone: 'success',
        text: `Production probe completed: runs=${payload?.metadata?.runs || 0}, success=${payload?.metadata?.totals?.applySuccess || 0}, blocked=${payload?.metadata?.totals?.applyBlocked || 0}, failed=${payload?.metadata?.totals?.applyFailed || 0}, file=${payload?.metadata?.selectedFile || 'n/a'}.`,
      })
    } catch (error) {
      logger.error('Production probe failed', error)
      setOperatorNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Failed to run production probe.' })
    } finally {
      setIsRunningProductionProbe(false)
    }
  }, [refreshAllMonitorData])

  const handleToggleExpanded = useCallback((callId: string) => {
    setExpandedId((currentValue) => (currentValue === callId ? null : callId))
  }, [])

  return {
    calls, coreLoopLatest, coreLoopMetricsData, coreLoopTrend, dossier, emergencyState, expandedId, fullAccessAuditData,
    handleToggleExpanded, headerDescription, headerTitle, isPaused, isRunningDrill, isRunningProductionProbe, lastUpdated,
    ledgerIntegrity, metrics, modelFilter, operatorBlockers, operatorNotice, promotionData, readiness, reasonPlaybook, refreshCalls,
    runCoreLoopDrill, runGroups, runProductionProbe, runSampleClass, runSummary, runSummaryAll, runsData, setIsPaused,
    setModelFilter, setRunSampleClass, setStatusFilter, statusFilter, strategicGaps, unmetDossierCriteria,
  }
}
