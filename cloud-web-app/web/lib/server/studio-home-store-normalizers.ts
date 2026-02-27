import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import {
  buildDomainChecklist,
  inferMissionDomain,
  normalizeChecklist,
  normalizeMissionDomain,
} from './studio-home-runtime-helpers'
import type {
  FullAccessGrant,
  StudioQualityMode,
  StudioAgentRun,
  StudioAgentRunStatus,
  StudioCostSummary,
  StudioMissionDomain,
  StudioSessionStatus,
  StudioSession,
  StudioSessionMessage,
  StudioTask,
  StudioTaskOwnerRole,
  StudioTaskStatus,
  StudioValidationVerdict,
  FullAccessScope,
} from './studio-home-store'

const CONTEXT_KEY = 'studioHome'
const MAX_STORED_TASKS = 60
const MAX_STORED_AGENT_RUNS = 300
const MAX_STORED_MESSAGES = 500

export type WorkflowRecord = {
  id: string
  userId: string
  projectId: string | null
  context: unknown
  createdAt: Date
  updatedAt: Date
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function toStringSafe(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

export function toNumberSafe(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return n
}

export function clampBudget(value: number): number {
  return Math.min(100_000, Math.max(5, Math.round(value)))
}

export function isStudioContextContainer(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input)
}

export function normalizeTask(input: unknown): StudioTask | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<StudioTask>
  if (!raw.id || !raw.title || !raw.ownerRole || !raw.status) return null
  if (!['planner', 'coder', 'reviewer'].includes(raw.ownerRole)) return null
  if (!['queued', 'planning', 'building', 'validating', 'blocked', 'done', 'error'].includes(raw.status)) return null

  const validationVerdict = ['pending', 'passed', 'failed'].includes(String(raw.validationVerdict))
    ? (raw.validationVerdict as StudioValidationVerdict)
    : 'pending'
  const validationReportInput = (raw as { validationReport?: unknown }).validationReport
  const validationReport =
    validationReportInput &&
    typeof validationReportInput === 'object' &&
    Array.isArray((validationReportInput as { failedIds?: unknown }).failedIds) &&
    Array.isArray((validationReportInput as { failedMessages?: unknown }).failedMessages)
      ? {
          totalChecks: Math.max(
            0,
            Math.round(
              toNumberSafe((validationReportInput as { totalChecks?: unknown }).totalChecks, 0)
            )
          ),
          failedIds: (validationReportInput as { failedIds: unknown[] }).failedIds
            .filter((item) => typeof item === 'string')
            .map((item) => String(item)),
          failedMessages: (validationReportInput as { failedMessages: unknown[] }).failedMessages
            .filter((item) => typeof item === 'string')
            .map((item) => String(item)),
        }
      : undefined

  return {
    id: String(raw.id),
    title: String(raw.title),
    ownerRole: raw.ownerRole as StudioTaskOwnerRole,
    status: raw.status as StudioTaskStatus,
    estimateCredits: Math.max(0, Math.round(toNumberSafe(raw.estimateCredits, 0))),
    estimateSeconds: Math.max(5, Math.round(toNumberSafe(raw.estimateSeconds, 30))),
    result: typeof raw.result === 'string' ? raw.result : undefined,
    validationVerdict,
    validationReport,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : undefined,
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    applyToken: typeof raw.applyToken === 'string' ? raw.applyToken : undefined,
  }
}

export function normalizeAgentRun(input: unknown): StudioAgentRun | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<StudioAgentRun>
  if (!raw.id || !raw.taskId || !raw.role || !raw.model || !raw.status || !raw.startedAt || !raw.message) return null
  if (!['planner', 'coder', 'reviewer'].includes(raw.role)) return null
  if (!['running', 'success', 'error'].includes(raw.status)) return null

  return {
    id: String(raw.id),
    taskId: String(raw.taskId),
    role: raw.role as StudioTaskOwnerRole,
    model: String(raw.model),
    status: raw.status as StudioAgentRunStatus,
    tokensIn: Math.max(0, Math.round(toNumberSafe(raw.tokensIn, 0))),
    tokensOut: Math.max(0, Math.round(toNumberSafe(raw.tokensOut, 0))),
    latencyMs: Math.max(1, Math.round(toNumberSafe(raw.latencyMs, 1))),
    cost: Math.max(0, toNumberSafe(raw.cost, 0)),
    startedAt: String(raw.startedAt),
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    message: String(raw.message),
  }
}

