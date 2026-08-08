'use client'

/**
 * AI-v1-c / J.2 — Nexus mission phase strip (Maestro → Swarm → Healing → Apply/Blocked).
 */

import type { NexusMissionUiPayload } from '@/lib/production/nexus-mission-phases'
import { evaluateNexusTaskGraphCompleteness } from '@/lib/production/agents-receipt-completeness'
import { buildNexusTaskDependencyList } from '@/lib/production/agents-merge-governance'
import { ReceiptCompletenessStrip } from '@/components/agents/chat/ledger/ReceiptCompletenessStrip'

interface NexusMissionPhaseStripProps {
  nexus: NexusMissionUiPayload | null
  isWorking?: boolean
}

export function NexusMissionPhaseStrip({ nexus, isWorking }: NexusMissionPhaseStripProps) {
  if (!nexus && !isWorking) return null

  const phaseLabel = nexus?.phaseLabel ?? 'Maestro planning…'
  const blocked = nexus?.verdict === 'BLOCK' || nexus?.verdict === 'ESCALATE'
  const running = nexus?.verdict === 'RUNNING' || Boolean(isWorking && nexus && !blocked)
  const taskGraph = evaluateNexusTaskGraphCompleteness(nexus)
  const dependencies = nexus ? buildNexusTaskDependencyList(nexus.cells) : []

  return (
    <div className="mx-4 mb-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
          Nexus
        </span>
        <span
          className={
            blocked
              ? 'text-xs font-medium text-[var(--aethel-error-light)]'
              : 'text-xs font-medium text-[var(--aethel-text-primary)]'
          }
        >
          {isWorking && !nexus ? 'Maestro planning…' : phaseLabel}
        </span>
        {running && !blocked ? (
          <span className="rounded border border-[var(--aethel-border-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">
            Live stream
          </span>
        ) : null}
        {nexus?.visualEvidence?.status === 'HELD' && (
          <span className="rounded border border-[var(--aethel-border-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">
            VisualEvidence [HELD]
          </span>
        )}
      </div>

      {nexus && nexus.phases.length > 0 && (
        <ol className="mt-2 flex flex-wrap gap-1.5">
          {nexus.phases.map((event) => (
            <li
              key={`${event.phase}-${event.at}`}
              className="rounded-md bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]"
            >
              {event.label}
            </li>
          ))}
        </ol>
      )}

      {/* CW6 — task graph cells + dependency edges from ledger/cells */}
      {nexus && nexus.cells.length > 0 && (
        <ul
          className="mt-2 flex flex-wrap gap-1.5"
          data-aethel-cw6="nexus-task-graph"
          aria-label="Nexus task graph"
        >
          {nexus.cells.map((cell) => {
            const edge = dependencies.find((d) => d.taskId === cell.taskId)
            const depLabel =
              edge && edge.dependsOnTaskIds.length > 0
                ? `depends: ${edge.dependsOnTaskIds.map((id) => id.slice(0, 8)).join(', ')}`
                : 'root'
            return (
              <li
                key={cell.taskId}
                className="rounded-md border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]"
                title={`${cell.role} · ${cell.status} · ${depLabel}`}
                data-depends-on={edge?.dependsOnTaskIds.join(',') || ''}
              >
                <span className="font-medium text-[var(--aethel-text-primary)]">{cell.domainLabel}</span>
                <span className="ml-1 text-[var(--aethel-text-quaternary)]">{cell.status}</span>
                {edge && edge.dependsOnTaskIds.length > 0 ? (
                  <span className="ml-1 text-[var(--aethel-text-muted)]">← {edge.dependsOnTaskIds.length}</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {nexus?.visualEvidence?.kind === 'patch_hash' && nexus.visualEvidence.refs.length > 0 && (
        <p
          className="mt-2 break-all font-mono text-[10px] text-[var(--aethel-text-quaternary)]"
          data-aethel-cw6="visual-evidence-patch-hash"
        >
          Patch hash · {nexus.visualEvidence.refs.slice(0, 2).join(' · ')}
        </p>
      )}

      {nexus ? (
        <div className="mt-2">
          <ReceiptCompletenessStrip report={taskGraph} className="mx-0 mb-0" />
        </div>
      ) : null}

      {nexus?.blockedReason && (
        <p className="mt-2 text-[11px] leading-4 text-[var(--aethel-error-light)]">
          Not applied as success — {nexus.blockedReason}
        </p>
      )}

      {nexus?.fusionTransactionId && nexus.verdict === 'APPLY' && (
        <p className="mt-2 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
          Undo: Ctrl+Z / Cmd+Z reverts transaction{' '}
          <span className="font-mono text-[var(--aethel-text-secondary)]">
            {nexus.fusionTransactionId.slice(0, 8)}…
          </span>{' '}
          atomically (Trava II).
        </p>
      )}
    </div>
  )
}
