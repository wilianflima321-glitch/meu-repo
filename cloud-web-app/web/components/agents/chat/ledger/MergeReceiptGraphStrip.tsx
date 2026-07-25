'use client'

/**
 * CW6 — visible merge receipt + dependency graph (not J.11 ACP / task-graph editor).
 */

import type {
  GovernedApplyReceipt,
  MergeReceiptGraphNode,
  TouchedPathStatusEntry,
} from '@/lib/production/agents-merge-governance'
import {
  buildMergeReceiptDependencyGraph,
  buildNexusTaskDependencyList,
  buildReceiptTaskDependencyList,
  buildTouchedPathStatusList,
  summarizeMergeReceiptConflict,
} from '@/lib/production/agents-merge-governance'
import type { FileValidationStatusEntry } from '@/lib/production/agent-apply-validation-gate'
import type { NexusCellUi } from '@/lib/production/nexus-mission-phases'
import { WorkbenchEmptyState } from '@/components/ui/WorkbenchSurfaceStates'

interface MergeReceiptGraphStripProps {
  cells?: readonly NexusCellUi[]
  applyReceipts?: readonly GovernedApplyReceipt[]
  className?: string
}

function statusTone(status: string): string {
  if (status === 'denied' || status === 'blocked' || status === 'failed' || status === 'conflict') {
    return 'border-[var(--aethel-danger)]/40 text-[var(--aethel-danger)]'
  }
  if (status === 'applied' || status === 'completed') {
    return 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] text-[var(--aethel-success-light)]'
  }
  if (status === 'working' || status === 'running') {
    return 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] text-[var(--aethel-info-light)]'
  }
  if (status === 'touched' || status === 'receipt-metadata') {
    return 'border-[color-mix(in_srgb,var(--aethel-text-tertiary)_35%,transparent)] text-[var(--aethel-text-tertiary)]'
  }
  return 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]'
}

function NodeChip({ node }: { node: MergeReceiptGraphNode }) {
  const depCount = node.dependsOnIds.length
  return (
    <li
      className={`rounded-md border bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-[10px] ${statusTone(node.status)}`}
      data-aethel-cw6-node={node.kind}
      data-status={node.status}
      title={node.detail || node.label}
    >
      <span className="font-semibold uppercase tracking-[0.08em] text-[var(--aethel-text-quaternary)]">
        {node.kind}
      </span>
      <span className="ml-1 font-medium text-[var(--aethel-text-primary)]">{node.label}</span>
      <span className="ml-1">{node.status}</span>
      {node.code ? <span className="ml-1 font-mono">{node.code}</span> : null}
      {depCount > 0 ? (
        <span className="ml-1 text-[var(--aethel-text-muted)]">← {depCount}</span>
      ) : (
        <span className="ml-1 text-[var(--aethel-text-muted)]">root</span>
      )}
    </li>
  )
}

function TouchedPathRow({ entry }: { entry: TouchedPathStatusEntry }) {
  const base = entry.path.split(/[/\\]/).pop() || entry.path
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-[var(--aethel-surface-tertiary)] px-2 py-1.5 text-[11px] ${statusTone(entry.status)}`}
      data-aethel-cw6="touched-path"
      data-status={entry.status}
      title={entry.path}
    >
      <span className="min-w-0 truncate font-medium text-[var(--aethel-text-primary)]" title={entry.path}>
        {base}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
        <span className="uppercase tracking-[0.08em]">{entry.status}</span>
        {entry.latestCode ? <span>{entry.latestCode}</span> : null}
        <span className="text-[var(--aethel-text-muted)]">
          {entry.applyCount}a/{entry.denyCount}d
        </span>
      </span>
    </li>
  )
}

function validationTone(status: FileValidationStatusEntry['status']): string {
  if (status === 'pass' || status === 'skipped_non_ts') {
    return 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] text-[var(--aethel-success-light)]'
  }
  return 'border-[var(--aethel-danger)]/40 text-[var(--aethel-danger)]'
}

function FileValidationRow({ entry }: { entry: FileValidationStatusEntry }) {
  const base = entry.path.split(/[/\\]/).pop() || entry.path
  const deny = entry.status.startsWith('denied')
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-[var(--aethel-surface-tertiary)] px-2 py-1.5 text-[11px] ${validationTone(entry.status)}`}
      data-aethel-cw6="file-validation"
      data-status={entry.status}
      data-apply-action={deny ? 'deny' : 'apply'}
      title={entry.detail || entry.path}
    >
      <span className="min-w-0 truncate font-medium text-[var(--aethel-text-primary)]" title={entry.path}>
        {base}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
        <span className="uppercase tracking-[0.08em]">{entry.status}</span>
        {entry.code ? <span>{entry.code}</span> : null}
        <span className="uppercase tracking-[0.08em] text-[var(--aethel-text-muted)]">
          {deny ? 'deny' : 'ok'}
        </span>
      </span>
    </li>
  )
}

