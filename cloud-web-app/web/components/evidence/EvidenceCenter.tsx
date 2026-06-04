'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileText, Gauge, Layers3 } from 'lucide-react'
import { authHeaders } from '@/lib/auth'
import type {
  AgenticProductionState,
  ProductionReadinessSummary,
} from '@/lib/production/agentic-production-state'
import { buildGameScopePlan } from '@/lib/production/game-scope-orchestrator'
import { EvidenceCenterReadySurface } from './EvidenceCenterReadySurface'
import {
  EvidenceCenterHero,
  EvidenceEmptyState,
  EvidenceErrorState,
  EvidenceLoadingRunboard,
  type AgentLedgerEntry,
  type EvidenceGraphEntry,
  type EvidenceMetric,
  type EvidenceProjectSummary,
  type ProductionBiblePlanSummary,
  type ReleaseEvidencePackageManifest,
  type ReleaseEvidencePackageManifestVerification,
  type ReleaseEvidenceReadinessSnapshot,
  type ReleaseReviewAction,
  type ReleaseReviewState,
  type ResearchNavigationMeshSnapshot,
} from './EvidenceCenter.parts'

type ProjectSummary = EvidenceProjectSummary

type EvidenceCenterSnapshot = {
  state: AgenticProductionState
  readiness: ProductionReadinessSummary
  persisted?: boolean
  settingsKey?: string
}

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

