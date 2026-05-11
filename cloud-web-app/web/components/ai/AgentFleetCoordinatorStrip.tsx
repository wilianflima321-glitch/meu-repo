'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import { cn } from '@/lib/utils'
import type { AgentFleetMode } from '@/lib/production/agent-fleet-session'

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

type AgentSurfaceLockOwnerSnapshot = {
  agent: string
  ownerUserId: string
  lockCount: number
  paths: string[]
  expiresAt: string
}

type AgentSurfaceLockSnapshot = {
  projectId: string
  generatedAt: string
  activeLockCount: number
  lockedPathCount: number
  owners: AgentSurfaceLockOwnerSnapshot[]
  expiringSoonCount: number
  arbitrationRequired: boolean
  nextAction: string
}

type AgentFleetSnapshot = {
  mode: AgentFleetMode
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
  lockCoordination: AgentSurfaceLockSnapshot
  nextAction: string
}

type AgentFleetApiResponse = {
  snapshot: AgentFleetSnapshot
}

type AgentSurfaceLock = {
  id: string
  agent: string
  ownerUserId: string
  paths: string[]
  source: 'apply' | 'tool' | 'session'
  reason: string
  expiresAt: string
}

type AgentLocksApiResponse = {
  locks: AgentSurfaceLock[]
  snapshot: AgentSurfaceLockSnapshot
}

interface AgentFleetCoordinatorStripProps {
  projectId: string
  selectedAgentId: string
  onSelectAgentId: (agentId: string) => void
  className?: string
}

const modeLabels: Record<AgentFleetMode, string> = {
  'coordinator-first': 'Coordinator',
  'selected-agent': 'Specialist',
  'review-only': 'Review',
}

const statusTone: Record<AgentFleetMemberStatus, string> = {
  ready: 'bg-[var(--aethel-success)]',
  attention: 'bg-[var(--aethel-warning)]',
  blocked: 'bg-[var(--aethel-error)]',
  paused: 'bg-[var(--aethel-text-quaternary)]',
}

export function mapFleetAgentToCommandAgentId(agentName: string): string {
  const normalized = agentName.toLowerCase()
  if (normalized.includes('software') || normalized.includes('release')) return 'coder'
  if (normalized.includes('asset') || normalized.includes('artist') || normalized.includes('technical artist')) {
    return 'artist'
  }
  if (normalized.includes('cinematic')) return 'video-editor'
  if (normalized.includes('gameplay')) return 'game-designer'
  if (normalized.includes('research') || normalized.includes('performance')) return 'architect'
  if (normalized.includes('story') || normalized.includes('browser') || normalized.includes('qa')) return 'universal'
  return 'universal'
}

function canRenderFleet(projectId: string): boolean {
  return Boolean(projectId && projectId !== 'default')
}

function uniqueNames(names: string[]): string[] {
  return Array.from(new Set(names))
}

function formatLockCount(count: number): string {
  return `${count} lock${count === 1 ? '' : 's'}`
}

async function fetchFleetSnapshot(projectId: string): Promise<AgentFleetSnapshot> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-fleet`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`agent-fleet:${response.status}`)
  }

  const payload = (await response.json()) as AgentFleetApiResponse
  return payload.snapshot
}

async function fetchAgentLocks(projectId: string): Promise<AgentLocksApiResponse> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-locks`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`agent-locks:${response.status}`)
  }

  return (await response.json()) as AgentLocksApiResponse
}

async function patchFleetSnapshot(projectId: string, patch: Partial<Pick<AgentFleetSnapshot, 'centralAgent' | 'mode' | 'paused'>>) {
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

  const payload = (await response.json()) as AgentFleetApiResponse
  return payload.snapshot
}

