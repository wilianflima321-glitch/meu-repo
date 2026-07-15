import { SearchCheck } from 'lucide-react'
import { AgentEvidenceCard } from '@/components/agents/AgentEvidenceCard'
import type { AIChatEvidenceArtifact } from '@/components/agents/evidence'

interface AgentEvidencePanelProps {
  latestArtifact?: AIChatEvidenceArtifact | null
}

export function AgentEvidencePanel({ latestArtifact }: AgentEvidencePanelProps) {
  if (!latestArtifact) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 p-4 text-center text-[11px] text-[var(--aethel-text-tertiary)]">
        <SearchCheck className="h-5 w-5 text-[var(--aethel-text-quaternary)]" />
        <p>No evidence receipt yet.</p>
        <p className="max-w-[240px] text-[var(--aethel-text-quaternary)]">
          After a governed Nexus / MoA run, the TaskEvidenceLedger receipt appears here (J-ACC-04).
        </p>
      </div>
    )
  }

  if (latestArtifact.kind === 'ledger') {
    return (
      <div className="h-full overflow-y-auto p-3">
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
            <p className="mt-1 text-[10px] text-[var(--aethel-warning-light)]">
              VisualEvidence WebM [HELD] — patch hashes attached
            </p>
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
