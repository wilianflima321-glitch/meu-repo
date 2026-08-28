'use client'

/**
 * AgentRunLedgerPanel  -  Background Agent Workforce Monitor
 *
 * PURPOSE: Shows all active/recent agent runs with status, cost, evidence refs,
 * and takeover controls. Extends AgentsWindow with the "ledger" layer (V24-001/002).
 *
 * WIRING NOTE: Props accept plain data. Connect to /api/agents/runs + useSWR outside.
 * This component is pure presentation  -  the "Glass Shell".
 *
 * DESIGN: L5 Glassmorphism. Hyper Violet (var(--aethel-primary)) = AI identity.
 * Quantum Cyan (var(--aethel-info)) = active/running state.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// --- Types ---

export type AgentRunStatus = 'queued' | 'running' | 'paused' | 'success' | 'error' | 'awaiting-approval'

export interface AgentRunEntry {
  runId: string
  agentRole: string
  /** Human-readable description of the current task */
  taskSummary: string
  status: AgentRunStatus
  startedAt: string
  /** ISO string or null if still running */
  finishedAt?: string
  /** Estimated AI credit cost in USD */
  estimatedCostUsd: number
  /** Confirmed spend if finished */
  actualCostUsd?: number
  evidenceRefs: string[]
  /** Git branch name if agent opened one */
  branch?: string
  /** PR URL if agent raised one */
  prUrl?: string
  /** Log lines (last N) */
  recentLogs: string[]
}

interface AgentRunLedgerPanelProps {
  runs: AgentRunEntry[]
  onTakeover: (runId: string) => void
  onPause: (runId: string) => void
  onResume: (runId: string) => void
  onApprove: (runId: string) => void
  className?: string
}

// --- Helpers ---

const STATUS_CONFIG: Record<AgentRunStatus, { label: string; dotClass: string; textClass: string }> = {
  queued:             { label: 'Queued',            dotClass: 'bg-[var(--aethel-text-tertiary)]', textClass: 'text-[var(--aethel-text-tertiary)]' },
  running:            { label: 'Running',           dotClass: 'bg-[var(--aethel-info)] animate-pulse',       textClass: 'text-[var(--aethel-info)]'                     },
  paused:             { label: 'Paused',            dotClass: 'bg-[var(--aethel-warning)]',        textClass: 'text-[var(--aethel-warning)]'        },
  success:            { label: 'Done',              dotClass: 'bg-[var(--aethel-success)]',        textClass: 'text-[var(--aethel-success)]'        },
  error:              { label: 'Error',             dotClass: 'bg-[var(--aethel-error)]',          textClass: 'text-[var(--aethel-error)]'          },
  'awaiting-approval':{ label: 'Needs Approval',   dotClass: 'bg-[var(--aethel-primary)] animate-pulse',        textClass: 'text-[var(--aethel-primary)]'                     },
}