type EvidenceCenterProps = {
  initialProjectId?: string
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string }
  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed with ${response.status}`)
  }
  return payload
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string; nextAction?: string }
  if (!response.ok) {
    throw new Error(payload.nextAction || payload.message || payload.error || `Request failed with ${response.status}`)
  }
  return payload
}

export function EvidenceCenter({ initialProjectId }: EvidenceCenterProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? '')
  const [snapshot, setSnapshot] = useState<EvidenceCenterSnapshot | null>(null)
  const [navigationMesh, setNavigationMesh] = useState<ResearchNavigationMeshSnapshot | null>(null)
  const [releaseReadiness, setReleaseReadiness] = useState<ReleaseEvidenceReadinessSnapshot | null>(null)
  const [releaseManifest, setReleaseManifest] = useState<ReleaseEvidencePackageManifest | null>(null)
  const [releaseManifestVerification, setReleaseManifestVerification] = useState<ReleaseEvidencePackageManifestVerification | null>(null)
  const [releaseReviewState, setReleaseReviewState] = useState<ReleaseReviewState>('idle')
  const [releaseReviewMessage, setReleaseReviewMessage] = useState<string | null>(null)
  const [releaseDecisionNote, setReleaseDecisionNote] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadState('loading')
    readJson<{ projects?: ProjectSummary[] } | ProjectSummary[]>('/api/projects')
      .then((payload) => {
        if (!active) return
        const nextProjects = Array.isArray(payload) ? payload : payload.projects ?? []
        setProjects(nextProjects)
        if (!selectedProjectId && nextProjects[0]) {
          setSelectedProjectId(nextProjects[0].id)
        }
        if (nextProjects.length === 0) {
          setLoadState('empty')
        }
      })
      .catch((error) => {
        if (!active) return
        setLoadState('error')
        setErrorText(error instanceof Error ? error.message : 'Unable to load projects.')
      })
    return () => {
      active = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) return
    let active = true
    setLoadState('loading')
    setErrorText(null)
    readJson<EvidenceCenterSnapshot>(`/api/projects/${encodeURIComponent(selectedProjectId)}/production-state`)
      .then((payload) => {
        if (!active) return
        setSnapshot(payload)
        setLoadState('ready')
      })
      .catch((error) => {
        if (!active) return
        setSnapshot(null)
        setLoadState('error')
        setErrorText(error instanceof Error ? error.message : 'Production evidence is unavailable.')
      })
    return () => {
      active = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    let active = true
    readJson<ResearchNavigationMeshSnapshot>('/api/research/navigation-mesh?missionKind=advanced-research')
      .then((payload) => {
        if (active) setNavigationMesh(payload)
      })
      .catch(() => {
        if (active) setNavigationMesh(null)
      })
    return () => {
      active = false
    }
  }, [])


  useEffect(() => {
    if (!selectedProjectId) {
      setReleaseReadiness(null)
      setReleaseManifest(null)
      setReleaseManifestVerification(null)
      return
    }
    let active = true
    setReleaseReviewState('idle')
    setReleaseReviewMessage(null)
    setReleaseDecisionNote('')
    readJson<{
      snapshot: ReleaseEvidenceReadinessSnapshot
      packageManifest: ReleaseEvidencePackageManifest
      packageManifestVerification: ReleaseEvidencePackageManifestVerification
    }>(`/api/projects/${encodeURIComponent(selectedProjectId)}/production-state/release-evidence-readiness`)
      .then((payload) => {
        if (!active) return
        setReleaseReadiness(payload.snapshot)
        setReleaseManifest(payload.packageManifest)
        setReleaseManifestVerification(payload.packageManifestVerification)
      })
      .catch(() => {
        if (!active) return
        setReleaseReadiness(null)
        setReleaseManifest(null)
        setReleaseManifestVerification(null)
      })
    return () => {
      active = false
    }
  }, [selectedProjectId])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const graphEntries = useMemo(
    () =>
      Object.entries(snapshot?.state.graphs ?? {}) as EvidenceGraphEntry[],
    [snapshot],
  )
  const evidenceRefs = useMemo(
    () => graphEntries.flatMap(([, nodes]) => nodes.flatMap((node) => node.evidenceRefs)),
    [graphEntries],
  )
  const productionBiblePlan = useMemo<ProductionBiblePlanSummary | null>(() => {
    if (!snapshot || (snapshot.state.brain.domain !== 'game' && snapshot.state.brain.domain !== 'game-film' && snapshot.state.brain.domain !== 'mixed')) {
      return null
    }
    return buildGameScopePlan({
      scope: 'demo',
      genre: 'custom',
      userIntent: snapshot.state.brain.objective,
      evidenceRefs,
      budgetUsd: 35,
      runtimeCapabilities: {
        'license-provenance-scanner': true,
      },
    })
  }, [evidenceRefs, snapshot])
  const recentLedger = useMemo(
    () => (snapshot?.state.ledger.slice(0, 4) ?? []) as AgentLedgerEntry[],
    [snapshot],
  )
  const readinessStats = snapshot
    ? ([
        ['Coverage', `${Math.round(snapshot.readiness.graphCoverage)}%`, Gauge],
        ['Checks ready', `${snapshot.readiness.readyGraphCount}/${snapshot.readiness.totalGraphCount}`, Layers3],
        ['Receipt links', snapshot.readiness.evidenceCount, FileText],
        ['Blockers', snapshot.readiness.blockedCount, AlertTriangle],
      ] satisfies EvidenceMetric[])
    : []

  async function submitReleaseReviewAction(action: ReleaseReviewAction) {
    if (!selectedProjectId || !releaseReadiness) return
    const isRequest = action === 'request-human-review'
    const isApproval = action === 'record-human-approval'
    setReleaseReviewState(isRequest ? 'requesting' : 'deciding')
    setReleaseReviewMessage(null)

    try {
      const payload = await postJson<{
        snapshot: ReleaseEvidenceReadinessSnapshot
        readiness: ProductionReadinessSummary
        productionState: AgenticProductionState
        packageManifest: ReleaseEvidencePackageManifest
        packageManifestVerification: ReleaseEvidencePackageManifestVerification
        reviewRequestId: string
        decision?: 'approved' | 'rejected'
        releaseNote: string
      }>(`/api/projects/${encodeURIComponent(selectedProjectId)}/production-state/release-evidence-readiness`, {
        action,
        note: releaseDecisionNote,
      })

      setReleaseReadiness(payload.snapshot)
      setReleaseManifest(payload.packageManifest)
      setReleaseManifestVerification(payload.packageManifestVerification)
      setSnapshot((current) => (
        current
          ? { ...current, state: payload.productionState, readiness: payload.readiness, persisted: true }
          : current
      ))
      setReleaseReviewState(isRequest ? 'requested' : isApproval ? 'approved' : 'rejected')
      setReleaseReviewMessage(payload.releaseNote)
    } catch (error) {
      setReleaseReviewState(releaseReadiness.canRequestHumanReview ? 'error' : 'blocked')
      setReleaseReviewMessage(error instanceof Error ? error.message : 'Release review request could not be created.')
    }
  }

  function exportReleaseManifest() {
    if (!releaseManifest) return
    const blob = new Blob([JSON.stringify(releaseManifest, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${releaseManifest.packageId.replace(/[^a-z0-9._-]+/gi, '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EvidenceCenterHero
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectedProjectIdChange={setSelectedProjectId}
        />

        {loadState === 'empty' ? <EvidenceEmptyState /> : null}

        {loadState === 'error' ? <EvidenceErrorState errorText={errorText} /> : null}

        {loadState === 'loading' ? <EvidenceLoadingRunboard /> : null}

        {snapshot && loadState === 'ready' ? (
          <EvidenceCenterReadySurface
            readinessStats={readinessStats}
            releaseReadiness={releaseReadiness}
            releaseManifest={releaseManifest}
            releaseManifestVerification={releaseManifestVerification}
            releaseReviewState={releaseReviewState}
            releaseReviewMessage={releaseReviewMessage}
            releaseDecisionNote={releaseDecisionNote}
            onDecisionNoteChange={setReleaseDecisionNote}
            onSubmitReviewAction={submitReleaseReviewAction}
            onExportManifest={exportReleaseManifest}
            navigationMesh={navigationMesh}
            projectName={selectedProject?.name ?? snapshot.state.brain.objective}
            objective={snapshot.state.brain.objective}
            isReady={snapshot.readiness.ready}
            creativeStyle={snapshot.state.brain.creativeBible.style}
            creativeTone={snapshot.state.brain.creativeBible.tone}
            preferredTarget={snapshot.state.runtimePolicy.preferredTarget}
            fallbackTarget={snapshot.state.runtimePolicy.fallbackTarget}
            maxConcurrentHeavyJobs={
              snapshot.state.runtimePolicy.maxConcurrentHeavyJobs
            }
            productionBiblePlan={productionBiblePlan}
            nextAction={snapshot.readiness.nextAction}
            needsHumanApproval={snapshot.readiness.needsHumanApproval}
            graphEntries={graphEntries}
            recentLedger={recentLedger}
          />
        ) : null}
      </main>
    </div>
  )
}
