import type {
  AIDecisionRecord,
  AIEvidenceItem,
  AIRiskCheck,
  AIToolRunSummary,
  AITraceSummary,
  AITraceTelemetry,
} from '@/lib/ai-internal-trace'
import type { ResearchHandoffPayload, ResearchSource } from '@/lib/research-handoff'

export interface AIChatTraceArtifact {
  kind: 'trace'
  traceId: string
  summary: string
  decision?: string
  reasons: string[]
  tradeoffs: string[]
  evidence: AIEvidenceItem[]
  riskChecks: AIRiskCheck[]
  toolRuns: AIToolRunSummary[]
  telemetry?: AITraceTelemetry
}

export interface AIChatResearchArtifact {
  kind: 'research'
  query: string
  summary: string
  generatedAt: string
  sources: ResearchSource[]
  averageCredibility?: number
}

export type AIChatEvidenceArtifact = AIChatTraceArtifact | AIChatResearchArtifact

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function coerceDecisionRecord(value: unknown): AIDecisionRecord | undefined {
  if (!isRecord(value)) return undefined

  const decision = asString(value.decision)
  if (!decision) return undefined

  const reasons = Array.isArray(value.reasons) ? value.reasons.map(asString).filter(Boolean) as string[] : []
  const tradeoffs = Array.isArray(value.tradeoffs)
    ? value.tradeoffs.map(asString).filter(Boolean) as string[]
    : []

  return {
    decision,
    reasons,
    tradeoffs,
  }
}

function coerceEvidenceItems(value: unknown): AIEvidenceItem[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .map((item) => {
      const kind = asString(item.kind)
      const label = asString(item.label)
      if (!kind || !label) return null
      return {
        kind: ['context', 'file', 'search', 'tool', 'gate', 'other'].includes(kind)
          ? (kind as AIEvidenceItem['kind'])
          : 'other',
        label,
        detail: asString(item.detail),
        refs: Array.isArray(item.refs)
          ? item.refs
              .filter(isRecord)
              .map((ref) => ({
                path: asString(ref.path),
                url: asString(ref.url),
              }))
              .filter((ref) => ref.path || ref.url)
          : undefined,
      }
    })
    .filter(Boolean)
    .slice(0, 12) as AIEvidenceItem[]
}

function coerceRiskChecks(value: unknown): AIRiskCheck[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .map((item) => {
      const risk = asString(item.risk)
      const status = asString(item.status)
      if (!risk || !status) return null
      return {
        risk,
        status: ['ok', 'warn', 'fail'].includes(status) ? (status as AIRiskCheck['status']) : 'warn',
        mitigation: asString(item.mitigation),
      }
    })
    .filter(Boolean)
    .slice(0, 8) as AIRiskCheck[]
}

function coerceToolRuns(value: unknown): AIToolRunSummary[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .map((item) => {
      const toolName = asString(item.toolName)
      const status = asString(item.status)
      if (!toolName || !status) return null
      return {
        toolName,
        status: ['ok', 'error'].includes(status) ? (status as AIToolRunSummary['status']) : 'error',
        durationMs: asFiniteNumber(item.durationMs),
      }
    })
    .filter(Boolean)
    .slice(0, 8) as AIToolRunSummary[]
}

function coerceTelemetry(value: unknown): AITraceTelemetry | undefined {
  if (!isRecord(value)) return undefined

  const provider = asString(value.provider)
  const model = asString(value.model)
  const estimatedTokens = asFiniteNumber(value.estimatedTokens)
  const tokensUsed = asFiniteNumber(value.tokensUsed)
  const latencyMs = asFiniteNumber(value.latencyMs)

  if (!provider && !model && estimatedTokens === undefined && tokensUsed === undefined && latencyMs === undefined) {
    return undefined
  }

  return {
    provider,
    model,
    estimatedTokens,
    tokensUsed,
    latencyMs,
  }
}

export function buildTraceArtifact(input: unknown): AIChatTraceArtifact | null {
  if (!isRecord(input)) return null

  const traceId = asString(input.traceId)
  const summary = asString(input.summary)
  if (!traceId || !summary) return null

  const decisionRecord = coerceDecisionRecord(input.decisionRecord)

  return {
    kind: 'trace',
    traceId,
    summary,
    decision: decisionRecord?.decision,
    reasons: decisionRecord?.reasons ?? [],
    tradeoffs: decisionRecord?.tradeoffs ?? [],
    evidence: coerceEvidenceItems(input.evidence),
    riskChecks: coerceRiskChecks(input.riskChecks),
    toolRuns: coerceToolRuns(input.toolRuns),
    telemetry: coerceTelemetry(input.telemetry),
  }
}

function averageCredibility(sources: ResearchSource[]): number | undefined {
  const valid = sources
    .map((source) => source.credibility)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (valid.length === 0) return undefined
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

export function buildResearchArtifact(input: unknown): AIChatResearchArtifact | null {
  if (!isRecord(input)) return null

  const query = asString(input.query)
  const summary = asString(input.summary)
  if (!query || !summary) return null

  const generatedAt = asString(input.generatedAt) ?? new Date().toISOString()
  const sources = Array.isArray(input.sources)
    ? input.sources
        .filter(isRecord)
        .map((source) => {
          const title = asString(source.title)
          const url = asString(source.url)
          if (!title || !url) return null
          return {
            title,
            url,
            snippet: asString(source.snippet) ?? '',
            credibility: asFiniteNumber(source.credibility),
          }
        })
        .filter(Boolean)
        .slice(0, 6) as ResearchSource[]
    : []

  return {
    kind: 'research',
    query,
    summary,
    generatedAt,
    sources,
    averageCredibility: averageCredibility(sources),
  }
}

export function buildTraceArtifactFromSummary(summary: AITraceSummary | null | undefined): AIChatTraceArtifact | null {
  return buildTraceArtifact(summary ?? null)
}

export function buildResearchArtifactFromPayload(
  payload: ResearchHandoffPayload | null | undefined
): AIChatResearchArtifact | null {
  return buildResearchArtifact(payload ?? null)
}
