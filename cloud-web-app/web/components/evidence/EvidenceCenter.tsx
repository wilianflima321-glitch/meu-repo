'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, Gauge, GitBranch, Layers3, ShieldCheck, type LucideIcon } from 'lucide-react'
import { authHeaders } from '@/lib/auth'
import type {
  AgenticProductionState,
  ProductionGraphNode,
  ProductionReadinessSummary,
} from '@/lib/production/agentic-production-state'
import { buildGameScopePlan } from '@/lib/production/game-scope-orchestrator'

type ProjectSummary = {
  id: string
  name: string
  description?: string | null
}

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

function statusTone(status: ProductionGraphNode['status']) {
  if (status === 'ready') return 'text-[var(--aethel-success-light)]'
  if (status === 'blocked') return 'text-[var(--aethel-error-light)]'
  if (status === 'needs-review') return 'text-[var(--aethel-warning-light)]'
  return 'text-[var(--aethel-text-tertiary)]'
}

export function EvidenceCenter({ initialProjectId }: EvidenceCenterProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? '')
  const [snapshot, setSnapshot] = useState<EvidenceCenterSnapshot | null>(null)
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const graphEntries = useMemo(() => Object.entries(snapshot?.state.graphs ?? {}), [snapshot])
  const evidenceRefs = useMemo(
    () => graphEntries.flatMap(([, nodes]) => nodes.flatMap((node) => node.evidenceRefs)),
    [graphEntries],
  )
  const productionBiblePlan = useMemo(() => {
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
  const recentLedger = snapshot?.state.ledger.slice(0, 4) ?? []
  const readinessStats = snapshot
    ? ([
        ['Graph coverage', `${Math.round(snapshot.readiness.graphCoverage)}%`, Gauge],
        ['Ready graphs', `${snapshot.readiness.readyGraphCount}/${snapshot.readiness.totalGraphCount}`, Layers3],
        ['Evidence refs', snapshot.readiness.evidenceCount, FileText],
        ['Blockers', snapshot.readiness.blockedCount, AlertTriangle],
      ] satisfies Array<[string, string | number, LucideIcon]>)
    : []

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[34px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(8,10,16,0.9))] p-6 shadow-[0_26px_90px_rgba(2,6,23,0.34)] lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Evidence Center v1
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Operational proof before claims.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
                Project Brain, Mission Ledger, graph readiness, blockers, evidence references, and next action in one protected surface.
              </p>
            </div>
            <div className="min-w-[260px] rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.34)] p-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]" htmlFor="evidence-project">
                Project
              </label>
              <select
                id="evidence-project"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.currentTarget.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-3 text-sm text-[var(--aethel-text-primary)] outline-none focus:ring-2 focus:ring-[var(--aethel-focus-ring)]"
              >
                {projects.length === 0 ? <option value="">No project selected</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link href="/dashboard" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
                  Dashboard
                </Link>
                <Link href="/studio" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 text-xs font-semibold text-[var(--aethel-info-light)] transition hover:brightness-110">
                  Studio
                </Link>
              </div>
            </div>
          </div>
        </section>

        {loadState === 'empty' ? (
          <div className="mt-6 rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-8 text-center">
            <p className="text-lg font-semibold">No projects yet</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
              Evidence starts once a project exists. Create or open a project from the dashboard to populate this center.
            </p>
            <Link href="/dashboard" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--aethel-primary)] px-4 text-sm font-semibold text-[var(--aethel-text-primary)]">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="mt-6 rounded-[28px] border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--aethel-warning-light)]">
              <AlertTriangle className="h-4 w-4" />
              Evidence unavailable
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{errorText}</p>
          </div>
        ) : null}

        {loadState === 'loading' ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)]" />
            ))}
          </div>
        ) : null}

        {snapshot && loadState === 'ready' ? (
          <div className="mt-6 space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {readinessStats.map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] p-4">
                  <Icon className="h-4 w-4 text-[var(--aethel-info-light)]" />
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Project Brain</p>
                    <h2 className="mt-1 text-xl font-semibold">{selectedProject?.name ?? snapshot.state.brain.objective}</h2>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${snapshot.readiness.ready ? 'border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] text-[var(--aethel-success-light)]' : 'border-[color-mix(in_srgb,var(--aethel-warning)_32%,transparent)] text-[var(--aethel-warning-light)]'}`}>
                    {snapshot.readiness.ready ? 'Ready' : 'Needs work'}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--aethel-text-secondary)]">{snapshot.state.brain.objective}</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Creative bible</p>
                    <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">{snapshot.state.brain.creativeBible.style}</p>
                    <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{snapshot.state.brain.creativeBible.tone}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Runtime policy</p>
                    <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                      Preferred {snapshot.state.runtimePolicy.preferredTarget}; fallback {snapshot.state.runtimePolicy.fallbackTarget}
                    </p>
                    <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                      Max heavy jobs: {snapshot.state.runtimePolicy.maxConcurrentHeavyJobs}
                    </p>
                  </div>
                </div>
                {productionBiblePlan ? (
                  <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_22%,var(--aethel-border-subtle))] bg-[color-mix(in_srgb,var(--aethel-primary)_7%,transparent)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-primary-light)]">Production Bible preview</p>
                      <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                        {productionBiblePlan.releaseState}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{productionBiblePlan.uxDisclosure}</p>
                    <div className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.16)] p-2">
                      <p className="text-[11px] font-semibold text-[var(--aethel-text-secondary)]">
                        Genre pack: {productionBiblePlan.genrePack.label} | {productionBiblePlan.genrePack.cameraModel} | {productionBiblePlan.genrePack.inputModel}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
                        Loop: {productionBiblePlan.genrePack.coreLoop.slice(0, 5).join(' -> ')}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-warning-light)]">
                        Playtest spine: {productionBiblePlan.playtestSpine.state}; {productionBiblePlan.playtestSpine.scenarios.length} scenario(s), human review required.
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-warning-light)]">
                        Cinematic evidence: {productionBiblePlan.cinematicEvidence.state}; {productionBiblePlan.cinematicEvidence.lanes.length} lane(s), {productionBiblePlan.cinematicEvidence.copy.cloudCost}.
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
                        Bible pillars: {productionBiblePlan.productionBible.pillars.slice(0, 5).join(', ')}. {productionBiblePlan.productionBible.firstUserDecision}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
                        Deep bible: {productionBiblePlan.productionBible.deepBible.scenes.length} scene beats, {productionBiblePlan.productionBible.deepBible.characters.length} character contracts, {productionBiblePlan.productionBible.deepBible.evidenceModel.requiredEvidence.length} gates.
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {productionBiblePlan.productionGraphs.slice(0, 6).map((graph) => (
                        <div key={graph.id} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.18)] p-2">
                          <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">{graph.id}</p>
                          <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">{graph.userValue}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-[var(--aethel-warning-light)]">{productionBiblePlan.nextAction}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Next action</p>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{snapshot.readiness.nextAction}</p>
                <div className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Human approval</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--aethel-text-secondary)]">
                    {snapshot.readiness.needsHumanApproval ? <AlertTriangle className="h-4 w-4 text-[var(--aethel-warning-light)]" /> : <CheckCircle2 className="h-4 w-4 text-[var(--aethel-success-light)]" />}
                    {snapshot.readiness.needsHumanApproval ? 'Required before execution' : 'No blocking approval required'}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Graph coverage</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {graphEntries.map(([graphKey, nodes]) => {
                    const ready = nodes.filter((node) => node.status === 'ready').length
                    const blocked = nodes.filter((node) => node.status === 'blocked').length
                    return (
                      <div key={graphKey} className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.2)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{graphKey.replace(/([A-Z])/g, ' $1')}</p>
                          <span className="text-xs text-[var(--aethel-text-tertiary)]">{ready}/{nodes.length} ready</span>
                        </div>
                        <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">{blocked} blockers</p>
                        <div className="mt-3 space-y-1.5">
                          {nodes.slice(0, 3).map((node) => (
                            <div key={node.id} className="flex items-center justify-between gap-3 text-xs">
                              <span className="truncate text-[var(--aethel-text-secondary)]">{node.label}</span>
                              <span className={statusTone(node.status)}>{node.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-5">
                <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
                  <GitBranch className="h-3.5 w-3.5" />
                  Mission ledger
                </p>
                <div className="mt-4 space-y-3">
                  {recentLedger.map((entry) => (
                    <article key={entry.id} className="rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{entry.phase}</p>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{entry.state}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{entry.summary}</p>
                      <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">Owner: {entry.ownerAgent} · Est. ${entry.estimatedCostUsd.toFixed(2)}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}
