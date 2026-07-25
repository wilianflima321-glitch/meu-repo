import { AgentEvidenceCard } from '@/components/agents/AgentEvidenceCard'
import type { AIChatEvidenceArtifact } from '@/components/agents/evidence'
import { evaluateEvidenceReceiptCompleteness } from '@/lib/production/agents-receipt-completeness'
import { extractPatchHashRefsFromLedgerEvents } from '@/lib/production/agents-merge-governance'
import { ReceiptCompletenessStrip } from '@/components/agents/chat/ledger/ReceiptCompletenessStrip'
import { WorkbenchEmptyState } from '@/components/ui/WorkbenchSurfaceStates'

interface AgentEvidencePanelProps {
  latestArtifact?: AIChatEvidenceArtifact | null
}

export function AgentEvidencePanel({ latestArtifact }: AgentEvidencePanelProps) {
  const completeness = evaluateEvidenceReceiptCompleteness(latestArtifact)

  if (!latestArtifact) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center p-2">
        <WorkbenchEmptyState
          icon="search"
          title="No evidence receipt yet"
          description="After a governed Nexus / MoA run, the TaskEvidenceLedger receipt appears here (J-ACC-04)."
        />
        <div className="mt-2 w-full max-w-sm px-4">
          <ReceiptCompletenessStrip report={completeness} className="mx-0" />
        </div>
      </div>
    )
  }

  if (latestArtifact.kind === 'ledger') {
    return (
      <div className="h-full overflow-y-auto p-3">
        <ReceiptCompletenessStrip report={completeness} className="mx-0 mb-3" />
        <div className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Task evidence ledger
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
            {latestArtifact.mission}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
            {latestArtifact.taskId} · {latestArtifact.eventCount} events
          </p>
          {latestArtifact.fusionTransactionId && (
            <p className="mt-1 text-[10px] text-[var(--aethel-info-light)]">
              Fusion tx {latestArtifact.fusionTransactionId.slice(0, 12)}… — Ctrl+Z undoes atomically
            </p>
          )}
          {latestArtifact.visualEvidenceHeld && (
            <div
              className="mt-1 rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-2 py-1.5"
              data-aethel-cw6="patch-hash-evidence"
            >
              <p className="text-[10px] text-[var(--aethel-warning-light)]">
                VisualEvidence WebM [HELD] — patch-hash fallback only
              </p>
              {(() => {
                const hashes = extractPatchHashRefsFromLedgerEvents(latestArtifact.events)
                if (hashes.length === 0) {
                  return (
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
                      No sha256 refs on ledger events yet
                    </p>
                  )
                }
                return (
                  <ul className="mt-1 space-y-0.5">
                    {hashes.slice(0, 6).map((hash) => (
                      <li
                        key={hash}
                        className="break-all font-mono text-[10px] text-[var(--aethel-text-secondary)]"
                      >
                        {hash}
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </div>
          )}
        </div>

        <ul className="space-y-2">
          {latestArtifact.events.map((event, index) => (
            <li
              key={`${event.kind}-${index}-${event.title}`}
              className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
                {event.kind}
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-[var(--aethel-text-primary)]">
                {event.title}
              </div>
              <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
                {event.summary}
              </p>
              {event.refs.length > 0 && (
                <p className="mt-1 break-all font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
                  {event.refs.join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <ReceiptCompletenessStrip report={completeness} className="mx-0 mb-3" />
      <div className="mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
          Receipts workflow
        </div>
        <p className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
          Provenance and confidence signals for the latest response.
        </p>
      </div>

      <AgentEvidenceCard artifact={latestArtifact} />
    </div>
  )
}