function collectFileValidation(
  receipts: readonly GovernedApplyReceipt[],
): FileValidationStatusEntry[] {
  const byPath = new Map<string, FileValidationStatusEntry>()
  for (const receipt of receipts) {
    for (const entry of receipt.fileValidation ?? []) {
      byPath.set(entry.path, entry)
    }
  }
  return Array.from(byPath.values())
}

export function MergeReceiptGraphStrip({
  cells = [],
  applyReceipts = [],
  className = '',
}: MergeReceiptGraphStripProps) {
  const nodes = buildMergeReceiptDependencyGraph({ cells, applyReceipts })
  const conflict = summarizeMergeReceiptConflict(applyReceipts)
  const touchedPaths = buildTouchedPathStatusList(applyReceipts)
  const fileValidation = collectFileValidation(applyReceipts)
  const nexusDeps = buildNexusTaskDependencyList(cells)
  const receiptDeps = buildReceiptTaskDependencyList(applyReceipts)
  const deniedValidation = fileValidation.filter((e) => e.status.startsWith('denied')).length

  if (nodes.length === 0) {
    return (
      <div className={className} data-aethel-cw6="merge-receipt-graph-empty">
        <WorkbenchEmptyState
          icon="inbox"
          title="No merge graph yet"
          description="Nexus task cells and governed apply receipts appear here after a run or apply attempt."
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] px-2.5 py-2 ${className}`}
      data-aethel-cw6="merge-receipt-graph"
      aria-label="Merge receipt dependency graph"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
          Merge / apply OS
        </span>
        <span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          {conflict.appliedCount} applied · {conflict.deniedCount} denied
          {conflict.conflictPathCount > 0 ? ` · ${conflict.conflictPathCount} conflict` : ''}
        </span>
      </div>
      <p
        className={
          conflict.deniedCount > 0 || conflict.conflictPathCount > 0
            ? 'mt-1 text-[11px] leading-4 text-[var(--aethel-danger)]'
            : 'mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]'
        }
        data-aethel-cw6="merge-conflict-summary"
      >
        {conflict.operatorSummary}
      </p>
      <p
        className="mt-1 text-[10px] leading-4 text-[var(--aethel-text-muted)]"
        data-aethel-cw6="composer-honesty"
      >
        Governed apply + AST/L.5 swarm — not Cursor Composer parity. Marketing fail-closed.
      </p>

      {fileValidation.length > 0 ? (
        <div className="mt-2" data-aethel-cw6="file-validation-list">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
            File validation {deniedValidation > 0 ? `· ${deniedValidation} denied` : '· all clear'}
          </span>
          <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
            {fileValidation.map((entry) => (
              <FileValidationRow key={`${entry.path}:${entry.status}`} entry={entry} />
            ))}
          </ul>
        </div>
      ) : null}

      {touchedPaths.length > 0 ? (
        <div className="mt-2" data-aethel-cw6="touched-path-list">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
            Touched paths
          </span>
          <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
            {touchedPaths.map((entry) => (
              <TouchedPathRow key={entry.path} entry={entry} />
            ))}
          </ul>
        </div>
      ) : null}

      {(nexusDeps.length > 0 || receiptDeps.length > 0) && (
        <div className="mt-2" data-aethel-cw6="task-dependency-list">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
            Task dependencies
          </span>
          <ul className="mt-1 space-y-1 text-[10px] text-[var(--aethel-text-secondary)]">
            {nexusDeps.map((edge) => (
              <li key={`nexus:${edge.taskId}`} data-aethel-cw6-dep="nexus">
                <span className="font-medium text-[var(--aethel-text-primary)]">{edge.domainLabel}</span>
                <span className="ml-1 text-[var(--aethel-text-muted)]">({edge.status})</span>
                {edge.dependsOnTaskIds.length > 0 ? (
                  <span className="ml-1 font-mono">← {edge.dependsOnTaskIds.join(', ')}</span>
                ) : (
                  <span className="ml-1 text-[var(--aethel-text-muted)]">root</span>
                )}
              </li>
            ))}
            {receiptDeps.map((edge) => (
              <li key={`receipt:${edge.taskId}`} data-aethel-cw6-dep="receipt-metadata">
                <span className="font-medium text-[var(--aethel-text-primary)]">{edge.taskId}</span>
                <span className="ml-1 uppercase tracking-[0.08em] text-[var(--aethel-text-quaternary)]">
                  receipt
                </span>
                {edge.dependsOnTaskIds.length > 0 ? (
                  <span className="ml-1 font-mono">← {edge.dependsOnTaskIds.join(', ')}</span>
                ) : (
                  <span className="ml-1 text-[var(--aethel-text-muted)]">root</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {nodes.map((node) => (
          <NodeChip key={node.id} node={node} />
        ))}
      </ul>
    </div>
  )
}