export function normalizeMessage(input: unknown): StudioSessionMessage | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<StudioSessionMessage>
  if (!raw.id || !raw.role || !raw.content || !raw.timestamp) return null
  if (!['user', 'assistant', 'system'].includes(raw.role)) return null

  const message: StudioSessionMessage = {
    id: String(raw.id),
    role: raw.role as 'user' | 'assistant' | 'system',
    content: String(raw.content),
    timestamp: String(raw.timestamp),
  }
  if (raw.agentRole && ['planner', 'coder', 'reviewer'].includes(raw.agentRole)) {
    message.agentRole = raw.agentRole as StudioTaskOwnerRole
  }
  if (raw.status && ['queued', 'planning', 'building', 'validating', 'blocked', 'done', 'error'].includes(raw.status)) {
    message.status = raw.status as StudioTaskStatus
  }
  return message
}

export function normalizeFullAccessGrant(input: unknown): FullAccessGrant | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<FullAccessGrant>
  if (!raw.id || !raw.scope || !raw.createdAt || !raw.expiresAt || !raw.auditRef) return null
  if (!['project', 'workspace', 'web_tools'].includes(raw.scope)) return null
  return {
    id: String(raw.id),
    scope: raw.scope as FullAccessScope,
    createdAt: String(raw.createdAt),
    expiresAt: String(raw.expiresAt),
    revokedAt: typeof raw.revokedAt === 'string' ? raw.revokedAt : undefined,
    auditRef: String(raw.auditRef),
  }
}

export function computeCost(session: Omit<StudioSession, 'cost'> & { cost?: Partial<StudioCostSummary> }): StudioCostSummary {
  const estimatedCredits = session.tasks.reduce((sum, item) => sum + item.estimateCredits, 0)
  const usedByRuns = session.agentRuns.reduce((sum, item) => sum + item.cost, 0)
  const existingUsed = toNumberSafe(session.cost?.usedCredits, 0)
  const usedCredits = Math.max(existingUsed, Math.round((usedByRuns + Number.EPSILON) * 1000) / 1000)
  const budgetCap = clampBudget(toNumberSafe(session.cost?.budgetCap, estimatedCredits || 30))
  const remainingCredits = Math.max(0, Math.round((budgetCap - usedCredits) * 1000) / 1000)

  return {
    estimatedCredits,
    usedCredits,
    budgetCap,
    remainingCredits,
  }
}

