'use client'

import { ClipboardList, Code2, DollarSign, Radio, SearchCheck } from 'lucide-react'

import type { ChatDiffFile } from '@/lib/ai/ai-apply-bridge'

import type { AIChatEvidenceArtifact } from './ai-chat-evidence'
import type { AIChatConsoleMode } from './presets'

interface AIChatLedgerStripProps {
  agentCount: number
  consoleMode: AIChatConsoleMode
  currentRunEstimate?: number
  isAIWorking: boolean
  latestEvidence: AIChatEvidenceArtifact | null
  pendingDiff: ChatDiffFile | null
  onOpenDiff: () => void
  onOpenEconomics: () => void
  onOpenEvidence: () => void
}

function formatUsd(value?: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

function summarizePendingDiff(pendingDiff: ChatDiffFile | null) {
  if (!pendingDiff) return null

  const changedLines = pendingDiff.lines.filter((line) => line.type === 'added' || line.type === 'removed').length
  const fileName = pendingDiff.path.split('/').filter(Boolean).pop() ?? pendingDiff.path

  return {
    fileName,
    changedLines,
  }
}

export function AIChatLedgerStrip({
  agentCount,
  consoleMode,
  currentRunEstimate,
  isAIWorking,
  latestEvidence,
  pendingDiff,
  onOpenDiff,
  onOpenEconomics,
  onOpenEvidence,
}: AIChatLedgerStripProps) {
  const diffSummary = summarizePendingDiff(pendingDiff)
  const evidenceSummary =
    latestEvidence?.kind === 'trace'
      ? `${latestEvidence.toolRuns.length} tools - ${latestEvidence.riskChecks.length} risks`
      : latestEvidence?.kind === 'research'
        ? `${latestEvidence.sources.length} fontes`
        : null
  const executionSummary = `${agentCount} ${agentCount === 1 ? 'agente' : 'agentes'} - modo ${consoleMode}`

  return (
    <section className="border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent)] px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[var(--aethel-text-secondary)]">
            <ClipboardList className="h-3.5 w-3.5" />
            Execution rail
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[var(--aethel-text-secondary)]">
            <Radio className={`h-3.5 w-3.5 ${isAIWorking ? 'animate-pulse text-[var(--aethel-success)]' : ''}`} />
            {isAIWorking ? 'Execucao ativa' : 'Pronto'}
          </span>
          <span className="truncate text-[11px] text-[var(--aethel-text-tertiary)]">{executionSummary}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {diffSummary ? (
            <button
              type="button"
              onClick={onOpenDiff}
              className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)]"
            >
              <Code2 className="h-3.5 w-3.5" />
              Review {diffSummary.fileName}
              <span className="text-[var(--aethel-text-tertiary)]">- {diffSummary.changedLines} linhas</span>
            </button>
          ) : null}

          {latestEvidence ? (
            <button
              type="button"
              onClick={onOpenEvidence}
              className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]"
            >
              <SearchCheck className="h-3.5 w-3.5" />
              {latestEvidence.kind === 'trace' ? 'Inspect trace' : 'Inspect research'}
              {evidenceSummary ? <span className="text-[var(--aethel-text-tertiary)]">- {evidenceSummary}</span> : null}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenEconomics}
            className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-warning)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)]"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Budget {formatUsd(currentRunEstimate)}
          </button>
        </div>
      </div>
    </section>
  )
}

export default AIChatLedgerStrip
