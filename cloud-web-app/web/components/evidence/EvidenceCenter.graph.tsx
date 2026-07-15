'use client'

import { GitBranch } from 'lucide-react'
import type {
  AgentLedgerEntry,
  EvidenceGraphEntry,
} from './EvidenceCenter.types'

function statusTone(status: string) {
  if (status === 'ready') return 'text-[var(--aethel-success-light)]'
  if (status === 'blocked') return 'text-[var(--aethel-error-light)]'
  if (status === 'needs-review') return 'text-[var(--aethel-warning-light)]'
  return 'text-[var(--aethel-text-tertiary)]'
}

export function EvidenceGraphPanel({
  graphEntries,
}: {
  graphEntries: EvidenceGraphEntry[]
}) {
  return (
    <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
        Receipts graph
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)]">
        {graphEntries.map(([graphKey, nodes]) => {
          const ready = nodes.filter((node) => node.status === 'ready').length
          const blocked = nodes.filter(
            (node) => node.status === 'blocked',
          ).length
          return (
            <div
              key={graphKey}
              className="grid gap-2 border-b border-[var(--aethel-border-subtle)] px-3 py-3 last:border-b-0 lg:grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1fr)] lg:items-start"
            >
              <div>
                <p className="text-sm font-semibold">
                  {graphKey.replace(/([A-Z])/g, ' $1')}
                </p>
                <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                  {blocked} blockers
                </p>
              </div>
              <span className="text-xs text-[var(--aethel-text-tertiary)]">
                {ready}/{nodes.length} ready
              </span>
              <div className="space-y-1.5">
                {nodes.slice(0, 3).map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-[var(--aethel-text-secondary)]">
                      {node.label}
                    </span>
                    <span className={statusTone(node.status)}>
                      {node.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EvidenceTimelinePanel({
  recentLedger,
}: {
  recentLedger: AgentLedgerEntry[]
}) {
  return (
    <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-5">
      <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
        <GitBranch className="h-3.5 w-3.5" />
        Recent activity
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)]">
        {recentLedger.map((entry) => (
          <article
            key={entry.id}
            className="border-b border-[var(--aethel-border-subtle)] px-3 py-3 last:border-b-0"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{entry.phase}</p>
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                {entry.state}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {entry.summary}
            </p>
            <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">
              Owner: {entry.ownerAgent} - Est. $
              {entry.estimatedCostUsd.toFixed(2)}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
