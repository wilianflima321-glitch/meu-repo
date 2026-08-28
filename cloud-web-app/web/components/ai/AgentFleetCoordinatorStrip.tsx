'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import type { AgentFleetMode } from '@/lib/production/agent-fleet-session'
import { cn } from '@/lib/utils'

import {
  acknowledgeReadReceipts,
  fetchAgentLocks,
  fetchFleetSnapshot,
  fetchReadReceipts,
  patchFleetSnapshot,
} from './AgentFleetCoordinatorStrip.api'
import {
  canRenderFleet,
  formatLockCount,
  mapFleetAgentToCommandAgentId,
  modeLabels,
  readReceiptLabel,
  readReceiptTone,
  statusTone,
  uniqueNames,
} from './AgentFleetCoordinatorStrip.helpers'
import type {
  AgentFleetCoordinatorStripProps,
  AgentFleetSnapshot,
  AgentLocksApiResponse,
  AgentReadinessDecision,
} from './AgentFleetCoordinatorStrip.types'

export { mapFleetAgentToCommandAgentId } from './AgentFleetCoordinatorStrip.helpers'

function CustomFleetSelect({
  id,
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  className,
}: {
  id: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label || value

  return (
    <div
      className="relative inline-block"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-8 items-center justify-between gap-2 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] px-2.5 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 min-w-full w-max overflow-auto rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-elevated)] p-1 shadow-xl backdrop-blur-xl"
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              tabIndex={0}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onChange(opt.value)
                  setOpen(false)
                }
              }}
              className={cn(
                'cursor-pointer rounded-md px-2 py-1.5 text-xs transition focus-visible:outline-none',
                value === opt.value
                  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] font-semibold text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]'
              )}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


