'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Activity, AlertTriangle, Bot, CheckCircle2, Lock, Pause, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import useSWR from 'swr'

import { AgentFleetCoordinatorStrip } from '@/components/ai/AgentFleetCoordinatorStrip'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import { cn } from '@/lib/utils'

type AgentFleetMemberStatus = 'ready' | 'attention' | 'blocked' | 'paused'

type AgentFleetMemberSnapshot = {
  agent: string
  role: 'senior-coordinator' | 'specialist'
  lane: string
  status: AgentFleetMemberStatus
  ownedSurfaceCount: number
  activeLockCount: number
  lockedSurfacePreview: string[]
  staleSurfaceCount: number
  staleSurfacePreview: string[]
  nextAction: string
}

type AgentFleetSnapshot = {
  mode: 'coordinator-first' | 'selected-agent' | 'review-only'
  paused: boolean
  hasManifest: boolean
  centralAgent: string
  summary: string
  composer: {
    primaryMode: string
    switcherHint: string
  }
  members: AgentFleetMemberSnapshot[]
  blockers: string[]
  activeLockCount: number
  staleSurfaceCount: number
  nextAction: string
}

type AgentFleetResponse = {
  snapshot: AgentFleetSnapshot
}

type AgentsWindowProps = {
  projectId?: string
  className?: string
}

const statusTone: Record<AgentFleetMemberStatus, string> = {
  ready: 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] text-[var(--aethel-success-light)]',
  attention: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_9%,transparent)] text-[var(--aethel-warning-light)]',
  blocked: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_9%,transparent)] text-[var(--aethel-error-light)]',
  paused: 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-tertiary)]',
}

const statusIcon: Record<AgentFleetMemberStatus, ReactNode> = {
  ready: <CheckCircle2 className="h-3.5 w-3.5" />,
  attention: <AlertTriangle className="h-3.5 w-3.5" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5" />,
  paused: <Pause className="h-3.5 w-3.5" />,
}

async function fetchAgentFleet(projectId: string): Promise<AgentFleetSnapshot> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-fleet`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`agent-fleet:${response.status}`)
  }

  const payload = (await response.json()) as AgentFleetResponse
  return payload.snapshot
}

async function patchAgentFleet(projectId: string, patch: Partial<Pick<AgentFleetSnapshot, 'paused'>>) {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-fleet`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    throw new Error(`agent-fleet.patch:${response.status}`)
  }

  const payload = (await response.json()) as AgentFleetResponse
  return payload.snapshot
}

function groupMembers(members: AgentFleetMemberSnapshot[]) {
  return members.reduce<Record<AgentFleetMemberStatus, AgentFleetMemberSnapshot[]>>(
    (acc, member) => {
      acc[member.status].push(member)
      return acc
    },
    { ready: [], attention: [], blocked: [], paused: [] },
  )
}

function AgentCard({ member }: { member: AgentFleetMemberSnapshot }) {
  return (
    <article className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_26%,transparent)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[var(--aethel-primary-light)]" />
            <h4 className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{member.agent}</h4>
          </div>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{member.lane}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]', statusTone[member.status])}>
          {statusIcon[member.status]}
          {member.status}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">{member.nextAction}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
          {member.ownedSurfaceCount} surfaces
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
          <Lock className="h-3 w-3" />
          {member.activeLockCount} locks
        </span>
        {member.staleSurfaceCount > 0 ? (
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] px-2 py-1 text-[var(--aethel-warning-light)]">
            {member.staleSurfaceCount} stale
          </span>
        ) : null}
      </div>
    </article>
  )
}

export function AgentsWindow({ projectId, className }: AgentsWindowProps) {
  const [selectedAgentId, setSelectedAgentId] = useState('universal')
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const currentProjectId = projectId && projectId !== 'default' ? projectId : null
  const canLoadFleet = Boolean(currentProjectId)
  const { data, error, isLoading, mutate } = useSWR(
    canLoadFleet ? ['agent-window-fleet', currentProjectId] : null,
    () => fetchAgentFleet(currentProjectId as string),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
    },
  )

  const grouped = useMemo(() => groupMembers(data?.members ?? []), [data])
  const topMembers = useMemo(() => (data?.members ?? []).slice(0, 8), [data])

  const togglePause = useCallback(async () => {
    if (!currentProjectId || !data) return
    await mutate(patchAgentFleet(currentProjectId, { paused: !data.paused }), {
      optimisticData: { ...data, paused: !data.paused },
      rollbackOnError: true,
      populateCache: true,
      revalidate: false,
    })
  }, [currentProjectId, data, mutate])

  if (!currentProjectId) {
    return (
      <section className={cn('flex h-full flex-col items-center justify-center gap-3 p-6 text-center', className)}>
        <ShieldCheck className="h-9 w-9 text-[var(--aethel-primary-light)]" />
        <div>
          <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Agent window needs a project</h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--aethel-text-tertiary)]">
            Open a workspace to see coordinators, scope locks, read receipts, replay evidence, and budget-aware execution in one place.
          </p>
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className={cn('flex h-full items-center justify-center p-6 text-sm text-[var(--aethel-text-secondary)]', className)}>
        <Activity className="mr-2 h-4 w-4 animate-pulse" />
        Syncing agent workforce...
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className={cn('flex h-full flex-col items-center justify-center gap-3 p-6 text-center', className)}>
        <AlertTriangle className="h-8 w-8 text-[var(--aethel-warning-light)]" />
        <div>
          <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Agent fleet unavailable</h3>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">The server-side scope gates remain active. Refresh when project state is available.</p>
        </div>
        <button
          type="button"
          onClick={() => void mutate()}
          className={cn('rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
        >
          Retry
        </button>
      </section>
    )
  }

  return (
    <section className={cn('flex h-full min-h-0 flex-col bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)]', className)}>
      <AgentFleetCoordinatorStrip
        projectId={currentProjectId}
        selectedAgentId={selectedAgentId}
        onSelectAgentId={setSelectedAgentId}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <header className="flex flex-col gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Agent workforce</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--aethel-text-primary)]">{data.centralAgent}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--aethel-text-secondary)]">{data.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
              {data.mode}
            </span>
            <button
              type="button"
              onClick={() => void togglePause()}
              className={cn('inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
              aria-pressed={data.paused}
            >
              {data.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {data.paused ? 'Resume fleet' : 'Pause fleet'}
            </button>
            <button
              type="button"
              onClick={() => void mutate()}
              className={cn('inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Ready</p>
            <p className="mt-1 text-xl font-semibold text-[var(--aethel-success-light)]">{grouped.ready.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Attention</p>
            <p className="mt-1 text-xl font-semibold text-[var(--aethel-warning-light)]">{grouped.attention.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Locks</p>
            <p className="mt-1 text-xl font-semibold text-[var(--aethel-info-light)]">{data.activeLockCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Stale</p>
            <p className="mt-1 text-xl font-semibold text-[var(--aethel-error-light)]">{data.staleSurfaceCount}</p>
          </div>
        </div>

        {data.blockers.length > 0 ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] p-3">
            <p className="text-xs font-semibold text-[var(--aethel-warning-light)]">Blocked before apply</p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--aethel-text-secondary)]">
              {data.blockers.slice(0, 4).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-2">
          {topMembers.map((member) => (
            <AgentCard key={`${member.agent}:${member.lane}`} member={member} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default AgentsWindow