export function AgentFleetCoordinatorStrip({
  projectId,
  selectedAgentId,
  onSelectAgentId,
  className,
}: AgentFleetCoordinatorStripProps) {
  const [snapshot, setSnapshot] = useState<AgentFleetSnapshot | null>(null)
  const [lockPayload, setLockPayload] = useState<AgentLocksApiResponse | null>(null)
  const [isLockPanelOpen, setIsLockPanelOpen] = useState(false)
  const [isLoadingLocks, setIsLoadingLocks] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [lockError, setLockError] = useState(false)
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  useEffect(() => {
    if (!canRenderFleet(projectId)) {
      setSnapshot(null)
      setLockPayload(null)
      setIsLockPanelOpen(false)
      return
    }

    let active = true
    setIsUnavailable(false)
    setLockPayload(null)
    setLockError(false)

    fetchFleetSnapshot(projectId)
      .then((next) => {
        if (active) setSnapshot(next)
      })
      .catch(() => {
        if (active) setIsUnavailable(true)
      })

    return () => {
      active = false
    }
  }, [projectId])

  const loadLocks = useCallback(async () => {
    if (!canRenderFleet(projectId)) return
    setIsLoadingLocks(true)
    setLockError(false)

    try {
      const next = await fetchAgentLocks(projectId)
      setLockPayload(next)
    } catch {
      setLockError(true)
    } finally {
      setIsLoadingLocks(false)
    }
  }, [projectId])

  const centralCommandAgent = useMemo(
    () => (snapshot ? mapFleetAgentToCommandAgentId(snapshot.centralAgent) : selectedAgentId),
    [selectedAgentId, snapshot]
  )

  useEffect(() => {
    if (!snapshot || selectedAgentId === centralCommandAgent || snapshot.mode === 'selected-agent') return
    onSelectAgentId(centralCommandAgent)
  }, [centralCommandAgent, onSelectAgentId, selectedAgentId, snapshot])

  const updateFleet = useCallback(
    async (patch: Partial<Pick<AgentFleetSnapshot, 'centralAgent' | 'mode' | 'paused'>>) => {
      if (!snapshot || !canRenderFleet(projectId)) return
      const previous = snapshot
      const optimistic = { ...snapshot, ...patch }
      setSnapshot(optimistic)
      setIsUpdating(true)

      try {
        const next = await patchFleetSnapshot(projectId, patch)
        setSnapshot(next)
        setIsUnavailable(false)
      } catch {
        setSnapshot(previous)
        setIsUnavailable(true)
      } finally {
        setIsUpdating(false)
      }
    },
    [projectId, snapshot]
  )

  if (!canRenderFleet(projectId) || (!snapshot && !isUnavailable)) {
    return null
  }

  if (isUnavailable) {
    return (
      <div
        className={cn(
          'border-b border-[var(--aethel-border-primary)] px-4 py-2 text-xs text-[var(--aethel-text-tertiary)]',
          className
        )}
      >
        Agent fleet is waiting for project context.
      </div>
    )
  }

  if (!snapshot) return null

  const topMembers = snapshot.members.filter((member, index, members) => {
    return members.findIndex((candidate) => candidate.agent === member.agent) === index
  }).slice(0, 5)
  const coordinatorOptions = uniqueNames(snapshot.members.map((member) => member.agent))
  const lockCoordination = lockPayload?.snapshot ?? snapshot.lockCoordination
  const lockOwners = lockCoordination.owners.slice(0, 4)

  return (
    <div
      className={cn(
        'border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_76%,transparent)] px-4 py-2',
        className
      )}
      aria-label="Agent fleet coordinator"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
        <span className="font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Fleet</span>

        <label className="sr-only" htmlFor="agent-fleet-coordinator">
          Coordinator
        </label>
        <select
          id="agent-fleet-coordinator"
          value={snapshot.centralAgent}
          onChange={(event) => {
            const centralAgent = event.target.value
            onSelectAgentId(mapFleetAgentToCommandAgentId(centralAgent))
            updateFleet({ centralAgent })
          }}
          className={`h-8 max-w-[220px] rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-2 text-[var(--aethel-text-secondary)] ${focusClass}`}
          aria-label="Choose senior coordinator agent"
          disabled={isUpdating}
        >
          {coordinatorOptions.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="agent-fleet-mode">
          Composer mode
        </label>
        <select
          id="agent-fleet-mode"
          value={snapshot.mode}
          onChange={(event) => updateFleet({ mode: event.target.value as AgentFleetMode })}
          className={`h-8 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-2 text-[var(--aethel-text-secondary)] ${focusClass}`}
          aria-label="Choose composer mode"
          disabled={isUpdating}
        >
          {Object.entries(modeLabels).map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => updateFleet({ paused: !snapshot.paused })}
          className={`h-8 rounded-lg border border-[var(--aethel-border-primary)] px-3 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] ${focusClass}`}
          disabled={isUpdating}
          aria-pressed={snapshot.paused}
        >
          {snapshot.paused ? 'Resume' : 'Pause'}
        </button>

        <div className="ml-auto flex items-center gap-1" aria-label="Agent lane status">
          {topMembers.map((member) => (
            <span
              key={member.agent}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-primary)] px-2 py-1 text-[var(--aethel-text-tertiary)]"
              title={[
                `${member.agent}: ${member.nextAction}`,
                member.activeLockCount > 0 ? `Locked: ${member.lockedSurfacePreview.join(', ')}` : '',
                member.staleSurfaceCount > 0 ? `Stale: ${member.staleSurfacePreview.join(', ')}` : '',
              ].filter(Boolean).join('\n')}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', statusTone[member.status])} aria-hidden="true" />
              <span className="max-w-[110px] truncate">{member.agent.replace(' Agent', '')}</span>
              {member.activeLockCount > 0 && (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)] px-1 text-[10px] text-[var(--aethel-info-light)]">
                  L
                </span>
              )}
              {member.staleSurfaceCount > 0 && (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)] px-1 text-[10px] text-[var(--aethel-warning-light)]">
                  S
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--aethel-text-quaternary)]">
        <span className="truncate">{snapshot.composer.primaryMode}</span>
        <span aria-hidden="true">/</span>
        <span className="truncate">{snapshot.hasManifest ? snapshot.nextAction : 'Run Repository Cartography first'}</span>
        {snapshot.blockers.length > 0 && (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2 py-0.5 text-[var(--aethel-warning-light)]">
            {snapshot.blockers.length} blockers
          </span>
        )}
        {snapshot.activeLockCount > 0 && (
          <button
            type="button"
            onClick={() => {
              const next = !isLockPanelOpen
              setIsLockPanelOpen(next)
              if (next) void loadLocks()
            }}
            className={`rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2 py-0.5 text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] ${focusClass}`}
            aria-expanded={isLockPanelOpen}
            aria-controls="agent-scope-lock-details"
          >
            {formatLockCount(snapshot.activeLockCount)}
          </button>
        )}
        {snapshot.staleSurfaceCount > 0 && (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2 py-0.5 text-[var(--aethel-warning-light)]">
            rescan needed
          </span>
        )}
      </div>

      {isLockPanelOpen && (
        <div
          id="agent-scope-lock-details"
          className="mt-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] p-3 text-[11px] text-[var(--aethel-text-tertiary)]"
          aria-label="Agent scope lock details"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--aethel-text-secondary)]">
              {lockCoordination.arbitrationRequired ? 'Producer arbitration needed' : 'Scoped ownership active'}
            </span>
            <span className="text-[var(--aethel-text-quaternary)]">
              {lockCoordination.lockedPathCount} surfaces / {formatLockCount(lockCoordination.activeLockCount)}
            </span>
            {lockCoordination.expiringSoonCount > 0 && (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_14%,transparent)] px-2 py-0.5 text-[var(--aethel-warning-light)]">
                {lockCoordination.expiringSoonCount} expiring soon
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadLocks()}
              className={`ml-auto rounded-lg border border-[var(--aethel-border-primary)] px-2 py-1 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-primary)] ${focusClass}`}
              disabled={isLoadingLocks}
            >
              {isLoadingLocks ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <p className="mt-2 text-[var(--aethel-text-quaternary)]">{lockCoordination.nextAction}</p>

          {lockError && (
            <p className="mt-2 text-[var(--aethel-warning-light)]">
              Lock details are temporarily unavailable. The fleet snapshot is still safe to use.
            </p>
          )}

          {lockOwners.length > 0 && (
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {lockOwners.map((owner) => (
                <div key={`${owner.agent}:${owner.ownerUserId}`} className="rounded-lg border border-[var(--aethel-border-primary)] px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2 text-[var(--aethel-text-secondary)]">
                    <span className="truncate font-medium">{owner.agent}</span>
                    <span className="shrink-0 text-[var(--aethel-text-quaternary)]">{formatLockCount(owner.lockCount)}</span>
                  </div>
                  <div className="mt-1 truncate text-[var(--aethel-text-quaternary)]">
                    {owner.paths.length > 0 ? owner.paths.join(', ') : 'No path preview'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