export function AgentFleetCoordinatorStrip({
  projectId,
  selectedAgentId,
  onSelectAgentId,
  className,
}: AgentFleetCoordinatorStripProps) {
  const [snapshot, setSnapshot] = useState<AgentFleetSnapshot | null>(null)
  const [lockPayload, setLockPayload] = useState<AgentLocksApiResponse | null>(null)
  const [readiness, setReadiness] = useState<AgentReadinessDecision | null>(null)
  const [isLockPanelOpen, setIsLockPanelOpen] = useState(false)
  const [isReadinessPanelOpen, setIsReadinessPanelOpen] = useState(false)
  const [isLoadingLocks, setIsLoadingLocks] = useState(false)
  const [isAcknowledgingReadiness, setIsAcknowledgingReadiness] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [lockError, setLockError] = useState(false)
  const [readinessError, setReadinessError] = useState(false)
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  useEffect(() => {
    if (!canRenderFleet(projectId)) {
      setSnapshot(null)
      setLockPayload(null)
      setReadiness(null)
      setIsLockPanelOpen(false)
      setIsReadinessPanelOpen(false)
      return
    }

    let active = true
    setIsUnavailable(false)
    setLockPayload(null)
    setLockError(false)
    setReadiness(null)
    setReadinessError(false)

    fetchFleetSnapshot(projectId)
      .then((next) => {
        if (!active) return
        setSnapshot(next)
        fetchReadReceipts(projectId, next.centralAgent)
          .then((nextReadiness) => {
            if (active) setReadiness(nextReadiness)
          })
          .catch(() => {
            if (active) setReadinessError(true)
          })
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

  const refreshReadiness = useCallback(async (agent: string) => {
    if (!canRenderFleet(projectId)) return
    setReadinessError(false)
    try {
      const next = await fetchReadReceipts(projectId, agent)
      setReadiness(next)
    } catch {
      setReadinessError(true)
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
        if (patch.centralAgent) void refreshReadiness(patch.centralAgent)
      } catch {
        setSnapshot(previous)
        setIsUnavailable(true)
      } finally {
        setIsUpdating(false)
      }
    },
    [projectId, refreshReadiness, snapshot]
  )

  const acknowledgeContext = useCallback(async () => {
    if (!readiness || !snapshot || !canRenderFleet(projectId)) return
    setIsAcknowledgingReadiness(true)
    setReadinessError(false)

    try {
      const next = await acknowledgeReadReceipts(projectId, readiness)
      setReadiness(next)
    } catch {
      setReadinessError(true)
    } finally {
      setIsAcknowledgingReadiness(false)
    }
  }, [projectId, readiness, snapshot])

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
  const overflowCount = Math.max(0, snapshot.members.filter((member, index, members) =>
    members.findIndex((candidate) => candidate.agent === member.agent) === index
  ).length - 5)
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
        <CustomFleetSelect
          id="agent-fleet-coordinator"
          value={snapshot.centralAgent}
          onChange={(centralAgent) => {
            onSelectAgentId(mapFleetAgentToCommandAgentId(centralAgent))
            updateFleet({ centralAgent })
          }}
          options={coordinatorOptions.map((agent) => ({ label: agent, value: agent }))}
          className="max-w-[220px]"
          ariaLabel="Choose senior coordinator agent"
          disabled={isUpdating}
        />

        <label className="sr-only" htmlFor="agent-fleet-mode">
          Composer mode
        </label>
        <CustomFleetSelect
          id="agent-fleet-mode"
          value={snapshot.mode}
          onChange={(mode) => updateFleet({ mode: mode as AgentFleetMode })}
          options={Object.entries(modeLabels).map(([mode, label]) => ({ label, value: mode }))}
          ariaLabel="Choose composer mode"
          disabled={isUpdating}
        />

        <button
          type="button"
          onClick={() => updateFleet({ paused: !snapshot.paused })}
          className={`h-8 rounded-lg border border-[var(--aethel-border-primary)] px-3 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] ${focusClass}`}
          disabled={isUpdating}
          aria-pressed={snapshot.paused}
        >
          {snapshot.paused ? 'Resume' : 'Pause'}
        </button>

        {/* isUpdating spinner — visible whenever a fleet patch is in-flight */}
        {isUpdating && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-2 py-1 text-[10px] text-[var(--aethel-primary-light)]"
            aria-live="polite"
            aria-label="Updating fleet configuration"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Updating…
          </span>
        )}

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
          {/* Overflow badge — shows how many agents were hidden by the slice(0,5) cut */}
          {overflowCount > 0 && (
            <span
              className="inline-flex items-center rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2 py-1 text-[10px] text-[var(--aethel-text-quaternary)]"
              title={`${overflowCount} more agent${overflowCount > 1 ? 's' : ''} in the fleet`}
            >
              +{overflowCount}
            </span>
          )}
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
        <button
          type="button"
          onClick={() => setIsReadinessPanelOpen((value) => !value)}
          className={cn(
            `rounded-full px-2 py-0.5 hover:bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] ${focusClass}`,
            readReceiptTone(readiness)
          )}
          aria-expanded={isReadinessPanelOpen}
          aria-controls="agent-read-receipt-details"
        >
          {readReceiptLabel(readiness)}
        </button>
        {snapshot.staleSurfaceCount > 0 && (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2 py-0.5 text-[var(--aethel-warning-light)]">
            rescan needed
          </span>
        )}
      </div>

      {isReadinessPanelOpen && (
        <div
          id="agent-read-receipt-details"
          className="mt-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] p-3 text-[11px] text-[var(--aethel-text-tertiary)]"
          aria-label="Agent read receipt details"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--aethel-text-secondary)]">
              {readiness?.allowed ? 'Context receipts accepted' : 'Context receipts needed'}
            </span>
            {readiness?.metadata.acceptedReceiptIds.length ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] px-2 py-0.5 text-[var(--aethel-success-light)]">
                {readiness.metadata.acceptedReceiptIds.length} receipts
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void refreshReadiness(snapshot.centralAgent)}
              className={`ml-auto rounded-lg border border-[var(--aethel-border-primary)] px-2 py-1 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-primary)] ${focusClass}`}
            >
              Refresh
            </button>
          </div>

          <p className="mt-2 text-[var(--aethel-text-quaternary)]">
            {readiness?.allowed
              ? 'This coordinator has acknowledged the current cartography and research packet. Target file receipts are still checked at apply time.'
              : readiness?.message ?? 'Readiness is loading. Agents should stay in planning mode until context is acknowledged.'}
          </p>

          {readiness?.metadata.missing.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {readiness.metadata.missing.slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] px-2 py-0.5 text-[var(--aethel-warning-light)]"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {readiness?.metadata.blockers.length ? (
            <div className="mt-2 text-[var(--aethel-error-light)]">
              {readiness.metadata.blockers.slice(0, 2).join(' / ')}
            </div>
          ) : null}

          {readinessError && (
            <p className="mt-2 text-[var(--aethel-warning-light)]">
              Read receipt readiness is temporarily unavailable. Apply gates still enforce server-side protection.
            </p>
          )}

          {readiness && !readiness.allowed && readiness.metadata.manifestId && readiness.code !== 'AGENT_READ_RECEIPTS_RESEARCH_BLOCKED' && (
            <button
              type="button"
              onClick={() => void acknowledgeContext()}
              className={`mt-3 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-1.5 text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] ${focusClass}`}
              disabled={isAcknowledgingReadiness}
            >
              {isAcknowledgingReadiness ? 'Acknowledging...' : 'Acknowledge context'}
            </button>
          )}
        </div>
      )}

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
