'use client'

/**
 * AI-v1-c / J.2 — Nexus mission phase strip (Maestro → Swarm → Healing → Apply/Blocked).
 */

import type { NexusMissionUiPayload } from '@/lib/production/nexus-mission-phases'

interface NexusMissionPhaseStripProps {
  nexus: NexusMissionUiPayload | null
  isWorking?: boolean
}

export function NexusMissionPhaseStrip({ nexus, isWorking }: NexusMissionPhaseStripProps) {
  if (!nexus && !isWorking) return null

  const phaseLabel = nexus?.phaseLabel ?? 'Maestro planning…'
  const blocked = nexus?.verdict === 'BLOCK' || nexus?.verdict === 'ESCALATE'

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