export function normalizeSession(raw: unknown, fallback: { id: string; userId: string; projectId: string; createdAt: string }): StudioSession {
  if (!raw || typeof raw !== 'object') {
    const mission = 'No mission defined.'
    const missionDomain = inferMissionDomain(mission)
    const base: StudioSession = {
      id: fallback.id,
      userId: fallback.userId,
      projectId: fallback.projectId,
      mission,
      missionDomain,
      qualityMode: 'studio',
      qualityChecklist: buildDomainChecklist(missionDomain),
      status: 'active',
      tasks: [],
      agentRuns: [],
      messages: [],
      cost: { estimatedCredits: 0, usedCredits: 0, budgetCap: 30, remainingCredits: 30 },
      fullAccessGrants: [],
      orchestration: {
        mode: 'serial',
        conversationPolicy: 'peer_review',
        applyPolicy: 'serial_after_validation',
      },
      createdAt: fallback.createdAt,
      lastActivityAt: fallback.createdAt,
    }
    base.cost = computeCost(base)
    return base
  }

  const input = raw as Partial<StudioSession>
  const tasks = Array.isArray(input.tasks) ? input.tasks.map(normalizeTask).filter((item): item is StudioTask => item !== null) : []
  const agentRuns = Array.isArray(input.agentRuns)
    ? input.agentRuns.map(normalizeAgentRun).filter((item): item is StudioAgentRun => item !== null)
    : []
  const messages = Array.isArray(input.messages)
    ? input.messages.map(normalizeMessage).filter((item): item is StudioSessionMessage => item !== null)
    : []
  const fullAccessGrants = Array.isArray(input.fullAccessGrants)
    ? input.fullAccessGrants.map(normalizeFullAccessGrant).filter((item): item is FullAccessGrant => item !== null)
    : []

  const mission = toStringSafe(input.mission, 'No mission defined.')
  const missionDomain = normalizeMissionDomain((input as { missionDomain?: unknown }).missionDomain, mission)
  const qualityChecklist = normalizeChecklist((input as { qualityChecklist?: unknown }).qualityChecklist, missionDomain)
  const orchestrationInput = (input as { orchestration?: unknown }).orchestration
  const base: StudioSession = {
    id: toStringSafe(input.id, fallback.id),
    userId: toStringSafe(input.userId, fallback.userId),
    projectId: toStringSafe(input.projectId, fallback.projectId),
    mission,
    missionDomain,
    qualityMode: ['standard', 'delivery', 'studio'].includes(String(input.qualityMode))
      ? (input.qualityMode as StudioQualityMode)
      : 'studio',
    qualityChecklist,
    status: ['active', 'stopped', 'completed'].includes(String(input.status))
      ? (input.status as StudioSessionStatus)
      : 'active',
    tasks: tasks.slice(-MAX_STORED_TASKS),
    agentRuns: agentRuns.slice(-MAX_STORED_AGENT_RUNS),
    messages: messages.slice(-MAX_STORED_MESSAGES),
    cost: {
      estimatedCredits: Math.max(0, toNumberSafe(input.cost?.estimatedCredits, 0)),
      usedCredits: Math.max(0, toNumberSafe(input.cost?.usedCredits, 0)),
      budgetCap: clampBudget(toNumberSafe(input.cost?.budgetCap, 30)),
      remainingCredits: Math.max(0, toNumberSafe(input.cost?.remainingCredits, 30)),
    },
    fullAccessGrants,
    orchestration: {
      mode:
        orchestrationInput &&
        typeof orchestrationInput === 'object' &&
        ((orchestrationInput as { mode?: unknown }).mode === 'parallel_wave' ||
          (orchestrationInput as { mode?: unknown }).mode === 'role_sequenced_wave')
          ? 'role_sequenced_wave'
          : 'serial',
      conversationPolicy: 'peer_review',
      applyPolicy: 'serial_after_validation',
      ...(orchestrationInput &&
      typeof orchestrationInput === 'object' &&
      typeof (orchestrationInput as { lastWaveAt?: unknown }).lastWaveAt === 'string'
        ? { lastWaveAt: (orchestrationInput as { lastWaveAt?: string }).lastWaveAt }
        : {}),
    },
    createdAt: toStringSafe(input.createdAt, fallback.createdAt),
    lastActivityAt: toStringSafe(input.lastActivityAt, fallback.createdAt),
    endedAt: typeof input.endedAt === 'string' ? input.endedAt : undefined,
  }
  base.cost = computeCost(base)
  return base
}

export function mergeStudioIntoContext(context: unknown, session: StudioSession): Prisma.InputJsonValue {
  const root = isStudioContextContainer(context) ? { ...context } : {}
  root[CONTEXT_KEY] = session
  return root as unknown as Prisma.InputJsonValue
}

export function extractStudioFromContext(context: unknown): unknown {
  if (!isStudioContextContainer(context)) return null
  return context[CONTEXT_KEY] ?? null
}

export async function findOwnedWorkflow(userId: string, sessionId: string): Promise<WorkflowRecord | null> {
  const workflow = await prisma.copilotWorkflow.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, userId: true, projectId: true, context: true, createdAt: true, updatedAt: true },
  })
  return workflow as WorkflowRecord | null
}

export async function persistSession(workflow: WorkflowRecord, session: StudioSession): Promise<StudioSession> {
  const context = mergeStudioIntoContext(workflow.context, session)
  const updated = await prisma.copilotWorkflow.update({
    where: { id: workflow.id },
    data: {
      context,
      contextVersion: { increment: 1 },
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true, userId: true, projectId: true, context: true, createdAt: true, updatedAt: true },
  })
  return normalizeSession(extractStudioFromContext(updated.context), {
    id: updated.id,
    userId: updated.userId,
    projectId: updated.projectId || 'default',
    createdAt: updated.createdAt.toISOString(),
  })
}

export function appendMessage(
  session: StudioSession,
  input: Omit<StudioSessionMessage, 'id' | 'timestamp'>
): StudioSession {
  const nextMessages = [
    ...session.messages,
    {
      id: randomUUID(),
      timestamp: nowIso(),
      role: input.role,
      content: input.content,
      ...(input.agentRole ? { agentRole: input.agentRole } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  ].slice(-MAX_STORED_MESSAGES)

  const next: StudioSession = {
    ...session,
    messages: nextMessages,
    lastActivityAt: nowIso(),
  }
  next.cost = computeCost(next)
  return next
}
