import { SearchCheck } from 'lucide-react'
import { AIChatEvidenceCard } from '@/components/ai-chat/AIChatEvidenceCard'
import type { AIChatEvidenceArtifact } from '@/components/agents/evidence'

interface AIChatEvidencePanelProps {
  latestArtifact?: AIChatEvidenceArtifact | null
}

export function AIChatEvidencePanel({ latestArtifact }: AIChatEvidencePanelProps) {
  if (!latestArtifact) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 p-4 text-center text-[11px] text-[var(--aethel-text-tertiary)]">
        <SearchCheck className="h-5 w-5 text-[var(--aethel-text-quaternary)]" />
        <p>No evidence capsule available.</p>
        <p className="max-w-[240px] text-[var(--aethel-text-quaternary)]">
          When AI responds with a trace or research handoff, receipts appear here.
        </p>
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

      <AIChatEvidenceCard artifact={latestArtifact} />
    </div>
  )
}
