import { prisma } from '@/lib/db';
import type { AITraceSummary } from '@/lib/ai-internal-trace';
import type { Prisma } from '@prisma/client';

const TRACE_ACTION = 'ai_trace';

function clampText(value: string | undefined, maxLen: number): string | undefined {
  if (!value) return value;
  const s = String(value);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '…';
}

function sanitizeTraceSummary(input: AITraceSummary): AITraceSummary {
  return {
    traceId: input.traceId,
    summary: clampText(input.summary, 300) || '',
    decisionRecord: input.decisionRecord
      ? {
          decision: clampText(input.decisionRecord.decision, 300) || '',
          reasons: (input.decisionRecord.reasons || []).slice(0, 10).map((r) => clampText(r, 240) || '').filter(Boolean),
          tradeoffs: (input.decisionRecord.tradeoffs || []).slice(0, 10).map((t) => clampText(t, 240) || '').filter(Boolean),
        }
      : undefined,
    evidence: (input.evidence || [])
      .slice(0, 25)
      .map((e) => ({
        kind: e.kind,
        label: clampText(e.label, 180) || '',
        detail: clampText(e.detail, 300),
        // Não persistir refs por padrão (pode vazar paths/URLs sensíveis). Evoluir com allowlist.
      })),
    riskChecks: (input.riskChecks || [])
      .slice(0, 15)
      .map((r) => ({
        risk: clampText(r.risk, 220) || '',
        status: r.status,
        mitigation: clampText(r.mitigation, 260),
      })),
    toolRuns: (input.toolRuns || [])
      .slice(0, 25)
      .map((t) => ({
        toolName: clampText(t.toolName, 120) || '',
        status: t.status,
        durationMs: t.durationMs,
      })),
    telemetry: input.telemetry
      ? {
          model: clampText(input.telemetry.model, 120),
          provider: clampText(input.telemetry.provider, 120),
          estimatedTokens: input.telemetry.estimatedTokens,
          tokensUsed: input.telemetry.tokensUsed,
          latencyMs: input.telemetry.latencyMs,
        }
      : undefined,
  };
}

export async function persistAITrace(params: {
  userId: string;
  trace: AITraceSummary;
  kind: 'query' | 'chat' | 'agent' | 'stream';
  projectId?: string;
  workflowId?: string;
  stepId?: string;
}): Promise<void> {
  const sanitized = sanitizeTraceSummary(params.trace);

  const metadata = {
    kind: params.kind,
    projectId: params.projectId,
    workflowId: params.workflowId,
    stepId: params.stepId,
    trace: sanitized,
  } as unknown as Prisma.InputJsonValue;

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: TRACE_ACTION,
      resource: sanitized.traceId,
      metadata,
    },
  });
}

export async function getAITraceForUser(params: {
  userId: string;
  traceId: string;
}): Promise<AITraceSummary | null> {
  const row = await prisma.auditLog.findFirst({
    where: {
      userId: params.userId,
      action: TRACE_ACTION,
      resource: params.traceId,
    },
    orderBy: { createdAt: 'desc' },
  });

  const trace = (row?.metadata as any)?.trace;
  if (!trace || typeof trace !== 'object') return null;
  return trace as AITraceSummary;
}