function elapsed(startedAt: string, finishedAt?: string): string {
  const end = finishedAt ? new Date(finishedAt) : new Date()
  const ms = end.getTime() - new Date(startedAt).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function CostChip({ estimated, actual }: { estimated: number; actual?: number }) {
  const value = actual ?? estimated
  const isEstimate = actual === undefined
  return (
    <span className="flex items-baseline gap-1 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-2 py-0.5 font-mono text-[10px]">
      <span className="text-[var(--aethel-text-secondary)]">{isEstimate ? '~' : ''}</span>
      <span className="text-[var(--aethel-text-primary)]">${value.toFixed(4)}</span>
    </span>
  )
}

function RunCard({ run, onTakeover, onPause, onResume, onApprove }: {
  run: AgentRunEntry
  onTakeover: () => void
  onPause: () => void
  onResume: () => void
  onApprove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[run.status]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'rounded-xl border bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-sm transition-colors',
        run.status === 'awaiting-approval'
          ? 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]'
          : run.status === 'running'
          ? 'border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]'
          : 'border-[var(--aethel-border-subtle)]',
      )}
    >
      {/* Header row */}
      <button
        type="button"
        id={`run-card-${run.runId}-toggle`}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
        aria-expanded={expanded}
      >
        {/* Status dot */}
        <span className={cn('mt-0.5 h-2 w-2 flex-none rounded-full', cfg.dotClass)} />

        {/* Agent + task */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--aethel-primary)]">{run.agentRole}</span>
            <span className={cn('text-[10px] font-semibold', cfg.textClass)}>{cfg.label}</span>
          </div>
          <p className="truncate text-xs text-[var(--aethel-text-secondary)]">{run.taskSummary}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-none flex-col items-end gap-1">
          <CostChip estimated={run.estimatedCostUsd} actual={run.actualCostUsd} />
          <span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
            {elapsed(run.startedAt, run.finishedAt)}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-[var(--aethel-border-subtle)] p-3">
              {/* Recent logs */}
              {run.recentLogs.length > 0 && (
                <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">Log</p>
                  <div className="flex flex-col gap-0.5 font-mono text-[10px] text-[var(--aethel-text-secondary)]">
                    {run.recentLogs.slice(-6).map((line, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <span key={i} className="truncate">{line}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex flex-wrap gap-2">
                {run.branch && (
                  <span className="flex items-center gap-1 rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-text-secondary)]">
                    <span aria-hidden>?</span> {run.branch}
                  </span>
                )}
                {run.prUrl && (
                  <a
                    href={run.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`run-${run.runId}-pr-link`}
                    className="flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)]"
                  >
                    View PR ?
                  </a>
                )}
                {run.evidenceRefs.slice(0, 2).map((ref) => (
                  <span key={ref} className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">{ref}</span>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5">
                {run.status === 'awaiting-approval' && (
                  <button
                    type="button"
                    id={`run-${run.runId}-approve`}
                    onClick={onApprove}
                    className="flex-1 rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] py-1.5 text-[11px] font-semibold text-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] transition-colors"
                  >
                    Approve & Apply
                  </button>
                )}
                {run.status === 'running' && (
                  <button
                    type="button"
                    id={`run-${run.runId}-pause`}
                    onClick={onPause}
                    className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] transition-colors"
                  >
                    Pause
                  </button>
                )}
                {run.status === 'paused' && (
                  <button
                    type="button"
                    id={`run-${run.runId}-resume`}
                    onClick={onResume}
                    className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] transition-colors"
                  >
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  id={`run-${run.runId}-takeover`}
                  onClick={onTakeover}
                  className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] hover:text-[var(--aethel-error)] transition-colors"
                >
                  Take Over
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// --- Main ---

export function AgentRunLedgerPanel({ runs, onTakeover, onPause, onResume, onApprove, className }: AgentRunLedgerPanelProps) {
  const [filter, setFilter] = useState<AgentRunStatus | 'all'>('all')
  const filtered = filter === 'all' ? runs : runs.filter((r) => r.status === filter)

  const counts = runs.reduce<Partial<Record<AgentRunStatus, number>>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  const totalCost = runs.reduce((sum, r) => sum + (r.actualCostUsd ?? r.estimatedCostUsd), 0)

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)} data-surface="agent-run-ledger">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Agent Runs</p>
          <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {runs.length} runs  -  ~${totalCost.toFixed(4)} total
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(counts['awaiting-approval'] ?? 0) > 0 && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--aethel-primary)]">
              {counts['awaiting-approval']} pending
            </span>
          )}
          {(counts.running ?? 0) > 0 && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] border border-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--aethel-info)]">
              {counts.running} running
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--aethel-border-subtle)] px-4 py-2 scrollbar-none">
        {(['all', 'running', 'awaiting-approval', 'paused', 'success', 'error'] as const).map((s) => (
          <button
            key={s}
            type="button"
            id={`ledger-filter-${s}`}
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={cn(
              'flex-none rounded-full px-2.5 py-1 text-[10px] font-medium capitalize whitespace-nowrap transition-colors',
              filter === s
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]',
            )}
          >
            {s === 'all' ? `All (${runs.length})` : `${s === 'awaiting-approval' ? 'Approval' : s}${counts[s] ? ` (${counts[s]})` : ''}`}
          </button>
        ))}
      </div>

      {/* Run list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--aethel-text-tertiary)]">No runs match this filter.</p>
          </div>
        ) : (
          <motion.div layout className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((run) => (
                <RunCard
                  key={run.runId}
                  run={run}
                  onTakeover={() => onTakeover(run.runId)}
                  onPause={() => onPause(run.runId)}
                  onResume={() => onResume(run.runId)}
                  onApprove={() => onApprove(run.runId)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default AgentRunLedgerPanel
