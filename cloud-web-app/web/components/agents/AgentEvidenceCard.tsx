import { AlertTriangle, BookOpenText, Gauge, Link2, SearchCheck, ShieldCheck, Wrench } from 'lucide-react'
import type { AIChatEvidenceArtifact } from '@/components/agents/evidence'

interface AgentEvidenceCardProps {
  artifact: AIChatEvidenceArtifact
  compact?: boolean
}

function formatGeneratedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function compactTraceId(traceId: string) {
  return traceId.length <= 16 ? traceId : `${traceId.slice(0, 8)}...${traceId.slice(-4)}`
}

function renderResearchCard(artifact: Extract<AIChatEvidenceArtifact, { kind: 'research' }>, compact: boolean) {
  const visibleSources = artifact.sources.slice(0, compact ? 3 : 6)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">
          <SearchCheck className="h-3 w-3" />
          Research evidence
        </span>
        <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{formatGeneratedAt(artifact.generatedAt)}</span>
      </div>

      <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{artifact.query}</div>
      <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{artifact.summary}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          {artifact.sources.length} sources
        </span>
        {typeof artifact.averageCredibility === 'number' && (
          <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
            average credibility {Math.round(artifact.averageCredibility * 100)}%
          </span>
        )}
      </div>

      {visibleSources.length > 0 && (
        <div className="mt-3 space-y-2">
          {visibleSources.map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-3 py-2 transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--aethel-text-primary)]">
                <Link2 className="h-3 w-3 text-[var(--aethel-info-light)]" />
                <span className="truncate">{source.title}</span>
              </div>
              {source.snippet ? (
                <p className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">{source.snippet}</p>
              ) : null}
            </a>
          ))}
        </div>
      )}
    </>
  )
}

function renderTraceCard(artifact: Extract<AIChatEvidenceArtifact, { kind: 'trace' }>, compact: boolean) {
  const visibleEvidence = artifact.evidence.slice(0, compact ? 3 : 6)
  const visibleRisks = artifact.riskChecks.slice(0, compact ? 2 : 4)
  const visibleTools = artifact.toolRuns.slice(0, compact ? 3 : 6)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-success)]">
          <ShieldCheck className="h-3 w-3" />
          Execution trace
        </span>
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">
          {compactTraceId(artifact.traceId)}
        </span>
      </div>

      <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{artifact.summary}</div>
      {artifact.decision ? (
        <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{artifact.decision}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          {artifact.evidence.length} evidence items
        </span>
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          {artifact.toolRuns.length} tools
        </span>
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5">
          {artifact.riskChecks.length} risks
        </span>
      </div>

      {artifact.telemetry ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Provider</div>
            <div className="mt-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">
              {artifact.telemetry.provider || 'Not reported'}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Model</div>
            <div className="mt-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">
              {artifact.telemetry.model || 'Not reported'}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_78%,transparent)] px-3 py-2">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
              <Gauge className="h-3 w-3" />
              Telemetry
            </div>
            <div className="mt-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">
              {typeof artifact.telemetry.tokensUsed === 'number' ? `${artifact.telemetry.tokensUsed} tok` : 'no tokens'}
              {typeof artifact.telemetry.latencyMs === 'number' ? ` - ${artifact.telemetry.latencyMs} ms` : ''}
            </div>
          </div>
        </div>
      ) : null}

      {visibleEvidence.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            <BookOpenText className="h-3.5 w-3.5" />
            Evidence
          </div>
          <div className="mt-2 space-y-2">
            {visibleEvidence.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-3 py-2"
              >
                <div className="text-[11px] font-medium text-[var(--aethel-text-primary)]">{item.label}</div>
                {item.detail ? (
                  <p className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">{item.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {(visibleRisks.length > 0 || visibleTools.length > 0) && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {visibleRisks.length > 0 ? (
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Risks
              </div>
              <div className="mt-2 space-y-2">
                {visibleRisks.map((risk, index) => (
                  <div
                    key={`${risk.risk}-${index}`}
                    className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-3 py-2"
                  >
                    <div className="text-[11px] font-medium text-[var(--aethel-text-primary)]">{risk.risk}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                      {risk.status}
                    </div>
                    {risk.mitigation ? (
                      <p className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">{risk.mitigation}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {visibleTools.length > 0 ? (
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                <Wrench className="h-3.5 w-3.5" />
                Tool runs
              </div>
              <div className="mt-2 space-y-2">
                {visibleTools.map((tool, index) => (
                  <div
                    key={`${tool.toolName}-${index}`}
                    className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-3 py-2"
                  >
                    <div className="text-[11px] font-medium text-[var(--aethel-text-primary)]">{tool.toolName}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                      {tool.status}
                      {typeof tool.durationMs === 'number' ? ` - ${tool.durationMs} ms` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}

export function AgentEvidenceCard({ artifact, compact = false }: AgentEvidenceCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] p-3">
      {artifact.kind === 'research' ? renderResearchCard(artifact, compact) : renderTraceCard(artifact, compact)}
    </section>
  )
}


export { AgentEvidenceCard as AIChatEvidenceCard }
